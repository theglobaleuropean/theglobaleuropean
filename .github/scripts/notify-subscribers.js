const fs = require('fs');
const path = require('path');

const SITE_URL = process.env.SITE_URL || 'https://theglobaleuropean.eu';
const API_KEY = process.env.BREVO_API_KEY;
const LIST_ID = Number(process.env.BREVO_LIST_ID);
const SENDER_EMAIL = process.env.SENDER_EMAIL || 'hello@theglobaleuropean.eu';
const SENDER_NAME = 'The Global European';

const STATE_FILE = path.join('.github', 'state', 'notified-articles.json');

function loadArticles() {
  const src = fs.readFileSync('articles.js', 'utf8');
  const start = src.indexOf('[');
  const end = src.lastIndexOf(']');
  return JSON.parse(src.slice(start, end + 1));
}

function loadNotifiedIds() {
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  } catch {
    return [];
  }
}

function escapeHtml(s) {
  return (s || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function buildEmailHtml(article) {
  return `
    <div style="font-family:Georgia,serif; max-width:600px; margin:0 auto; padding:32px 20px; color:#1B2230;">
      <p style="font-family:'Courier New',monospace; font-size:12px; letter-spacing:.1em; text-transform:uppercase; color:#B9860E; margin:0 0 12px;">${escapeHtml(article.category)}</p>
      <h1 style="font-size:28px; line-height:1.2; margin:0 0 16px;">${escapeHtml(article.title)}</h1>
      <p style="font-size:16px; line-height:1.6; color:#5B6472; margin:0 0 24px;">${escapeHtml(article.dek)}</p>
      <p style="margin:0 0 32px;">
        <a href="${SITE_URL}/articles/${article.id}.html" style="display:inline-block; background:#16305C; color:#ffffff; text-decoration:none; padding:12px 24px; font-family:Arial,sans-serif; font-size:14px; font-weight:bold; text-transform:uppercase; letter-spacing:.03em;">Read the full dispatch →</a>
      </p>
      <p style="font-size:12px; color:#5B6472; border-top:1px solid #E3DECF; padding-top:16px;">The Global European — independent coverage of European politics, economy and the forces shaping the continent's future.</p>
    </div>
  `.trim();
}

async function sendCampaign(article) {
  const createRes = await fetch('https://api.brevo.com/v3/emailCampaigns', {
    method: 'POST',
    headers: { 'api-key': API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: `Auto: ${article.title}`,
      subject: `New dispatch: ${article.title}`,
      sender: { name: SENDER_NAME, email: SENDER_EMAIL },
      htmlContent: buildEmailHtml(article),
      recipients: { listIds: [LIST_ID] }
    })
  });
  if (!createRes.ok) {
    throw new Error(`Create campaign failed (${createRes.status}): ${await createRes.text()}`);
  }
  const campaign = await createRes.json();

  const sendRes = await fetch(`https://api.brevo.com/v3/emailCampaigns/${campaign.id}/sendNow`, {
    method: 'POST',
    headers: { 'api-key': API_KEY }
  });
  if (!sendRes.ok) {
    throw new Error(`Send campaign failed (${sendRes.status}): ${await sendRes.text()}`);
  }
}

async function main() {
  if (!API_KEY) throw new Error('BREVO_API_KEY is not set.');
  if (!LIST_ID) throw new Error('BREVO_LIST_ID is not set.');

  const articles = loadArticles();
  const notified = new Set(loadNotifiedIds());
  const newOnes = articles.filter(a => !notified.has(a.id));

  for (const article of newOnes) {
    console.log(`Sending campaign for: ${article.title}`);
    await sendCampaign(article);
    notified.add(article.id);
  }

  fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
  fs.writeFileSync(STATE_FILE, JSON.stringify([...notified], null, 2) + '\n');

  console.log(newOnes.length ? `Notified subscribers for ${newOnes.length} article(s).` : 'No new articles to notify.');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
