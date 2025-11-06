import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function htmlToText(html: string): string {
  if (!html || html.trim().length === 0) return '';

  // Remove script and style tags
  let text = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ');
  text = text.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ');

  // Remove HTML tags
  text = text.replace(/<[^>]+>/g, ' ');

  // Decode HTML entities
  text = text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

  // Normalize whitespace
  text = text.replace(/\s+/g, ' ');

  return text.trim();
}

async function main() {
  const job = await prisma.scraping_jobs.findFirst({
    where: { processingStatus: 'COMPLETED' },
    select: { detailPageData: true },
  });

  const detailData = job?.detailPageData as any;

  if (detailData?.rawHtml) {
    const parsedText = htmlToText(detailData.rawHtml);

    console.log('Parsed text length:', parsedText.length, 'chars');
    console.log('\nFirst 1000 chars:');
    console.log(parsedText.substring(0, 1000));

    console.log('\nSearching for TRL keywords...');
    const trlMatch = parsedText.match(/TRL\s*\d|기술준비도|기술 준비도|준비도.*TRL/i);
    console.log('TRL match:', trlMatch);

    console.log('\nSearching for business structure keywords...');
    const structureMatch = parsedText.match(/중소기업|대기업|중견기업|스타트업|기업형태|참여자격/);
    console.log('Structure match:', structureMatch);
  }

  await prisma.$disconnect();
}

main().catch(console.error);
