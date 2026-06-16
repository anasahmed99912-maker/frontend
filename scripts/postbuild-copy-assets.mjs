import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectDir = path.resolve(scriptDir, "..");
const outDir = path.join(projectDir, "out");
const sourceDir = path.join(outDir, "_next");
const destinationDir = path.join(outDir, "assets", "_next");

if (!existsSync(sourceDir)) {
  throw new Error(`Expected build output at ${sourceDir}`);
}

mkdirSync(path.dirname(destinationDir), { recursive: true });
rmSync(destinationDir, { recursive: true, force: true });
cpSync(sourceDir, destinationDir, { recursive: true });
