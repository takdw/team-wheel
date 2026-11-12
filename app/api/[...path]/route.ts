import { env } from "cloudflare:workers";
import { z } from "zod";
import {
  AppError,
  addPerson,
  getHistory,
  getSnapshot,
  spin,
  undoPick,
  updatePerson,
  getPersonPhoto,
  deletePerson,
  restorePerson,
  volunteer,
} from "@/lib/store";
import { decodePhoto, personUpdateSchema } from "@/lib/profile";
import { spinModes } from "@/lib/wheel";
import { usesLegacyTeam } from "@/lib/access";
import { legacyTeamId, parseTeamPublicId, teamCodeAlphabet } from "@/lib/team";
import {
  createTeam,
  getTeamAccess,
  joinTeam,
  limitTeamAccess,
  rotateTeamCode,
  teamSessionCookie,
} from "@/lib/team-store";

export const dynamic = "force-dynamic";
const name = z
  .string()
  .trim()
  .min(1, "Enter a name.")
  .max(60, "Keep names to 60 characters.");
const uuid = z.string().uuid();
const teamCode = z
  .string()
  .max(24)
  .transform((value) => value.toUpperCase().replace(/[\s-]/g, ""))
  .pipe(
    z
      .string()
      .regex(
        new RegExp(`^[${teamCodeAlphabet}]{8}$`),
        "Enter the eight-character team code.",
      ),
  );
async function readBody(request: Request): Promise<unknown> {
  const origin = request.headers.get("Origin");
  if (
    (origin && origin !== new URL(request.url).origin) ||
    request.headers.get("Sec-Fetch-Site") === "cross-site"
  ) {
    throw new AppError("Open the team app to make changes.", 403);
  }
  if (!request.headers.get("Content-Type")?.includes("application/json"))
    throw new AppError("Send changes as JSON.", 415);
  if (Number(request.headers.get("Content-Length")) > 70_000)
    throw new AppError("That request is too large.", 413);
  const text = await request.text();
  if (text.length > 70_000)
    throw new AppError("That request is too large.", 413);
  try {
    return JSON.parse(text);
  } catch {
    throw new AppError("That request could not be read.");
  }
}
async function handle(request: Request): Promise<Response> {
  try {
    const db = env.DB;
    if (!db)
      throw new AppError(
        "The team database is not connected. Check the deployment setup.",
        503,
      );
    const url = new URL(request.url);
    const pathname = url.pathname.replace(/\/$/, "");
    const method = request.method;
    const headers = { "Cache-Control": "no-store" };
    const legacy = usesLegacyTeam(env);
    const cookies = request.headers.get("Cookie");
    if (
      !legacy &&
      method === "POST" &&
      (pathname === "/api/teams" || pathname === "/api/teams/join")
    ) {
      const body = await readBody(request);
      const action = pathname === "/api/teams" ? "create" : "join";
      await limitTeamAccess(
        db,
        action,
        request.headers.get("CF-Connecting-IP") ?? "local",
      );
      const { teamId, publicId, token } =
        action === "create"
          ? await createTeam(db, z.object({ name }).parse(body).name)
          : await joinTeam(
              db,
              z.object({ code: teamCode }).parse(body).code,
              cookies,
            );
      const sessionHeaders = new Headers(headers);
      if (token)
        sessionHeaders.set(
          "Set-Cookie",
          teamSessionCookie(teamId, token, url.protocol === "https:"),
        );
      return Response.json({ publicId }, { headers: sessionHeaders });
    }

    const scoped = /^\/api\/teams\/([^/]+)(\/.*)$/.exec(pathname);
    const publicId = !legacy && scoped ? parseTeamPublicId(scoped[1]) : null;
    if (legacy ? scoped !== null : publicId === null)
      throw new AppError("That action could not be found.", 404);
    const access = publicId ? await getTeamAccess(db, publicId, cookies) : null;
    if (!legacy && !access)
      throw new AppError("Join this team to open its wheel.", 401);
    const teamId = access?.teamId ?? legacyTeamId;
    const path = scoped ? scoped[2] : pathname.slice("/api".length);

    if (path === "/invite" && (method === "GET" || method === "POST")) {
      if (!access?.joinCode)
        throw new AppError(
          "Only the team owner can manage the join code.",
          403,
        );
      if (method === "GET")
        return Response.json({ code: access.joinCode }, { headers });
      await readBody(request);
      return Response.json(
        { code: await rotateTeamCode(db, teamId) },
        { headers },
      );
    }
    if (method === "GET" && /^\/people\/[^/]+\/photo$/.test(path)) {
      const id = uuid.parse(path.split("/")[2]);
      const version = uuid.parse(url.searchParams.get("v"));
      const photo = decodePhoto(await getPersonPhoto(db, id, version, teamId));
      if (!photo) throw new AppError("Photo could not be read.", 404);
      return new Response(photo.bytes.buffer, {
        headers: {
          "Content-Type": photo.contentType,
          "Cache-Control": legacy
            ? "private, max-age=31536000, immutable"
            : "private, no-cache",
          "X-Content-Type-Options": "nosniff",
        },
      });
    }
    if (method === "GET" && path === "/state")
      return Response.json(await getSnapshot(db, teamId), { headers });
    if (method === "GET" && path === "/history") {
      const before = z.coerce
        .number()
        .int()
        .positive()
        .safeParse(url.searchParams.get("before"));
      if (!before.success) throw new AppError("Choose a valid history page.");
      return Response.json(await getHistory(db, before.data, teamId), {
        headers,
      });
    }
    const body = await readBody(request);
    if (method === "POST" && path === "/people") {
      await addPerson(db, z.object({ name }).parse(body).name, teamId);
    } else if (method === "PATCH" && /^\/people\/[^/]+$/.test(path)) {
      const id = uuid.parse(path.split("/").at(-1));
      const values = personUpdateSchema.parse(body);
      await updatePerson(db, id, values, teamId);
    } else if (method === "DELETE" && /^\/people\/[^/]+$/.test(path)) {
      await deletePerson(db, uuid.parse(path.split("/").at(-1)), teamId);
    } else if (method === "POST" && /^\/people\/[^/]+\/restore$/.test(path)) {
      await restorePerson(db, uuid.parse(path.split("/")[2]), teamId);
    } else if (method === "POST" && path === "/spins") {
      const values = z
        .object({
          id: uuid,
          mode: z.enum(spinModes),
          excludedIds: z.array(uuid).max(100).optional(),
        })
        .parse(body);
      return Response.json(
        await spin(db, values.id, values.mode, values.excludedIds, teamId),
        { headers },
      );
    } else if (method === "POST" && path === "/volunteers") {
      const values = z.object({ id: uuid, personId: uuid }).parse(body);
      return Response.json(
        await volunteer(db, values.id, values.personId, teamId),
        { headers },
      );
    } else if (method === "POST" && path === "/undo") {
      await undoPick(db, z.object({ id: uuid }).parse(body).id, teamId);
    } else throw new AppError("That action could not be found.", 404);
    return Response.json(await getSnapshot(db, teamId), { headers });
  } catch (error) {
    if (error instanceof z.ZodError)
      return Response.json(
        { error: error.issues[0]?.message ?? "Check the submitted values." },
        { status: 400 },
      );
    if (error instanceof AppError)
      return Response.json({ error: error.message }, { status: error.status });
    console.error("Team Wheel request failed", error);
    return Response.json(
      {
        error:
          "The request could not finish. Refresh to check whether it was saved, then try again.",
      },
      { status: 500 },
    );
  }
}
export const GET = handle;
export const POST = handle;
export const PATCH = handle;
export const DELETE = handle;
