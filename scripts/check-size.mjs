// `npm run check:size`: lists source files over the size limit in
// docs/conventions.md (400 lines), biggest first. Report only for now —
// the big app files are split one PR at a time (handoff "Open work");
// once they are, CI runs this with --strict so no file can grow back.
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const MAX_LINES = 400;
const root = fileURLToPath(new URL("..", import.meta.url));
const SOURCE_DIRS = ["app/src", "server/src", "shared"];
const isSource = (path) => /\.(ts|css)$/.test(path) && !/\.(test|d)\.ts$/.test(path);

function linesIn(path) {
  return readFileSync(path, "utf8").split("\n").length;
}

function sourceFiles(dir) {
  try {
    return readdirSync(join(root, dir), { recursive: true })
      .map((name) => join(root, dir, String(name)))
      .filter(isSource);
  } catch {
    return []; // a folder that does not exist yet (shared/)
  }
}

const oversized = SOURCE_DIRS.flatMap(sourceFiles)
  .map((path) => ({ file: relative(root, path).replaceAll("\\", "/"), lines: linesIn(path) }))
  .filter(({ lines }) => lines > MAX_LINES)
  .sort((a, b) => b.lines - a.lines);

if (oversized.length === 0) {
  console.log(`check-size: every source file is within ${MAX_LINES} lines`);
} else {
  console.log(`check-size: ${oversized.length} file(s) over ${MAX_LINES} lines`);
  for (const { file, lines } of oversized) console.log(`  ${String(lines).padStart(5)}  ${file}`);
  if (process.argv.includes("--strict")) process.exit(1);
}
