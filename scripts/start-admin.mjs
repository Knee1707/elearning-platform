import { spawn } from "node:child_process";

// Thiết lập cổng Admin (NEXT_PUBLIC_APP_MODE=admin) chạy ở port 3001
process.env.NEXT_PUBLIC_APP_MODE = "admin";

const child = spawn(
  process.platform === "win32" ? "npx.cmd" : "npx",
  ["next", "dev", "-p", "3001"],
  {
    stdio: "inherit",
    shell: true,
    env: { ...process.env, NEXT_PUBLIC_APP_MODE: "admin" },
  }
);

child.on("exit", (code) => {
  process.exit(code ?? 0);
});
