// Next.js dev server with auto-restart
import { spawn } from 'child_process';

const PORT = 3000;
const MAX_RESTARTS = 100;
let restartCount = 0;

function startServer() {
  console.log(`[nextjs-server] Starting Next.js dev server on port ${PORT}... (restart #${restartCount})`);
  
  const child = spawn('node', ['node_modules/.bin/next', 'dev', '-p', String(PORT)], {
    cwd: '/home/z/my-project',
    stdio: ['pipe', 'pipe', 'pipe'],
    env: { ...process.env }
  });

  child.stdout.on('data', (data: Buffer) => {
    const msg = data.toString().trim();
    console.log(`[nextjs-server] ${msg}`);
  });

  child.stderr.on('data', (data: Buffer) => {
    const msg = data.toString().trim();
    console.error(`[nextjs-server] ${msg}`);
  });

  child.on('exit', (code, signal) => {
    console.log(`[nextjs-server] Process exited with code ${code}, signal ${signal}`);
    restartCount++;
    if (restartCount < MAX_RESTARTS) {
      console.log(`[nextjs-server] Restarting in 3 seconds...`);
      setTimeout(startServer, 3000);
    } else {
      console.error(`[nextjs-server] Max restarts (${MAX_RESTARTS}) reached. Giving up.`);
    }
  });

  child.on('error', (err) => {
    console.error(`[nextjs-server] Error: ${err.message}`);
  });
}

startServer();
