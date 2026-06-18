/**
 * HIDDEN index for the plain-text store-list mirrors. Lists the four
 * per-region URLs. Purely additive, read-only, noindex.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const REGIONS: { slug: string; name: string }[] = [
  { slug: "usa", name: "United States (USA)" },
  { slug: "cad", name: "Canada (CAD)" },
  { slug: "eu", name: "European Union (EU)" },
  { slug: "uk", name: "United Kingdom (UK)" },
];

export async function GET(): Promise<Response> {
  const items = REGIONS.map(
    (r) => `<li><a href="/raw/${r.slug}">/raw/${r.slug}</a> — ${r.name}</li>`,
  ).join("\n");

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>RefundGod — RAW store-list mirrors</title>
</head>
<body>
<h1>RefundGod — RAW store-list mirrors</h1>
<p>Hidden, plain-text mirrors of the live store list for scraping. Each is rebuilt from the live database on every request and always stays in sync with /store-list.</p>
<ul>
${items}
</ul>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store, no-cache, must-revalidate, max-age=0",
      "x-robots-tag": "noindex, nofollow",
    },
  });
}
