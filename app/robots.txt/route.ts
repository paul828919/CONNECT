import { NextResponse } from 'next/server';

export async function GET() {
  const robotsTxt = `# Connect Platform - Robots.txt
# https://connectplt.kr

User-agent: *
Allow: /
Allow: /seo/
Allow: /pricing

Disallow: /api/
Disallow: /dashboard/
Disallow: /auth/

Sitemap: https://connectplt.kr/sitemap.xml

User-agent: Googlebot
Allow: /

User-agent: Bingbot
Allow: /

User-agent: Yeti
Allow: /
`;

  return new NextResponse(robotsTxt, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=86400',
    },
  });
}
