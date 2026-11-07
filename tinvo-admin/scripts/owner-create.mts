/**
 * Creates the first account: you, owning a new organisation. Run once per
 * database (dev, then production). Everything after this happens in the admin UI.
 *
 *   npm run owner:create
 */
import { stdin, stdout } from "node:process";
import { Writable } from "node:stream";
import { createInterface } from "node:readline";
import { pool } from "../src/db/index.ts";
import { createOwner } from "../src/core/users.ts";

// readline writes through this stream, so muting it hides what is typed while
// prompts written straight to stdout stay on screen
let muted = false;
const output = new Writable({
  write(chunk, encoding, done) {
    if (!muted) stdout.write(chunk, encoding);
    done();
  },
});
const rl = createInterface({ input: stdin, output, terminal: stdin.isTTY });
// lines are queued, so answers typed (or pasted) ahead are never lost
const lines = rl[Symbol.asyncIterator]();
const ask = async (q: string) => {
  rl.setPrompt(q);
  rl.prompt();
  return String((await lines.next()).value ?? "");
};

/** Reads a line without echoing it: the prompt shows, the typing doesn't. */
async function askHidden(q: string) {
  rl.setPrompt(`${q}(hidden while you type) `);
  rl.prompt();
  muted = true;
  const answer = String((await lines.next()).value ?? "");
  muted = false;
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
