import localtunnel from 'localtunnel';

const PORT = 3001;
const SUBDOMAIN = 'gas-rms-telemetry';

async function launchTunnel() {
  console.log(`[Tunnel Manager] Connecting tunnel to port ${PORT}...`);
  try {
    const tunnel = await localtunnel({
      port: PORT,
      subdomain: SUBDOMAIN,
    });

    console.log(`[Tunnel Manager] ACTIVE URL: ${tunnel.url}`);

    tunnel.on('close', () => {
      console.log('[Tunnel Manager] Connection closed by remote host. Reconnecting in 2s...');
      setTimeout(launchTunnel, 2000);
    });

    tunnel.on('error', (err) => {
      console.error('[Tunnel Manager] Error:', err.message);
      try { tunnel.close(); } catch {}
      setTimeout(launchTunnel, 3000);
    });
  } catch (err: any) {
    console.error('[Tunnel Manager] Setup error:', err.message);
    setTimeout(launchTunnel, 3000);
  }
}

launchTunnel();
