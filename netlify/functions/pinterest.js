// Legge una board Pinterest pubblica tramite il suo feed RSS e restituisce le URL delle immagini.
// Accetta solo indirizzi Pinterest, così non diventa un proxy aperto.
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
  if (parts[0] === 'pin' || parts[0] === 'search' || parts[0] === 'ideas') return { error: 'Questo è un pin o una ricerca: incolla il link di una board (pinterest.com/utente/nome-board).' };
  if (parts.length >= 2) return { rss: `https://www.pinterest.com/${parts[0]}/${parts[1].replace(/\.rss$/, '')}.rss`, name: decodeURIComponent(parts[1]).replace(/-/g, ' ') };
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

  let xml;
  try {
    const r = await fetch(target.rss, { headers: { 'user-agent': 'Mozilla/5.0 (FiveLevelsTimer)', accept: 'application/rss+xml,text/xml,*/*' } });
    if (r.status === 404) return json(404, { error: 'Board non trovata: controlla che sia pubblica e che il link sia giusto.' });
    if (!r.ok) return json(502, { error: 'Pinterest ha risposto ' + r.status + '. Riprova tra poco.' });
    xml = await r.text();
  } catch {
    return json(502, { error: 'Pinterest non risponde. Riprova tra poco.' });
  }

  const title = (xml.match(/<title>(?:<!\[CDATA\[)?([^<\]]+)/) || [])[1];
  const seen = new Set();
  const images = [];
  for (const m of xml.matchAll(/https:\/\/i\.pinimg\.com\/[A-Za-z0-9_\-\/.]+?\.(?:jpe?g|png|webp|gif)/g)) {
    const big = m[0].replace(/i\.pinimg\.com\/\d+x(\d+)?\//, 'i.pinimg.com/736x/');
    const key = big.split('/').pop();
    if (seen.has(key)) continue;
    seen.add(key);
    images.push(big);
  }
  if (!images.length) return json(404, { error: 'Nessuna immagine trovata: la board è vuota o non è pubblica.' });
  return json(200, { board: (title || target.name).trim(), images });
};
