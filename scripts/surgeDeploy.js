import { spawn } from 'node:child_process';
import path from 'node:path';

const email = 'antigravity.demo.scada@gmail.com';
const pass = 'AntigravityDev2026!';
const domain = 'gasrms-telemetry-monitor.surge.sh';
const distPath = path.resolve(process.cwd(), 'dist');

console.log(`[Deploy] Deploying ${distPath} to https://${domain}...`);

const proc = spawn('npx', ['surge', distPath, domain], {
  shell: true,
  stdio: ['pipe', 'pipe', 'pipe']
});

let emailSent = false;
let passSent = false;

proc.stdout.on('data', (chunk) => {
  const text = chunk.toString();
  process.stdout.write(text);

  if (text.includes('email:') && !emailSent) {
    emailSent = true;
    setTimeout(() => {
      proc.stdin.write(email + '\n');
    }, 500);
  } else if (text.includes('password:') && !passSent) {
    passSent = true;
    setTimeout(() => {
      proc.stdin.write(pass + '\n');
    }, 500);
  }
});

proc.stderr.on('data', (chunk) => {
  process.stderr.write(chunk.toString());
});

proc.on('close', (code) => {
  console.log(`[Deploy] Process exited with code ${code}`);
});
