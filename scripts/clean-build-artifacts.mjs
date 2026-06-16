import { existsSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectDir = path.resolve(scriptDir, "..");

for (const directoryName of [".next", "out"]) {
  const targetDir = path.join(projectDir, directoryName);

  if (existsSync(targetDir)) {
    rmSync(targetDir, { recursive: true, force: true });
  }
}
