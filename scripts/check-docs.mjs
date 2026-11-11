// `npm run check:docs` (also a CI job): keeps the files every Claude session
// reads small, and keeps docs/architecture.md in step with the code, so a
// session can trust the map instead of re-reading source files.
//
// 1. Size caps on the always-read files (bytes; ~4 bytes per token).
// 2. Every source file (non-test .ts under app/src, server/src, shared/)
//    must be listed in docs/architecture.md.
// 3. Every path listed in docs/architecture.md must exist.
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import nodePath from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const SIZE_CAPS = {
  "CLAUDE.md": 10_000,
  "docs/memory/handoff.md": 5000,
  "docs/architecture.md": 16_000,
  "docs/conventions.md": 8000,
};
const SOURCE_DIRS = ["app/src", "server/src", "shared"];

const problems = [];

for (const [file, cap] of Object.entries(SIZE_CAPS)) {
  const path = nodePath.join(root, file);
  if (existsSync(path)) {
    const { size } = statSync(path);
    if (size > cap) problems.push(`${file}: ${size} bytes, cap is ${cap} — move detail out, keep it short`);
  } else {
    problems.push(`${file}: missing`);
  }
}

// Gitignored paths (app/dist, server/data/, the asset caches) are listed on
// purpose but never exist in a fresh clone or in CI.
function isGitIgnored(path) {
  try {
    execFileSync("git", ["check-ignore", "-q", path], { cwd: root });
    return true;
  } catch {
    return false;
  }
}

function sourceFiles(dir) {
  const full = nodePath.join(root, dir);
  return existsSync(full)
    ? readdirSync(full, { recursive: true })
        .map((name) => nodePath.join(full, String(name)))
        .filter((path) => path.endsWith(".ts") && !path.endsWith(".test.ts") && !path.endsWith(".d.ts"))
        .map((path) => nodePath.relative(root, path).replaceAll("\\", "/"))
    : [];
}

const architecturePath = nodePath.join(root, "docs/architecture.md");
if (existsSync(architecturePath)) {
  const architecture = readFileSync(architecturePath, "utf8");
  const files = SOURCE_DIRS.flatMap((dir) => sourceFiles(dir));
  for (const file of files) {
    if (!architecture.includes(`\`${file}\``)) {
      problems.push(`docs/architecture.md: no line for \`${file}\` — add one (what this file owns)`);
    }
  }
  for (const [, path] of architecture.matchAll(/`((?:app|server|shared|scripts|docs)\/[^`\s]+)`/g)) {
    if (!existsSync(nodePath.join(root, path)) && !isGitIgnored(path)) {
      problems.push(`docs/architecture.md: lists \`${path}\`, which does not exist`);
    }
  }
}

if (problems.length > 0) {
  console.error(`check-docs: ${problems.length} problem(s)\n- ${problems.join("\n- ")}`);
  process.exit(1);
}
console.log("check-docs: ok");
