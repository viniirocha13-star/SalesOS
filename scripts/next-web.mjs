#!/usr/bin/env node
/**
 * Sobe só o processo WEB (Next). Não inicia worker.
 * Se a porta estiver ocupada, falha com mensagem clara — não mata ninguém.
 */
import { createServer } from "node:net";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const mode = process.argv[2] === "start" ? "start" : "dev";
const port = Number(process.env.APP_PORT || process.env.PORT || 43147);
const host = process.env.APP_HOST || "0.0.0.0";

function assertPortFree(p) {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once("error", (err) => {
      if (err.code === "EADDRINUSE") {
        reject(
          new Error(
            `Porta ${p} ocupada. O WEB provavelmente já está no ar.\n` +
              `Abra http://127.0.0.1:${p}/login ou GET http://127.0.0.1:${p}/api/health\n` +
              `Não matamos processos automaticamente. Pare o PID conhecido do Next se precisar.`,
          ),
        );
        return;
      }
      reject(err);
    });
    server.once("listening", () => {
      server.close(() => resolve());
    });
    server.listen(p, host);
  });
}

await assertPortFree(port);

const bin = join(root, "node_modules", ".bin", "next");
const child = spawn(bin, [mode, "--hostname", host, "--port", String(port)], {
  stdio: "inherit",
  cwd: root,
  env: { ...process.env, APP_PORT: String(port) },
});

child.on("exit", (code) => process.exit(code ?? 0));
