// CI guard (decision 0017): eslint-suppressions.json may only shrink. It holds
// the lint findings that predate the strict standard; new code must pass lint
// outright, so a PR that adds suppressions (eslint --suppress-all / --suppress-rule)
// fails here. Compares against origin/main; run after `git fetch origin main`.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

const FILE = "eslint-suppressions.json";
// Set to true in the PR that deletes the file (end of the cleanup phase):
// from then on it must never exist again.
const IS_RETIRED = false;

function count(json) {
  let total = 0;
  const files = Object.values(JSON.parse(json));
  for (const rules of files) {
    const ruleCounts = Object.values(rules);
    for (const { count: n } of ruleCounts) total += n;
  }
  return total;
}

function onMain() {
  try {
    return count(execFileSync("git", ["show", `origin/main:${FILE}`], { encoding: "utf8", stdio: "pipe" }));
  } catch {
    return null; // not on main yet
  }
}

const here = existsSync(FILE) ? count(readFileSync(FILE, "utf8")) : 0;
if (IS_RETIRED && existsSync(FILE)) {
  console.error(`check-suppressions: ${FILE} was retired; fix the lint findings instead of suppressing them.`);
  process.exit(1);
}
// First introduction (main has no file yet) is the one allowed baseline.
const base = onMain() ?? here;
if (here > base) {
  console.error(`check-suppressions: ${FILE} grew from ${base} to ${here}. Fix the new lint findings instead.`);
  process.exit(1);
}
const shrunk = base > here ? `, ${String(base - here)} fewer than main` : "";
console.log(`check-suppressions: ok (${String(here)} left${shrunk})`);
