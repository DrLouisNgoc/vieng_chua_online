import { describe, it, expect, afterEach } from "vitest";
import { mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { readBoardsFile, writeBoardsFile } from "./boards-file.js";

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

  it("leaves only the target file behind after a write (no temp files)", () => {
    const path = tempPath("boards.json");
    writeBoardsFile(path, { v: 1 });
    writeBoardsFile(path, { v: 2 });
    expect(readdirSync(dirname(path))).toEqual(["boards.json"]);
    expect(readBoardsFile(path)).toEqual({ v: 2 });
  });

  it("refuses to load a file that is not valid JSON instead of silently starting empty", () => {
    // Starting empty would reset every board to its seed and drop the admin
    // password hash on the next write — real content lost for good.
    const path = tempPath("broken.json");
    writeFileSync(path, "{not json", "utf8");
    expect(() => readBoardsFile(path)).toThrow(/broken\.json/);
  });
});
