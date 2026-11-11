export function usesLegacyTeam(env: {
  ACCESS_MODE?: string;
  TEAM_PASSWORD?: string;
}) {
  return env.ACCESS_MODE === "sites" || Boolean(env.TEAM_PASSWORD);
}

export async function checkAccess(
  request: Request,
  env: { TEAM_PASSWORD?: string; ACCESS_MODE?: string },
): Promise<Response | null> {
  if (env.ACCESS_MODE === "sites") {
    return request.headers.get("oai-authenticated-user-id")
      ? null
      : new Response("Sign in through the site's access page.", {
          status: 401,
        });
  }
  if (!env.TEAM_PASSWORD)
    return new Response(
      "Set the TEAM_PASSWORD secret before sharing this deployment.",
      { status: 503 },
    );
  let supplied = "";
  try {
    const authorization = request.headers.get("Authorization");
    if (authorization?.startsWith("Basic ")) {
      const credentials = new TextDecoder("utf-8", { fatal: true }).decode(
        Uint8Array.from(atob(authorization.slice(6)), (character) =>
          character.charCodeAt(0),
        ),
      );
      if (credentials.startsWith("team:")) supplied = credentials.slice(5);
    }
  } catch {
    /* Missing and malformed credentials receive the same challenge. */
  }
  const encoder = new TextEncoder();
  const [expected, actual] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(env.TEAM_PASSWORD)),
    crypto.subtle.digest("SHA-256", encoder.encode(supplied)),
  ]);
  const left = new Uint8Array(expected);
  const right = new Uint8Array(actual);
  let difference = 0;
  for (let index = 0; index < left.length; index++)
    difference |= left[index] ^ right[index];
  if (supplied && difference === 0) return null;
  return new Response("Enter your team's shared password. Username: team.", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Team Wheel", charset="UTF-8"',
      "Cache-Control": "no-store",
    },
  });
}
