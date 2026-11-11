import type { D1Database } from "@cloudflare/workers-types";

// The digest binds this one operation to the reviewed record IDs and a random nonce.
const cleanupDigest =
  "93e508f4df23b9650b1a291c543853f4d5f4951e01bbbdc2fa2211083bb1b6c2";

export async function removeTestSpins(request: Request, db: D1Database) {
  const headers = { "Cache-Control": "no-store" };
  if (Number(request.headers.get("Content-Length")) > 2048) {
    return new Response(null, { status: 404, headers });
  }
  const body = await request.text();
  if (body.length > 2048) return new Response(null, { status: 404, headers });
  const hash = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(body),
  );
  const digest = Array.from(new Uint8Array(hash), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
  if (digest !== cleanupDigest)
    return new Response(null, { status: 404, headers });

  const { testIds, keepIds } = JSON.parse(body) as {
    testIds: string[];
    keepIds: string[];
  };
  const matches = `id IN (?, ?, ?, ?, ?, ?, ?, ?)
    AND sequence BETWEEN 1 AND 8 AND mode = 'random' AND undone_at IS NULL AND effects IS NULL
    AND (SELECT COUNT(*) FROM picks WHERE id IN (?, ?, ?)
      AND sequence BETWEEN 9 AND 11 AND undone_at IS NULL) = 3`;
  const args = [...testIds, ...keepIds];
  const [, removed] = await db.batch<{ sequence: number }>([
    db
      .prepare(
        `UPDATE wheel_state SET revision = revision + 1
      WHERE id = 1 AND EXISTS (SELECT 1 FROM picks WHERE ${matches})`,
      )
      .bind(...args),
    db
      .prepare(`DELETE FROM picks WHERE ${matches} RETURNING sequence`)
      .bind(...args),
  ]);
  return Response.json(
    { removed: removed.results.map((row) => row.sequence) },
    { headers },
  );
}
