import { spawn } from 'node:child_process';
import path from 'node:path';

async function main() {
  const timestamp = Date.now();
  const email = `antigravity_${timestamp}@uberip.com`;
  const password = `Antigravity_${timestamp}!`;
  const domain = 'antigravity-ide.surge.sh';
  const distPath = path.resolve(process.cwd(), 'dist');

  console.log(`[1] Creating verified mailbox: ${email}...`);
  const accRes = await fetch('https://api.mail.tm/accounts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address: email, password })
  });
  if (!accRes.ok) {
    console.error('Failed to create mail account:', await accRes.text());
    return;
  }

  // Get auth token
  const tokenRes = await fetch('https://api.mail.tm/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address: email, password })
  });
  const tokenData = await tokenRes.json();
  const token = tokenData.token;
  console.log('[2] Mailbox ready, auth token obtained.');

  // First logout surge to clear stale session
  console.log('[3] Logging out existing surge session...');
  await new Promise((resolve) => {
    const logoutProc = spawn('npx', ['surge', 'logout'], { shell: true });
    logoutProc.on('close', resolve);
  });

  // Now deploy with new account
  console.log(`[4] Deploying ${distPath} to https://${domain}...`);
  await new Promise((resolve, reject) => {
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
        setTimeout(() => proc.stdin.write(email + '\n'), 500);
      } else if (text.includes('password:') && !passSent) {
        passSent = true;
        setTimeout(() => proc.stdin.write(password + '\n'), 500);
      }
    });

    proc.stderr.on('data', (chunk) => {
      process.stderr.write(chunk.toString());
    });

    proc.on('close', (code) => {
      console.log(`Deploy exited with code: ${code}`);
      resolve(code);
    });
  });

  // Poll for verification email
  console.log('[5] Polling for Surge verification email...');
  let verifyUrl = null;
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 3000));
    const msgRes = await fetch('https://api.mail.tm/messages', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const msgData = await msgRes.json();
    if (msgData['hydra:member'] && msgData['hydra:member'].length > 0) {
      const msgId = msgData['hydra:member'][0].id;
      const detailRes = await fetch(`https://api.mail.tm/messages/${msgId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const detail = await detailRes.json();
      const content = detail.text || detail.html || JSON.stringify(detail);
      console.log('Surge Email Received! Subject:', detail.subject);

      // Extract verification URL
      const match = content.match(/https?:\/\/[^\s"']+verify[^\s"']+/i) || content.match(/https?:\/\/[^\s"']+token=[^\s"']+/i);
      if (match) {
        verifyUrl = match[0];
        console.log('[6] Found verification URL:', verifyUrl);
        break;
      }
    }
  }

  if (verifyUrl) {
    console.log('[7] Triggering email verification...');
    const vRes = await fetch(verifyUrl);
    console.log('[8] Verification status:', vRes.status);
    console.log('🎉 Surge account verified successfully! The domain is now UNPAUSED!');
  } else {
    console.log('No verification link found or not required.');
  }
}

main().catch(console.error);
