/**
 * Creates the first account: you, owning a new organisation. Run once per
 * database (dev, then production). Everything after this happens in the admin UI.
 *
 *   npm run owner:create
 */
import { stdin, stdout } from "node:process";
import { createInterface } from "node:readline/promises";
import { pool } from "../src/db/index.ts";
import { createOwner } from "../src/core/users.ts";

const rl = createInterface({ input: stdin, output: stdout });
const ask = (q: string) => rl.question(q);

/** Reads a line without echoing it. */
async function askHidden(q: string) {
  const write = (stdout as unknown as { write: (s: string) => boolean }).write.bind(stdout);
  stdout.write(q);
  (rl as unknown as { _writeToOutput: (s: string) => void })._writeToOutput = () => {};
  const answer = await rl.question("");
  (rl as unknown as { _writeToOutput: (s: string) => void })._writeToOutput = (s) => write(s);
  stdout.write("\n");
  return answer;
}

console.log(`Creating the owner account on Neon branch: ${process.env.NEON_BRANCH ?? "(unknown)"}\n`);
const orgName = (await ask("Organisation name (e.g. your company): ")).trim();
const name = (await ask("Your name: ")).trim();
const email = (await ask("Your email: ")).trim();
const password = await askHidden("Password (12+ characters): ");
const confirm = await askHidden("Repeat password: ");
rl.close();

if (password !== confirm) {
  console.error("Passwords don't match. Nothing was created.");
  process.exitCode = 1;
} else {
  try {
    const { org, user } = await createOwner({ email, name, password, orgName });
    console.log(`\nCreated ${user.email}, owner of "${org.name}". Sign in at the admin and create your first shop.`);
  } catch (e) {
    const err = e as { cause?: { code?: string }; issues?: { message: string }[]; message: string };
    console.error(
      err.cause?.code === "23505" ? "That email already has an account." : (err.issues?.[0]?.message ?? err.message),
    );
    process.exitCode = 1;
  }
}
await pool.end();
