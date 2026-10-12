// reference data for the Knowledge screen, transcribed from the Land
// Development Department source sheet:
// https://docs.google.com/spreadsheets/d/1Z7NxMXGnDBQhoIzpSsaxa6Bpv6Nio7zKlNHdhbQ5Ayg
//
// kept separate from src/data/content.js on purpose: content.js drives level
// generation (the 10 crops wired into levels, the 7 playable soils), while
// this file is reference material sourced from the sheet — it covers all 20
// crops (10 of which aren't playable yet) and still mentions "ดินร่วน /
// ดินตะกอนลำน้ำ" (loam) even though that soil was removed from gameplay,
// because it's real agricultural knowledge, not a game selection.
// getSuitabilityTier() below is also used by QuizScreen to grade the "which
// crop should you plant" question against this same real-world data, instead
// of only accepting the one crop hardcoded as SOIL_CROP_CORRECT server-side

// short label for every soil the sheet discusses, including loam (no game
// icon for it anymore, so it's rendered as a plain text tag, not an image)
export const SOIL_LABELS = {
  loam: 'ดินร่วน / ตะกอนลำน้ำ',
  'lowland-clay': 'ดินเหนียวที่ราบลุ่ม',
  vertisol: 'ดินเหนียวจัด / สีดำ',
  'sandy-loam': 'ดินร่วนปนทราย / ที่ดอน',
  sandy: 'ดินทรายจัด',
  'acid-sulfate': 'ดินเปรี้ยวจัด',
  saline: 'ดินเค็ม',
  skeletal: 'ดินตื้น / ลูกรัง',
};

// cropId -> recommended fertilizer index — mirrors CROP_FERT_CORRECT in
// server/src/defaults.js (same intentional duplication as the rest of that
// file: this package has its own module boundary). Evenly split 5/5/5/5 by
// growth pattern: idx0 organic for bulb/legume crops, idx1 balanced for
// routine plantation/tree crops, idx2 nitrogen-high for leaf/stem/grain
// crops, idx3 potassium-high for the classic fruit-quality trees
export const CROP_FERT_CORRECT = {
  garlic: 0, shallot: 0, chili: 0, pineapple: 0, legumes: 0,
  rubber: 1, 'oil-palm': 1, coffee: 1, coconut: 1, pomelo: 1,
  rice: 2, corn: 2, sugarcane: 2, cassava: 2, 'leafy-greens': 2,
  durian: 3, mangosteen: 3, longan: 3, mango: 3, banana: 3,
};

// general agronomy reference for each of the 4 default fertilizers, index-
// aligned with DEFAULT_FERTILIZERS (server/src/defaults.js) / the
// `fertilizers` prop — the LDD sheet has no fertilizer table at all, so this
// is standard agricultural knowledge, not sheet-sourced like the rest of
// this file; a custom fertilizer added past index 3 in the admin panel just
// won't have an entry here and the extra detail is skipped for it
export const FERTILIZER_DETAILS = [
  {
    npk: 'อินทรียวัตถุจากธรรมชาติ',
    desc: 'ได้จากมูลสัตว์ ซากพืช หรือเศษอินทรีย์ที่หมักแล้ว ช่วยปรับโครงสร้างดินให้ร่วนซุย เพิ่มจุลินทรีย์และอินทรียวัตถุในดิน ปลดปล่อยธาตุอาหารช้าแต่สม่ำเสมอ เหมาะใช้รองพื้นก่อนปลูกหรือฟื้นฟูดินเสื่อมโทรม',
  },
  {
    npk: 'N-P-K 15-15-15',
    desc: 'ปุ๋ยเคมีสูตรเสมอ ให้ไนโตรเจน ฟอสฟอรัส และโพแทสเซียมในสัดส่วนเท่ากัน เหมาะบำรุงพืชทั่วไปตลอดฤดูปลูก ใช้ได้กับพืชแทบทุกชนิดเมื่อยังไม่ทราบว่าขาดธาตุใดเป็นพิเศษ',
  },
  {
    npk: 'N-P-K 46-0-0 (ยูเรีย)',
    desc: 'ให้ไนโตรเจนสูงเป็นพิเศษ กระตุ้นการเจริญเติบโตของใบและลำต้น เหมาะกับพืชช่วงแตกกอ/สร้างใบ เช่น ข้าว ข้าวโพด อ้อยในระยะแรก ไม่ควรใส่มากช่วงออกดอกเพราะจะทำให้ใบดกแต่ติดผลน้อย',
  },
  {
    npk: 'N-P-K 0-0-60',
    desc: 'ให้โพแทสเซียมสูง (โพแทสเซียมคลอไรด์ / มิวเรียนออฟโพแทช) ช่วยเร่งการสร้างดอกและผล เพิ่มความหวานและคุณภาพผลผลิต รวมถึงเพิ่มความต้านทานโรค เหมาะใส่ช่วงพืชออกดอกติดผล',
  },
];

// the "ปัญหาของดิน" column from the sheet's problem->remedy table, in the
// same order as DEFAULT_CARE_METHODS (server/src/defaults.js) so index i here
// is the problem that remedy i (careMethods[i], badge letter A+i) fixes
export const CARE_PROBLEM_LABELS = [
  'ดินเหนียวที่ราบลุ่ม / ดินเหนียวจัด (Lowland Clay & Vertisols)',
  'ดินทรายจัด / ดินร่วนปนทราย (Sandy Soils)',
  'ดินเปรี้ยวจัด / ดินกรดจัด (Acid Sulfate Soils)',
  'ดินพรุ / ดินอินทรีย์ (Peat / Organic Soils)',
  'ดินเค็ม (Saline Soils)',
  'ดินตื้น / ดินปนกรวดศิลาแลง',
  'ดินบนพื้นที่ลาดชันสูง / พื้นที่ภูเขา (Slope Complex)',
  'ดินดาน (Skeletal & Hardpan Soils)',
];

// each of the 8 standard soil-problem categories, mapped to the index of its
// remedy in DEFAULT_CARE_METHODS (server/src/defaults.js) / the "วิธีดูแล/
// ปรับปรุงดิน" panel above — lets the soil panel show which lettered remedy
// (A-H) applies to each soil, instead of duplicating the remedy text
const PROBLEM_CARE_IDX = {
  'ดินเหนียวจัด / ดินขยายตัว': 0,
  'ดินทรายจัด': 1,
  'ดินเปรี้ยวจัด / ดินกรดจัด': 2,
  'ดินพรุ / ดินอินทรีย์': 3,
  'ดินเค็ม': 4,
  'ดินตื้น / ดินปนกรวดศิลาแลง / ดินปนหิน': 5,
  'ดินบนพื้นที่ลาดชันสูง / พื้นที่ภูเขา': 6,
  'ดินดาน / ชั้นดานแข็ง': 7,
};

// soilId -> the problem categories that soil is prone to (a soil can share
// problems with other named categories, e.g. sandy loam can also develop a
// hardpan) — each problem is paired with its remedy letter via PROBLEM_CARE_IDX
const RAW_SOIL_PROBLEMS = {
  loam: ['ดินดาน / ชั้นดานแข็ง', 'ดินบนพื้นที่ลาดชันสูง / พื้นที่ภูเขา'],
  'lowland-clay': ['ดินเหนียวจัด / ดินขยายตัว', 'ดินเปรี้ยวจัด / ดินกรดจัด', 'ดินพรุ / ดินอินทรีย์', 'ดินเค็ม'],
  vertisol: ['ดินเหนียวจัด / ดินขยายตัว', 'ดินดาน / ชั้นดานแข็ง'],
  'sandy-loam': ['ดินทรายจัด', 'ดินตื้น / ดินปนกรวดศิลาแลง / ดินปนหิน', 'ดินดาน / ชั้นดานแข็ง', 'ดินบนพื้นที่ลาดชันสูง / พื้นที่ภูเขา'],
  sandy: ['ดินทรายจัด', 'ดินเค็ม', 'ดินบนพื้นที่ลาดชันสูง / พื้นที่ภูเขา'],
  'acid-sulfate': ['ดินเปรี้ยวจัด / ดินกรดจัด', 'ดินเหนียวจัด / ดินขยายตัว', 'ดินพรุ / ดินอินทรีย์'],
  saline: ['ดินเค็ม', 'ดินเหนียวจัด / ดินขยายตัว', 'ดินทรายจัด'],
  skeletal: ['ดินตื้น / ดินปนกรวดศิลาแลง / ดินปนหิน', 'ดินทรายจัด', 'ดินบนพื้นที่ลาดชันสูง / พื้นที่ภูเขา'],
};

export const SOIL_PROBLEMS = Object.fromEntries(
  Object.entries(RAW_SOIL_PROBLEMS).map(([soilId, problems]) => [
    soilId,
    problems.map((label) => ({ label, careIdx: PROBLEM_CARE_IDX[label] })),
  ]),
);

// cropId -> soil suitability (best / moderate / poor), each a list of soilIds
// — cropId/img match public/crops/{NN-slug}.png; nameTh/img cover all 20
// crops from the sheet even though only the first 10 are wired into
// src/data/content.js CROPS (playable levels) so far
export const CROP_KNOWLEDGE = [
  { id: 'rice', nameTh: 'ข้าว', img: '/crops/01-rice.png', best: ['lowland-clay'], moderate: ['vertisol', 'acid-sulfate', 'saline'], poor: ['loam', 'sandy-loam', 'sandy', 'skeletal'] },
  { id: 'rubber', nameTh: 'ยางพารา', img: '/crops/02-rubber.png', best: ['sandy-loam'], moderate: ['loam', 'sandy', 'skeletal'], poor: ['lowland-clay', 'vertisol', 'acid-sulfate', 'saline'] },
  { id: 'cassava', nameTh: 'มันสำปะหลัง', img: '/crops/03-cassava.png', best: ['sandy-loam'], moderate: ['loam', 'sandy', 'skeletal'], poor: ['lowland-clay', 'vertisol', 'acid-sulfate', 'saline'] },
  { id: 'sugarcane', nameTh: 'อ้อยโรงงาน', img: '/crops/04-sugarcane.png', best: ['loam', 'vertisol', 'sandy-loam'], moderate: ['lowland-clay', 'acid-sulfate', 'saline'], poor: ['sandy', 'skeletal'] },
  { id: 'corn', nameTh: 'ข้าวโพด', img: '/crops/05-corn.png', best: ['loam', 'vertisol', 'sandy-loam'], moderate: [], poor: ['lowland-clay', 'sandy', 'acid-sulfate', 'saline', 'skeletal'] },
  { id: 'oil-palm', nameTh: 'ปาล์มน้ำมัน', img: '/crops/06-oil-palm.png', best: ['sandy-loam'], moderate: ['loam', 'lowland-clay', 'sandy', 'acid-sulfate', 'saline'], poor: ['vertisol', 'skeletal'] },
  { id: 'coffee', nameTh: 'กาแฟ', img: '/crops/07-coffee.png', best: ['loam', 'sandy-loam'], moderate: [], poor: ['lowland-clay', 'vertisol', 'sandy', 'acid-sulfate', 'saline', 'skeletal'] },
  { id: 'coconut', nameTh: 'มะพร้าว', img: '/crops/08-coconut.png', best: ['loam', 'sandy-loam', 'sandy', 'saline'], moderate: ['lowland-clay', 'vertisol', 'acid-sulfate', 'skeletal'], poor: [] },
  { id: 'durian', nameTh: 'ทุเรียน', img: '/crops/09-durian.png', best: ['loam'], moderate: [], poor: ['lowland-clay', 'vertisol', 'sandy-loam', 'sandy', 'acid-sulfate', 'saline', 'skeletal'] },
  { id: 'mangosteen', nameTh: 'มังคุด', img: '/crops/10-mangosteen.png', best: ['loam'], moderate: [], poor: ['lowland-clay', 'vertisol', 'sandy-loam', 'sandy', 'acid-sulfate', 'saline', 'skeletal'] },
  { id: 'longan', nameTh: 'ลำไย', img: '/crops/11-longan.png', best: ['loam'], moderate: ['sandy-loam'], poor: ['lowland-clay', 'vertisol', 'sandy', 'acid-sulfate', 'saline', 'skeletal'] },
  { id: 'mango', nameTh: 'มะม่วง', img: '/crops/12-mango.png', best: ['loam', 'sandy-loam'], moderate: ['vertisol', 'sandy', 'skeletal'], poor: ['acid-sulfate', 'saline'] },
  { id: 'pineapple', nameTh: 'สับปะรด', img: '/crops/13-pineapple.png', best: ['sandy-loam', 'acid-sulfate'], moderate: ['loam', 'sandy', 'skeletal'], poor: ['lowland-clay', 'vertisol', 'saline'] },
  { id: 'pomelo', nameTh: 'ส้มโอ', img: '/crops/14-pomelo.png', best: ['loam'], moderate: ['lowland-clay', 'vertisol', 'acid-sulfate'], poor: ['sandy-loam', 'sandy', 'saline', 'skeletal'] },
  { id: 'banana', nameTh: 'กล้วย', img: '/crops/16-banana.png', best: ['loam'], moderate: ['lowland-clay', 'vertisol', 'sandy-loam', 'acid-sulfate'], poor: ['sandy', 'saline', 'skeletal'] },
  { id: 'chili', nameTh: 'พริก', img: '/crops/15-chili.png', best: ['loam'], moderate: ['sandy-loam'], poor: ['lowland-clay', 'vertisol', 'sandy', 'acid-sulfate', 'saline', 'skeletal'] },
  { id: 'garlic', nameTh: 'กระเทียม', img: '/crops/17-garlic.png', best: ['loam'], moderate: ['sandy-loam'], poor: ['lowland-clay', 'vertisol', 'sandy', 'acid-sulfate', 'saline', 'skeletal'] },
  { id: 'shallot', nameTh: 'หอมแดง', img: '/crops/18-shallot.png', best: ['loam'], moderate: ['sandy-loam'], poor: ['lowland-clay', 'vertisol', 'sandy', 'acid-sulfate', 'saline', 'skeletal'] },
  { id: 'leafy-greens', nameTh: 'พืชตระกูลกะหล่ำ / ผักใบ', img: '/crops/19-leafy-greens.png', best: ['loam'], moderate: ['lowland-clay', 'vertisol', 'sandy-loam'], poor: ['sandy', 'acid-sulfate', 'saline', 'skeletal'] },
  { id: 'legumes', nameTh: 'พืชตระกูลถั่ว', img: '/crops/20-legumes.png', best: ['loam', 'sandy-loam'], moderate: ['vertisol'], poor: ['lowland-clay', 'sandy', 'acid-sulfate', 'saline', 'skeletal'] },
];

// 2 = best, 1 = moderate, 0 = poor/unlisted — used to grade the quiz's "which
// crop should you plant" question against the real suitability data instead
// of a single hardcoded answer, since more than one crop is often genuinely
// suitable for the same soil (see SOIL_CROP_CORRECT in server/src/defaults.js,
// which only ever names one)
export function getSuitabilityTier(cropId, soilId) {
  const crop = CROP_KNOWLEDGE.find((c) => c.id === cropId);
  if (!crop) return 0;
  if (crop.best.includes(soilId)) return 2;
  if (crop.moderate.includes(soilId)) return 1;
  return 0;
}
