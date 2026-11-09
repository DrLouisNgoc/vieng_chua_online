import { describe, it, expect, afterEach } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readBoardsFile, writeBoardsFile } from "./boardsFile.js";

const dirs: string[] = [];
function tempPath(name: string): string {
  const dir = mkdtempSync(join(tmpdir(), "boards-test-"));
  dirs.push(dir);
  return join(dir, name);
}

afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe("boardsFile", () => {
  it("returns null for a file that does not exist", () => {
    expect(readBoardsFile(tempPath("missing.json"))).toBeNull();
  });

  it("round-trips data through write then read, creating parent dirs", () => {
    const path = join(tempPath("nested"), "boards.json");
    writeBoardsFile(path, [{ id: "a" }]);
    expect(readBoardsFile(path)).toEqual([{ id: "a" }]);
  });

  it("returns null for a file that is not valid JSON", () => {
    const path = tempPath("broken.json");
    writeBoardsFile(path, "will be overwritten");
    // overwrite with invalid JSON directly
    writeFileSync(path, "{not json", "utf8");
    expect(readBoardsFile(path)).toBeNull();
  });
});
