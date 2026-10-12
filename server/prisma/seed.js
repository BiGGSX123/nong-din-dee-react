import { PrismaClient } from '@prisma/client';
import { buildDefaultLevels, DEFAULT_CARE_METHODS, DEFAULT_FERTILIZERS } from '../src/defaults.js';

const prisma = new PrismaClient();

async function main() {
  const levels = buildDefaultLevels();
  for (const lvl of levels) {
    await prisma.adminLevel.upsert({ where: { index: lvl.index }, create: lvl, update: lvl });
  }
  for (let i = 0; i < DEFAULT_CARE_METHODS.length; i++) {
    await prisma.adminCareMethod.upsert({
      where: { index: i }, create: { index: i, text: DEFAULT_CARE_METHODS[i] }, update: { text: DEFAULT_CARE_METHODS[i] },
    });
  }
  for (let i = 0; i < DEFAULT_FERTILIZERS.length; i++) {
    await prisma.adminFertilizer.upsert({
      where: { index: i }, create: { index: i, ...DEFAULT_FERTILIZERS[i] }, update: DEFAULT_FERTILIZERS[i],
    });
  }
  console.log(`seeded ${levels.length} levels, ${DEFAULT_CARE_METHODS.length} care methods, ${DEFAULT_FERTILIZERS.length} fertilizers`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
