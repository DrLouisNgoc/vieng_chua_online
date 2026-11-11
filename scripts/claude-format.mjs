// Claude Code PostToolUse hook (.claude/settings.json, decision 0017): after
// every Edit/Write, format the touched file and apply oxlint's safe fixes, so
// both machines' Claudes always leave code in the house style. Reads the
// hook's JSON from stdin. Never fails the edit: problems go to stderr, and
// lefthook + CI still enforce everything.
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import nodePath from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const FORMATTABLE = new Set([".ts", ".mjs", ".js", ".json", ".css", ".yml", ".yaml", ".html"]);
const LINTABLE = new Set([".ts", ".mjs", ".js"]);

function readHookInput() {
  try {
    return JSON.parse(readFileSync(0, "utf8"));
  } catch {
    return null;
  }
}

function run(script, args) {
  const result = spawnSync(process.execPath, [nodePath.join(root, script), ...args], { cwd: root, encoding: "utf8" });
  if (result.status !== 0) {
    process.stderr.write(`claude-format: ${script} exited ${String(result.status)}\n${result.stderr}`);
  }
}

const input = readHookInput();
const filePath = input?.tool_input?.file_path;
if (typeof filePath === "string") {
  const absolute = nodePath.isAbsolute(filePath) ? filePath : nodePath.join(root, filePath);
  const isInRepo = !nodePath.relative(root, absolute).startsWith("..");
  const isIgnored = /[\\/](?:node_modules|dist|public)[\\/]/.test(absolute);
  if (isInRepo && !isIgnored && existsSync(absolute)) {
    const extension = nodePath.extname(absolute);
    if (FORMATTABLE.has(extension)) {
      run("node_modules/prettier/bin/prettier.cjs", ["--write", "--ignore-unknown", "--log-level", "warn", absolute]);
    }
    if (LINTABLE.has(extension)) run("node_modules/oxlint/bin/oxlint", ["--fix", "--quiet", absolute]);
  }
}
