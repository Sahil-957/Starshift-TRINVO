import { ListObjectsV2Command } from "@aws-sdk/client-s3";
import { pool } from "@/db";
import { BUCKET, s3 } from "@/lib/storage";

/** Is each backend service reachable? Reports ok/error only, never details. */
export async function GET() {
  const check = async (name: string, run: () => Promise<unknown>) => {
    try {
      await run();
      return [name, "ok"] as const;
    } catch (e) {
      console.error(`health: ${name}`, e);
      return [name, "error"] as const;
    }
  };
  const results = Object.fromEntries(
    await Promise.all([
      check("database", () => pool.query("select 1")),
      check("storage", () => s3.send(new ListObjectsV2Command({ Bucket: BUCKET, MaxKeys: 1 }))),
    ]),
  );
  const ok = Object.values(results).every((v) => v === "ok");
  return Response.json(results, { status: ok ? 200 : 503 });
}
