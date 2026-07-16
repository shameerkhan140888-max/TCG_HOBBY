import { prisma } from '../src/client';
import { seedCanonicalLookupData, verifyCanonicalLookupData } from '../src/canonical-seed';

async function main(): Promise<void> {
  console.log('Seed starting...');
  console.log('Connecting to database...');
  await prisma.$connect();

  await seedCanonicalLookupData(prisma, console.log);

  console.log('Verifying canonical lookup data...');
  await verifyCanonicalLookupData(prisma);

  console.log('Disconnecting Prisma...');
  await prisma.$disconnect();
  console.log('Seed complete.');
}

main().catch(async (error) => {
  console.error(error);
  console.log('Disconnecting Prisma...');
  await prisma.$disconnect();
  process.exitCode = 1;
});
