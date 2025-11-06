/**
 * Check Enhancement Field Extraction Success Rates
 */

import { db } from '../lib/db';

async function main() {
  const programs = await db.funding_programs.findMany({
    where: {
      scrapedAt: {
        gte: new Date('2025-10-30')
      }
    },
    select: {
      id: true,
      title: true,
      budgetAmount: true,
      minTrl: true,
      maxTrl: true,
      allowedBusinessStructures: true,
      scraping_job: {
        select: {
          attachmentCount: true
        }
      }
    }
  });

  const total = programs.length;
  const withBudget = programs.filter(p => p.budgetAmount !== null).length;
  const withTRL = programs.filter(p => p.minTrl !== null).length;
  const withBusinessStructures = programs.filter(p => p.allowedBusinessStructures.length > 0).length;

  console.log('📊 Enhancement Field Extraction Success Rates:');
  console.log(\`   Total programs processed: \${total}\`);
  console.log();
  console.log(\`   Budget: \${withBudget}/\${total} (\${Math.round(withBudget/total*100)}%) \${withBudget/total >= 0.7 ? '✅' : '❌'} Target: ≥70%\`);
  console.log(\`   TRL: \${withTRL}/\${total} (\${Math.round(withTRL/total*100)}%) \${withTRL/total >= 0.7 ? '✅' : '❌'} Target: ≥70%\`);
  console.log(\`   Business: \${withBusinessStructures}/\${total} (\${Math.round(withBusinessStructures/total*100)}%) \${withBusinessStructures/total >= 0.5 ? '✅' : '❌'} Target: ≥50%\`);
  console.log();
  console.log('📋 Sample Programs:');
  programs.slice(0, 5).forEach((p, idx) => {
    console.log(\`   \${idx+1}. \${p.title.substring(0, 50)}...\`);
    console.log(\`      Budget: \${p.budgetAmount ? '✓' : '✗'} | TRL: \${p.minTrl ? \`\${p.minTrl}-\${p.maxTrl}\` : '✗'} | Business: \${p.allowedBusinessStructures.length > 0 ? '✓' : '✗'} | Attachments: \${p.scraping_job?.attachmentCount || 0}\`);
  });

  await db.\$disconnect();
}

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
