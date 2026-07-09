import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

try {
  process.loadEnvFile(path.join(root, ".env"));
} catch {
  // .env optional until user copies .env.example
}

const args = process.argv.slice(2);
const result = spawnSync(args[0], args.slice(1), {
  stdio: "inherit",
  shell: true,
  cwd: root,
  env: process.env,
});

process.exit(result.status ?? 1);
