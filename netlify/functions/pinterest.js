// Legge una board Pinterest pubblica tramite il suo feed RSS e restituisce le URL delle immagini.
// Accetta solo indirizzi Pinterest, cos\u00ec non diventa un proxy aperto.
const HOST = /(^|\.)pinterest\.[a-z.]{2,8}$/i;

function json(status, data) {
  return {
    statusCode: status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': status === 200 ? 'public, max-age=600' : 'no-store' },
    body: JSON.stringify(data),
  };
}

async function resolve(raw) {
  let u;
  try { u = new URL(raw.trim()); } catch { return null; }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
  if (u.hostname === 'pin.it') {
    // link corti dell'app: seguo il redirect fino all'indirizzo vero
    const r = await fetch(u.href, { redirect: 'follow', headers: { 'user-agent': 'Mozilla/5.0' } });
    u = new URL(r.url);
  }
  if (!HOST.test(u.hostname)) return null;
  const parts = u.pathname.split('/').filter(Boolean);
  if (parts[0] === 'pin' || parts[0] === 'search' || parts[0] === 'ideas') return { error: 'Questo \u00e8 un pin o una ricerca: incolla il link di una board (pinterest.com/utente/nome-board).' };
  if (parts.length >= 2) {
    const user = parts[0], board = parts[1].replace(/\.rss$/, '');
    return { user, board, rss: `https://www.pinterest.com/${user}/${board}.rss`, name: decodeURIComponent(board).replace(/-/g, ' ') };
  }
  if (parts.length === 1) return { rss: `https://www.pinterest.com/${parts[0]}/feed.rss`, name: parts[0] };
  return null;
}

exports.handler = async (event) => {
  const raw = (event.queryStringParameters || {}).url || '';
  if (!raw) return json(400, { error: 'Manca il link della board.' });
  let target;
  try { target = await resolve(raw); } catch { return json(400, { error: 'Link non valido.' }); }
  if (!target) return json(400, { error: 'Accetto solo link di board Pinterest.' });
  if (target.error) return json(400, { error: target.error });

  const seen = new Set();
  const images = [];
  let title = '';
  const add = (url) => {
    if (!url || !/^https:\/\/i\.pinimg\.com\//.test(url)) return;
    const big = url.replace(/i\.pinimg\.com\/\d+x(\d+)?\//, 'i.pinimg.com/736x/');
    const key = big.split('/').pop();
    if (seen.has(key)) return;
    seen.add(key);
    images.push(big);
  };
  const UA = { 'user-agent': 'Mozilla/5.0 (FiveLevelsTimer)' };

  // 1) widget delle board: fino a ~50 pin
  if (target.board) {
    try {
      const r = await fetch(`https://widgets.pinterest.com/v3/pidgets/boards/${encodeURIComponent(target.user)}/${encodeURIComponent(target.board)}/pins/`, { headers: { ...UA, accept: 'application/json' } });
      if (r.ok) {
        const j = await r.json();
        const d = (j && j.data) || {};
        title = (d.board && d.board.name) || '';
        for (const pin of d.pins || []) {
          const im = pin.images || {};
          add((im['736x'] || im['564x'] || im['474x'] || im['237x'] || {}).url);
        }
      }
    } catch { /* passo al feed RSS */ }
  }

  // 2) feed RSS: ultimi ~25 pin, utile anche per i profili
  let rssStatus = 0;
  try {
    const r = await fetch(target.rss, { headers: { ...UA, accept: 'application/rss+xml,text/xml,*/*' } });
    rssStatus = r.status;
    if (r.ok) {
      const xml = await r.text();
      if (!title) title = (xml.match(/<title>(?:<!\[CDATA\[)?([^<\]]+)/) || [])[1] || '';
      for (const m of xml.matchAll(/https:\/\/i\.pinimg\.com\/[A-Za-z0-9_\-\/.]+?\.(?:jpe?g|png|webp|gif)/g)) add(m[0]);
    }
  } catch { /* gestito sotto */ }

  if (!images.length && rssStatus === 404) return json(404, { error: 'Board non trovata: controlla che sia pubblica e che il link sia giusto.' });
  if (!images.length && rssStatus && rssStatus !== 200) return json(502, { error: 'Pinterest ha risposto ' + rssStatus + '. Riprova tra poco.' });
  if (!images.length) return json(404, { error: 'Nessuna immagine trovata: la board \u00e8 vuota o non \u00e8 pubblica.' });
  return json(200, { board: (title || target.name).trim(), images, count: images.length });
};
