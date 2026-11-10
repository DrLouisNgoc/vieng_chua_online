// `npm run dev` from the project root: starts the visitor server and the
// app together. Ctrl+C in the terminal stops both.
//
// The server's own PORT (8787, server/src/server.ts's DEFAULT_PORT) must
// not be whatever ambient PORT the parent process was launched with (e.g.
// a dev-server runner that sets PORT for "the" app) — that would collide
// with Vite's own port or just put the presence/boards server somewhere
// main.ts's defaults don't look. Pin it explicitly for the server child
// only; the app child keeps inheriting the ambient env untouched.
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const SERVER_PORT = "8787";

for (const folder of ["server", "app"]) {
  const cwd = fileURLToPath(new URL(`../${folder}/`, import.meta.url));
  const env = folder === "server" ? { ...process.env, PORT: SERVER_PORT } : process.env;
  const child = spawn("npm run dev", { cwd, stdio: "inherit", shell: true, env });
  child.on("exit", (code) => {
    if (code) console.error(`${folder}: stopped with exit code ${code}`);
  });
}
