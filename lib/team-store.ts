import { AppError } from "./store";
import { parseTeamId, teamCodeAlphabet, type TeamAccess } from "./team";

const sessionAge = 90 * 24 * 60 * 60;
const accessWindow = 5 * 60 * 1000;

function newCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return Array.from(
    bytes,
    (byte) => teamCodeAlphabet[byte % teamCodeAlphabet.length],
  ).join("");
}

async function hash(value: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

function cookieName(teamId: number): string {
  return `tw_team_${teamId}`;
}

function sessionTokens(cookies: string | null) {
  const tokens = new Map<number, string>();
  for (const cookie of cookies?.split(";") ?? []) {
    const match = /^tw_team_(\d+)=([a-f0-9-]{36})$/.exec(cookie.trim());
    if (!match) continue;
    const teamId = parseTeamId(match[1]);
    if (teamId !== null && !tokens.has(teamId)) tokens.set(teamId, match[2]);
  }
  return tokens;
}

export function teamSessionCookie(
  teamId: number,
  token: string,
  secure: boolean,
): string {
  return `${cookieName(teamId)}=${token}; Path=/; Max-Age=${sessionAge}; HttpOnly; SameSite=Lax${secure ? "; Secure" : ""}`;
}

export async function getTeamAccess(
  db: D1Database,
  teamId: number,
  cookies: string | null,
): Promise<TeamAccess | null> {
  const token = sessionTokens(cookies).get(teamId);
  if (!token) return null;
  return db
    .prepare(
      `SELECT teams.id, teams.name,
    CASE WHEN team_sessions.owner = 1 THEN teams.join_code ELSE NULL END AS joinCode
    FROM team_sessions JOIN teams ON teams.id = team_sessions.team_id
    WHERE team_sessions.token_hash = ? AND team_sessions.team_id = ? AND team_sessions.expires_at > ?`,
    )
    .bind(await hash(token), teamId, Date.now())
    .first<TeamAccess>();
}

export async function getJoinedTeams(db: D1Database, cookies: string | null) {
  const tokens = [...sessionTokens(cookies)].slice(0, 40);
  if (!tokens.length) return [];
  const keys = await Promise.all(
    tokens.map(async ([id, token]) => [id, await hash(token)]),
  );
  const placeholders = keys.map(() => "(?, ?)").join(", ");
  const result = await db
    .prepare(
      `WITH browser_sessions(team_id, token_hash) AS (VALUES ${placeholders})
    SELECT teams.id, teams.name FROM browser_sessions
    JOIN team_sessions ON team_sessions.token_hash = browser_sessions.token_hash
      AND team_sessions.team_id = browser_sessions.team_id
    JOIN teams ON teams.id = team_sessions.team_id
    WHERE team_sessions.expires_at > ?
    ORDER BY teams.name COLLATE NOCASE, teams.id`,
    )
    .bind(...keys.flat(), Date.now())
    .all<Pick<TeamAccess, "id" | "name">>();
  return result.results;
}

export async function limitTeamAccess(
  db: D1Database,
  action: "join" | "create",
  ip: string,
): Promise<void> {
  const now = Date.now();
  const limit = action === "join" ? 60 : 10;
  const key = await hash(`${action}:${ip}`);
  const [, result] = await db.batch([
    db
      .prepare("DELETE FROM team_access_limits WHERE expires_at <= ?")
      .bind(now),
    db
      .prepare(
        `INSERT INTO team_access_limits (key, attempts, expires_at) VALUES (?, 1, ?)
      ON CONFLICT(key) DO UPDATE SET attempts = attempts + 1 WHERE attempts < ? RETURNING attempts`,
      )
      .bind(key, now + accessWindow, limit),
  ]);
  if (!result.results.length)
    throw new AppError("Too many attempts. Try again in a few minutes.", 429);
}

export async function createTeam(
  db: D1Database,
  name: string,
): Promise<{ teamId: number; token: string }> {
  const token = crypto.randomUUID();
  const tokenHash = await hash(token);
  const now = Date.now();
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = newCode();
    try {
      const [team] = await db.batch<{ id: number }>([
        db
          .prepare(
            "INSERT INTO teams (name, join_code) VALUES (?, ?) RETURNING id",
          )
          .bind(name, code),
        db
          .prepare(
            `INSERT INTO team_sessions (token_hash, team_id, owner, expires_at)
          SELECT ?, id, 1, ? FROM teams WHERE join_code = ?`,
          )
          .bind(tokenHash, now + sessionAge * 1000, code),
        db.prepare("DELETE FROM team_sessions WHERE expires_at <= ?").bind(now),
      ]);
      return { teamId: team.results[0].id, token };
    } catch (error) {
      if (
        !(error instanceof Error) ||
        !error.message.includes("UNIQUE constraint failed: teams.join_code")
      )
        throw error;
    }
  }
  throw new AppError(
    "Couldn’t make a join code. Try creating the team again.",
    503,
  );
}

export async function joinTeam(
  db: D1Database,
  code: string,
  cookies: string | null,
): Promise<{ teamId: number; token?: string }> {
  const team = await db
    .prepare("SELECT id FROM teams WHERE join_code = ?")
    .bind(code)
    .first<{ id: number }>();
  if (!team)
    throw new AppError(
      "That team code isn’t valid. Check it and try again.",
      404,
    );
  if (await getTeamAccess(db, team.id, cookies)) return { teamId: team.id };

  const now = Date.now();
  const token = crypto.randomUUID();
  const [session] = await db.batch([
    db
      .prepare(
        `INSERT INTO team_sessions (token_hash, team_id, expires_at)
      SELECT ?, id, ? FROM teams WHERE id = ? AND join_code = ? RETURNING team_id`,
      )
      .bind(await hash(token), now + sessionAge * 1000, team.id, code),
    db.prepare("DELETE FROM team_sessions WHERE expires_at <= ?").bind(now),
  ]);
  if (!session.results.length)
    throw new AppError(
      "That team code isn’t valid. Check it and try again.",
      404,
    );
  return { teamId: team.id, token };
}

export async function rotateTeamCode(
  db: D1Database,
  teamId: number,
): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = newCode();
    const team = await db
      .prepare(
        `UPDATE teams SET join_code = ? WHERE id = ?
      AND NOT EXISTS (SELECT 1 FROM teams WHERE join_code = ?) RETURNING id`,
      )
      .bind(code, teamId, code)
      .first<{ id: number }>();
    if (team) return code;
  }
  throw new AppError("Couldn’t change the join code. Try again.", 503);
}
