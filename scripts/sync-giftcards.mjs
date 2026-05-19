#!/usr/bin/env node
  // Daily spawngc.gg -> refgd buy4u sync
  // Logs in to spawngc, fetches all products, applies profit margin,
  // rewrites the GC_CARDS array in refgd/app/buy4u/page.tsx.
  //
  // Env vars:
  //   SPAWN_LOGIN     spawngc.gg account email     (required)
  //   SPAWN_PASS      spawngc.gg account password  (required)
  //   MARGIN_PCT      points to subtract from spawngc discount   (default 10)
  //   MIN_DISCOUNT    minimum discount % we will ever display    (default 5)
  //
  // Usage: node scripts/sync-giftcards.mjs [path/to/page.tsx]

  import { readFileSync, writeFileSync } from 'node:fs';

  const LOGIN_URL = 'https://spawngc.gg/accounts/login/';
  const PRODUCTS_URL = 'https://spawngc.gg/products';
  const PRODUCTS_ACTION = '6584623a7ab040205dfad74a46bf1e9e8f74abe5';

  const MARGIN_PCT = parseInt(process.env.MARGIN_PCT || '10', 10);
  const MIN_DISCOUNT = parseInt(process.env.MIN_DISCOUNT || '5', 10);
  const FILE = process.argv[2] || 'refgd/app/buy4u/page.tsx';
  const UA = 'Mozilla/5.0 (refgd-sync)';

  // --- minimal cookie jar -----------------------------------------------------
  const jar = new Map();
  function applySetCookie(headers) {
    const list = typeof headers.getSetCookie === 'function' ? headers.getSetCookie() : [];
    for (const c of list) {
      const [pair] = c.split(';');
      const i = pair.indexOf('=');
      if (i > 0) jar.set(pair.slice(0, i).trim(), pair.slice(i + 1).trim());
    }
  }
  function cookieHeader() {
    return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
  }

  // --- auth -------------------------------------------------------------------
  async function login() {
    const email = process.env.SPAWN_LOGIN;
    const pass = process.env.SPAWN_PASS;
    if (!email || !pass) throw new Error('SPAWN_LOGIN and SPAWN_PASS env vars are required');

    const r1 = await fetch(LOGIN_URL, { headers: { 'User-Agent': UA } });
    applySetCookie(r1.headers);
    const csrf = jar.get('csrftoken');
    if (!csrf) throw new Error('Could not obtain csrftoken from login page');

    const form = new URLSearchParams();
    form.set('csrfmiddlewaretoken', csrf);
    form.set('login', email);
    form.set('password', pass);
    form.set('remember', 'on');

    const r2 = await fetch(LOGIN_URL, {
      method: 'POST',
      headers: {
        'User-Agent': UA,
        'Cookie': cookieHeader(),
        'Content-Type': 'application/x-www-form-urlencoded',
        'Referer': LOGIN_URL,
        'Origin': 'https://spawngc.gg',
      },
      body: form,
      redirect: 'manual',
    });
    applySetCookie(r2.headers);
    if (!jar.get('shop_session')) {
      throw new Error(`Login failed (status ${r2.status}); no shop_session cookie returned`);
    }
    console.log('[auth] logged in as', email);
  }

  // --- products ---------------------------------------------------------------
  function parseRscPayload(text) {
    // Response format: each line is "<id>:<json>". We want the line starting with "1:".
    for (const line of text.split(/\r?\n/)) {
      if (line.startsWith('1:')) {
        try { return JSON.parse(line.slice(2)); } catch { return null; }
      }
    }
    return null;
  }

  async function fetchAllProducts() {
    const items = [];
    let page = 1;
    while (true) {
      const r = await fetch(PRODUCTS_URL, {
        method: 'POST',
        headers: {
          'User-Agent': UA,
          'Cookie': cookieHeader(),
          'Next-Action': PRODUCTS_ACTION,
          'X-CSRFToken': jar.get('csrftoken') || '',
          'Content-Type': 'text/plain;charset=UTF-8',
          'Referer': 'https://spawngc.gg/products',
          'Origin': 'https://spawngc.gg',
        },
        body: JSON.stringify([{ page, category: '', availability: '', search: '' }]),
      });
      const text = await r.text();
      const data = parseRscPayload(text);
      if (!data || !data.items) {
        throw new Error(`page ${page}: unexpected response shape`);
      }
      items.push(...data.items);
      console.log(`[fetch] page ${page}/${data.pagination.total_pages}: +${data.items.length} (total ${items.length}/${data.pagination.total_items})`);
      if (!data.pagination.has_next) break;
      page++;
      if (page > 50) throw new Error('runaway pagination');
    }
    return items;
  }

  // --- mapping ----------------------------------------------------------------
  function toCard(p, key) {
    const availability = [];
    availability.push(p.is_available ? 'In Stock' : 'Out of Stock');
    if (p.is_available && p.is_best_selling) availability.push('Best Selling');
    if (p.has_pin) availability.push('PIN');
    if (p.has_pdf) availability.push('PDF');
    if (p.has_pass2u) availability.push('Pass2U');
    if (p.is_online) availability.push('Online');
    if (p.is_store) availability.push('In-Store');

    let price = null;
    if (p.discount && p.discount > 0) {
      const refgdDiscount = Math.max(MIN_DISCOUNT, Math.round(p.discount - MARGIN_PCT));
      price = `${refgdDiscount}% off`;
    }

    let image = null;
    if (p.image && typeof p.image === 'string') {
      const idx = p.image.indexOf('/media/');
      if (idx >= 0) image = '/api/gc-img' + p.image.slice(idx);
    }

    const card = {
      key,
      name: p.name,
      brand: p.name,
      category: p.category,
      states: Array.isArray(p.states) ? p.states : [],
      availability,
    };
    if (image) card.image = image;
    if (price) card.price = price;
    return card;
  }

  function serializeCard(c) {
    const parts = [`key:${JSON.stringify(c.key)}`];
    parts.push(`name:${JSON.stringify(c.name)}`);
    parts.push(`brand:${JSON.stringify(c.brand)}`);
    parts.push(`category:${JSON.stringify(c.category)}`);
    parts.push(`states:${JSON.stringify(c.states)}`);
    parts.push(`availability:${JSON.stringify(c.availability)}`);
    if (c.image) parts.push(`image:${JSON.stringify(c.image)}`);
    if (c.price) parts.push(`price:${JSON.stringify(c.price)}`);
    return `  {${parts.join(',')}},`;
  }

  // --- main -------------------------------------------------------------------
  async function main() {
    await login();
    const products = await fetchAllProducts();
    console.log(`[fetch] total products: ${products.length}`);

    const src = readFileSync(FILE, 'utf8');
    const arrRe = /const GC_CARDS:\s*GiftCard\[\]\s*=\s*\[([\s\S]*?)\n\];/;
    const m = src.match(arrRe);
    if (!m) throw new Error('GC_CARDS array not found in ' + FILE);

    // Preserve existing keys by brand-name match so URLs/anchors stay stable.
    const nameToKey = new Map();
    const usedKeyNums = new Set();
    const re = /\{key:"([^"]+)",name:"((?:[^"\\]|\\.)*)"/g;
    let mk;
    while ((mk = re.exec(m[1]))) {
      const name = mk[2].replace(/\\"/g, '"').replace(/\\\\/g, '\\');
      nameToKey.set(name.toLowerCase(), mk[1]);
      const n = parseInt(mk[1].replace(/^sgc/, ''), 10);
      if (!isNaN(n)) usedKeyNums.add(n);
    }
    console.log(`[parse] existing cards: ${nameToKey.size}`);
    let nextKeyNum = (usedKeyNums.size ? Math.max(...usedKeyNums) : 0) + 1;

    let added = 0, kept = 0;
    const cards = products.map((p) => {
      const lower = p.name.toLowerCase();
      let key = nameToKey.get(lower);
      if (!key) {
        key = `sgc${String(nextKeyNum++).padStart(3, '0')}`;
        added++;
      } else {
        kept++;
      }
      return toCard(p, key);
    });

    const removed = nameToKey.size - kept;
    console.log(`[sync] +${added} new, =${kept} updated, -${removed} removed`);

    // Sort: category order, then alpha by name.
    const CATEGORY_ORDER = ['Food And Restaurants', 'Gas Stations', 'Retail', 'Groceries', 'Entertainment'];
    cards.sort((a, b) => {
      const ca = CATEGORY_ORDER.indexOf(a.category);
      const cb = CATEGORY_ORDER.indexOf(b.category);
      if (ca !== cb) return (ca === -1 ? 999 : ca) - (cb === -1 ? 999 : cb);
      return a.name.localeCompare(b.name, 'en', { sensitivity: 'base' });
    });

    const body = cards.map(serializeCard).join('\n');
    const replacement = `const GC_CARDS: GiftCard[] = [\n${body}\n];`;
    const newSrc = src.replace(arrRe, replacement);

    if (newSrc === src) {
      console.log('[write] no changes');
      return;
    }
    writeFileSync(FILE, newSrc);
    console.log(`[write] wrote ${cards.length} cards to ${FILE}`);
  }

  main().catch((e) => {
    console.error('[fatal]', e.message);
    process.exit(1);
  });
  