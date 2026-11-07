import { spawn } from "node:child_process";
import { access, mkdir } from "node:fs/promises";
import { createServer } from "node:net";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout as delay } from "node:timers/promises";

const projectRoot = dirname(fileURLToPath(import.meta.url));
const backendRoot = join(projectRoot, "go-backend");
const viteEntry = join(projectRoot, "node_modules", "vite", "bin", "vite.js");
const children = new Set();
let stopping = false;

function stopServices(exitCode) {
  if (stopping) return;
  stopping = true;
  process.exitCode = exitCode;
  console.log("\nStopping development services...");
  for (const child of children) child.kill();
}

process.on("SIGINT", () => stopServices(0));
process.on("SIGTERM", () => stopServices(0));

function startProcess(command, args, options) {
  const child = spawn(command, args, { stdio: "inherit", ...options });
  children.add(child);
  child.once("close", () => children.delete(child));
  return child;
}

function checkPort(port) {
  return new Promise((resolve, reject) => {
    const probe = createServer();
    probe.once("error", (error) => {
      reject(new Error(`Port ${port} is unavailable (${error.code}). Stop the existing service first.`));
    });
    probe.listen({ port, host: "::", ipv6Only: false }, () => {
      probe.close(resolve);
    });
  });
}

function monitorService(child, name) {
  child.once("error", (error) => {
    console.error(`${name} failed to start: ${error.message}`);
    stopServices(1);
  });
  child.once("exit", (code) => {
    if (!stopping) {
      console.error(`${name} exited (code: ${code}).`);
      stopServices(code === 0 ? 0 : 1);
    }
  });
}

async function main() {
  try {
    await access(viteEntry);
  } catch {
    throw new Error("Frontend dependencies are missing. Run npm install in the main folder first.");
  }
  await Promise.all([checkPort(3000), checkPort(3003)]);
  if (stopping) return;

  const logDirectory = join(backendRoot, "logs");
  await mkdir(logDirectory, { recursive: true });
  const backendExecutable = join(logDirectory, process.platform === "win32" ? "start-dev-backend.exe" : "start-dev-backend");
  console.log("Building Go backend...");
  await new Promise((resolve, reject) => {
    const build = startProcess("go", ["build", "-o", backendExecutable, "./cmd/server"], { cwd: backendRoot });
    build.once("error", (error) => reject(new Error(`Cannot start Go: ${error.message}`)));
    build.once("exit", (code) => code === 0 ? resolve() : reject(new Error(`Go build failed (code: ${code}).`)));
  });
  if (stopping) return;

  const backend = startProcess(backendExecutable, [], {
    cwd: backendRoot,
    env: { ...process.env, PORT: "3003", NODE_ENV: "test", CORS_ORIGIN: "http://localhost:3000" },
  });
  monitorService(backend, "Go backend");

  const deadline = Date.now() + 30000;
  let backendReady = false;
  while (!stopping && Date.now() < deadline) {
    try {
      const response = await fetch("http://localhost:3003/", { signal: AbortSignal.timeout(1000) });
      if (response.ok && await response.text() === "Hello from the Go backend!") {
        backendReady = true;
        break;
      }
    } catch {
      await delay(250);
    }
  }
  if (stopping) return;
  if (!backendReady) throw new Error("Go backend did not become ready within 30 seconds.");

  console.log(`Backend logs: ${logDirectory}`);
  console.log("Open http://localhost:3000/ in your browser.");
  console.log("Press Ctrl+C in this terminal to stop both services.");
  const frontend = startProcess(process.execPath, [viteEntry, "--host", "localhost", "--port", "3000", "--strictPort"], {
    cwd: projectRoot,
    env: { ...process.env, VITE_API_URL: "http://localhost:3003", BROWSER: "none" },
  });
  monitorService(frontend, "Vite frontend");
}

main().catch((error) => {
  if (!stopping) console.error(error.message);
  stopServices(1);
});
