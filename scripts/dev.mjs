import { spawn } from "node:child_process";

const vite = spawn("npm", ["run", "dev:vite"], { stdio: "inherit", shell: true });
const pages = spawn(
  "npx",
  ["wrangler", "pages", "dev", "--port", "8788", "--proxy", "5173"],
  { stdio: "inherit", shell: true },
);

function shutdown() {
  vite.kill();
  pages.kill();
}

process.on("SIGINT", () => {
  shutdown();
  process.exit(0);
});
process.on("SIGTERM", () => {
  shutdown();
  process.exit(0);
});

vite.on("exit", (code) => {
  pages.kill();
  process.exit(code ?? 0);
});
pages.on("exit", (code) => {
  vite.kill();
  process.exit(code ?? 0);
});
