import { NextResponse } from 'next/server';

const BASE_URL = 'https://connectplt.kr';

function getToday(): string {
  return new Date().toISOString().split('T')[0];
}

export async function GET() {
  const today = getToday();

  // Launch-week rule: ONLY include URLs that exist and return 200
  // Note: /auth/signin removed - blocked by robots.txt, shouldn't be in sitemap
  const urls = [
    {
      loc: `${BASE_URL}/`,
      lastmod: today,
      changefreq: 'daily',
      priority: '1.0',
    },
    {
      loc: `${BASE_URL}/pricing`,
      lastmod: today,
      changefreq: 'weekly',
      priority: '0.8',
    },
    {
      loc: `${BASE_URL}/seo/research-grants`,
      lastmod: today,
      changefreq: 'daily',
      priority: '0.9',
    },
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${u.lastmod}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`
  )
  .join('\n')}
</urlset>
`;

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=0, s-maxage=300, stale-while-revalidate=600',
    },
  });
}
