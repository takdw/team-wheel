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
} from "@/lib/store";

export const dynamic = "force-dynamic";
const name = z
  .string()
  .trim()
  .min(1, "Enter a name.")
  .max(60, "Keep names to 60 characters.");
const uuid = z.string().uuid();
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
  const text = await request.text();
  if (text.length > 4096) throw new AppError("That request is too large.", 413);
  try {
    return JSON.parse(text);
  } catch {
    throw new AppError("That request could not be read.");
  }
}
async function handle(request: Request): Promise<Response> {
  try {
    if (!env.DB)
      throw new AppError(
        "The team database is not connected. Check the deployment setup.",
        503,
      );
    const path = new URL(request.url).pathname.replace(/\/$/, "");
    const method = request.method;
    const headers = { "Cache-Control": "no-store" };
    if (method === "GET" && path === "/api/state")
      return Response.json(await getSnapshot(env.DB), { headers });
    if (method === "GET" && path === "/api/history") {
      const before = z.coerce
        .number()
        .int()
        .positive()
        .safeParse(new URL(request.url).searchParams.get("before"));
      if (!before.success) throw new AppError("Choose a valid history page.");
      return Response.json(await getHistory(env.DB, before.data), { headers });
    }
    const body = await readBody(request);
    if (method === "POST" && path === "/api/people") {
      await addPerson(env.DB, z.object({ name }).parse(body).name);
    } else if (method === "PATCH" && /^\/api\/people\/[^/]+$/.test(path)) {
      const id = uuid.parse(path.split("/").at(-1));
      const values = z
        .object({ name: name.optional(), active: z.boolean().optional() })
        .refine(
          (value) => value.name !== undefined || value.active !== undefined,
        )
        .parse(body);
      await updatePerson(env.DB, id, values);
    } else if (method === "POST" && path === "/api/spins") {
      const values = z
        .object({ id: uuid, mode: z.enum(["random", "balanced"]) })
        .parse(body);
      return Response.json(await spin(env.DB, values.id, values.mode), {
        headers,
      });
    } else if (method === "POST" && path === "/api/undo") {
      await undoPick(env.DB, z.object({ id: uuid }).parse(body).id);
    } else throw new AppError("That action could not be found.", 404);
    return Response.json(await getSnapshot(env.DB), { headers });
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
