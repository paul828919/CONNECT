import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function cleanupAllFundingPrograms() {
  console.log("🧹 Deleting ALL funding_programs from local database\n");
  console.log("═".repeat(80));

  try {
    // Count before deletion
    const countBefore = await prisma.funding_programs.count();
    console.log(`\n📊 Current funding_programs count: ${countBefore}\n`);

    if (countBefore === 0) {
      console.log("✅ Database is already empty - no funding_programs to delete\n");
      console.log("═".repeat(80));
      return;
    }

    // Delete all funding_programs
    const result = await prisma.funding_programs.deleteMany({});

    console.log(`✅ Deleted ${result.count} funding_programs\n`);

    // Verify deletion
    const countAfter = await prisma.funding_programs.count();
    console.log(`📊 Remaining funding_programs count: ${countAfter}\n`);

    if (countAfter === 0) {
      console.log("✅ VERIFIED: All funding_programs successfully deleted\n");
    } else {
      console.log(`⚠️  WARNING: ${countAfter} funding_programs still remain\n`);
    }

    console.log("═".repeat(80));
  } finally {
    await prisma.$disconnect();
  }
}

cleanupAllFundingPrograms().catch(console.error);
