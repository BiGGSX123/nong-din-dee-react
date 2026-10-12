import { Router } from 'express';
import { prisma } from '../db.js';
import { requireAdminRole } from '../auth.js';
import { buildDefaultLevels, DEFAULT_CARE_METHODS, DEFAULT_FERTILIZERS } from '../defaults.js';

export const adminRouter = Router();

// GET is public — every player needs this to play, not just admins.
// Only the mutating routes below (PUT/POST/DELETE/reset) require an admin role.
adminRouter.get('/config', async (req, res) => {
  const [levels, careMethods, fertilizers] = await Promise.all([
    prisma.adminLevel.findMany({ orderBy: { index: 'asc' } }),
    prisma.adminCareMethod.findMany({ orderBy: { index: 'asc' } }),
    prisma.adminFertilizer.findMany({ orderBy: { index: 'asc' } }),
  ]);
  res.json({ levels, careMethods, fertilizers });
});

adminRouter.use(requireAdminRole);

/* ---------------- levels ---------------- */
adminRouter.put('/levels/:index', async (req, res) => {
  const index = Number(req.params.index);
  const { province, soilId, careCorrectIdx, cropChoices, cropCorrectId, fertCorrectIdx } = req.body || {};
  const level = await prisma.adminLevel.update({
    where: { index },
    data: { province, soilId, careCorrectIdx, cropChoices, cropCorrectId, fertCorrectIdx },
  });
  res.json({ level });
});

adminRouter.post('/levels', async (req, res) => {
  const count = await prisma.adminLevel.count();
  const defaultCrops = ['rice', 'rubber', 'cassava', 'sugarcane'];
  const level = await prisma.adminLevel.create({
    data: {
      index: count,
      province: (req.body && req.body.province) || `ด่านพิเศษ ${count + 1}`,
      soilId: 'lowland-clay',
      careCorrectIdx: 0,
      cropChoices: defaultCrops,
      cropCorrectId: defaultCrops[0],
      fertOrder: [0, 1, 2, 3],
      fertCorrectIdx: 0,
    },
  });
  res.json({ level });
});

// only the last level may be deleted, same rule the localStorage version enforced
adminRouter.delete('/levels/:index', async (req, res) => {
  const index = Number(req.params.index);
  const count = await prisma.adminLevel.count();
  if (index !== count - 1) return res.status(400).json({ error: 'only the last level can be deleted' });
  await prisma.adminLevel.delete({ where: { index } });
  res.json({ ok: true });
});

/* ---------------- care methods ---------------- */
adminRouter.put('/care-methods/:index', async (req, res) => {
  const index = Number(req.params.index);
  const { text } = req.body || {};
  const method = await prisma.adminCareMethod.update({ where: { index }, data: { text } });
  res.json({ method });
});

adminRouter.post('/care-methods', async (req, res) => {
  const count = await prisma.adminCareMethod.count();
  const method = await prisma.adminCareMethod.create({ data: { index: count, text: 'วิธีใหม่' } });
  res.json({ method });
});

adminRouter.delete('/care-methods/:index', async (req, res) => {
  const index = Number(req.params.index);
  const count = await prisma.adminCareMethod.count();
  if (index !== count - 1 || count <= 1) return res.status(400).json({ error: 'only the last item can be deleted' });
  await prisma.$transaction([
    prisma.adminCareMethod.delete({ where: { index } }),
    prisma.adminLevel.updateMany({ where: { careCorrectIdx: index }, data: { careCorrectIdx: 0 } }),
  ]);
  res.json({ ok: true });
});

/* ---------------- fertilizers ---------------- */
adminRouter.put('/fertilizers/:index', async (req, res) => {
  const index = Number(req.params.index);
  const { label, sub } = req.body || {};
  const fert = await prisma.adminFertilizer.update({ where: { index }, data: { label, sub } });
  res.json({ fert });
});

adminRouter.post('/fertilizers', async (req, res) => {
  const count = await prisma.adminFertilizer.count();
  const fert = await prisma.adminFertilizer.create({ data: { index: count, label: 'ปุ๋ยใหม่', sub: 'คำอธิบาย' } });
  res.json({ fert });
});

adminRouter.delete('/fertilizers/:index', async (req, res) => {
  const index = Number(req.params.index);
  const count = await prisma.adminFertilizer.count();
  if (index !== count - 1 || count <= 1) return res.status(400).json({ error: 'only the last item can be deleted' });
  const levels = await prisma.adminLevel.findMany();
  await prisma.$transaction([
    prisma.adminFertilizer.delete({ where: { index } }),
    prisma.adminLevel.updateMany({ where: { fertCorrectIdx: index }, data: { fertCorrectIdx: 0 } }),
    ...levels
      .filter((l) => Array.isArray(l.fertOrder) && l.fertOrder.includes(index))
      .map((l) =>
        prisma.adminLevel.update({
          where: { index: l.index },
          data: { fertOrder: l.fertOrder.filter((fi) => fi !== index) },
        })
      ),
  ]);
  res.json({ ok: true });
});

/* ---------------- reset ---------------- */
adminRouter.post('/reset', async (req, res) => {
  await prisma.$transaction([
    prisma.adminLevel.deleteMany(),
    prisma.adminCareMethod.deleteMany(),
    prisma.adminFertilizer.deleteMany(),
  ]);
  const levels = buildDefaultLevels();
  await prisma.$transaction([
    ...levels.map((lvl) => prisma.adminLevel.create({ data: lvl })),
    ...DEFAULT_CARE_METHODS.map((text, index) => prisma.adminCareMethod.create({ data: { index, text } })),
    ...DEFAULT_FERTILIZERS.map((f, index) => prisma.adminFertilizer.create({ data: { index, ...f } })),
  ]);
  res.json({ ok: true });
});
