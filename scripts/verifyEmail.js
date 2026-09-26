async function verify() {
  const email = 'antigravity_1790432435014@uberip.com';
  const password = 'Antigravity_1790432435014!';
  console.log('Authenticating with mail.tm for', email);
  const tokenRes = await fetch('https://api.mail.tm/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address: email, password })
  });
  const { token } = await tokenRes.json();
  const msgRes = await fetch('https://api.mail.tm/messages', {
    headers: { Authorization: 'Bearer ' + token }
  });
  const msgData = await msgRes.json();
  console.log('Messages found:', msgData['hydra:member']?.length);
  if (msgData['hydra:member']?.length) {
    const id = msgData['hydra:member'][0].id;
    const detailRes = await fetch('https://api.mail.tm/messages/' + id, {
      headers: { Authorization: 'Bearer ' + token }
    });
    const detail = await detailRes.json();
    console.log('Subject:', detail.subject);
    const content = detail.text || detail.html;
    const match = content.match(/https?:\/\/[^\s"'<>]+/g);
    for (const url of match || []) {
      if (url.includes('verify') || url.includes('token') || url.includes('surge')) {
        console.log('Clicking verification link:', url);
        const r = await fetch(url);
        console.log('Verification result status:', r.status);
      }
    }
  }
}
verify().catch(console.error);
