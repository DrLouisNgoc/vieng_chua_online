// `npm run dev` from the project root: starts the visitor server and the
// app together. Ctrl+C in the terminal stops both.
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

for (const folder of ["server", "app"]) {
  const cwd = fileURLToPath(new URL(`../${folder}/`, import.meta.url));
  const child = spawn("npm run dev", { cwd, stdio: "inherit", shell: true });
  child.on("exit", (code) => {
    if (code) console.error(`${folder}: stopped with exit code ${code}`);
  });
}
