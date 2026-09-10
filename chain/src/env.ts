import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

/**
 * Loads `chain/.env` if the operator made one.
 *
 * Documenting `cp .env.example .env` and then reading only `process.env` is a
 * trap: the run silently skips instead of paying. Shell-supplied values win —
 * `process.loadEnvFile` does not overwrite them — so CI stays unaffected, and a
 * checkout with no `.env` still shows live tests as skipped rather than failing.
 */
export function loadChainEnv(): void {
  const envPath = resolve(dirname(fileURLToPath(import.meta.url)), "..", ".env");
  if (existsSync(envPath)) process.loadEnvFile(envPath);
}
