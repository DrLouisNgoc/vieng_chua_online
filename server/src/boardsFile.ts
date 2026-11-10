// Disk persistence for server/data/*.json (boards, pháp danh locks).
//
// Writes go to a temp file that is then renamed over the target: a rename
// is atomic, so a crash or a deploy restart mid-write leaves the previous
// file intact instead of a truncated one.
//
// A missing file means a fresh install (null, caller seeds). A file that
// exists but cannot be parsed is an error, not a fresh install: starting
// empty would overwrite real content and drop the admin password hash on
// the next write. Fail loudly so the owner restores it from a backup.
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

function isMissingFile(error: unknown): boolean {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}

export function readBoardsFile(path: string): unknown {
  let text: string;
  try {
    text = readFileSync(path, "utf8");
  } catch (error) {
    if (isMissingFile(error)) return null;
    throw error;
  }
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`${path} is not valid JSON — restore it from a backup before starting the server`, {
      cause: error,
    });
  }
}

export function writeBoardsFile(path: string, data: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  const tempPath = `${path}.${process.pid}.tmp`;
  writeFileSync(tempPath, JSON.stringify(data, null, 2), "utf8");
  renameSync(tempPath, path);
}
