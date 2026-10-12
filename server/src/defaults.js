// default game content — mirrors src/data/*.js in the frontend package.
// Duplicated intentionally: this server has its own module boundary and no
// build step that could import across the two npm packages.
const SOIL_IDS = ['lowland-clay', 'vertisol', 'sandy-loam', 'sandy', 'acid-sulfate', 'saline', 'skeletal'];

const CROPS = [
  { id: 'rice', base: 80 },
  { id: 'rubber', base: 120 },
  { id: 'cassava', base: 60 },
  { id: 'sugarcane', base: 70 },
  { id: 'corn', base: 65 },
  { id: 'oil-palm', base: 150 },
  { id: 'coffee', base: 110 },
  { id: 'coconut', base: 90 },
  { id: 'durian', base: 200 },
  { id: 'mangosteen', base: 180 },
  { id: 'longan', base: 150 },
  { id: 'mango', base: 130 },
  { id: 'pineapple', base: 70 },
  { id: 'pomelo', base: 140 },
  { id: 'banana', base: 50 },
  { id: 'chili', base: 90 },
  { id: 'garlic', base: 100 },
  { id: 'shallot', base: 110 },
  { id: 'leafy-greens', base: 40 },
  { id: 'legumes', base: 55 },
];

export const DEFAULT_CARE_METHODS = [
  'ใส่อินทรียวัตถุ (ปุ๋ยคอก/เศษพืช) ร่วมกับยิปซัม',
  'ใส่ปุ๋ยหมัก หรือปุ๋ยคอก',
  'ใส่ปูนขาว หินปูนฝุ่น หรือปูนมาร์ล',
  'เติมปุ๋ยเคมีธาตุอาหารรอง (ฟอสฟอรัส/โพแทสเซียม)',
  'ใส่ยิปซัม (Gypsum)',
  'ใส่ปุ๋ยหมักและปุ๋ยคอกปริมาณมาก',
  'ปลูกหญ้าแฝกตามแนวระดับ ทำขั้นบันไดดิน',
  'ใช้ไถหัวหมู/ไถระเบิดดินดาน (Subsoiler)',
];
const SOIL_CARE_CORRECT = {
  'lowland-clay': 0, vertisol: 0, 'sandy-loam': 1,
  sandy: 1, 'acid-sulfate': 2, saline: 4, skeletal: 5,
};
const SOIL_CROP_CORRECT = {
  'lowland-clay': 'rice', vertisol: 'corn', 'sandy-loam': 'rubber',
  sandy: 'coconut', 'acid-sulfate': 'coconut', saline: 'coconut', skeletal: 'rubber',
};

export const DEFAULT_FERTILIZERS = [
  { label: 'ปุ๋ยอินทรีย์', sub: 'ปุ๋ยคอก / ปุ๋ยหมัก' },
  { label: 'สูตรเสมอ 15-15-15', sub: 'บำรุงทั่วไป' },
  { label: 'ไนโตรเจนสูง 46-0-0', sub: 'เร่งใบ เร่งลำต้น' },
  { label: 'โพแทสเซียมสูง 0-0-60', sub: 'เร่งผล เพิ่มคุณภาพผลผลิต' },
];
// evenly split 5/5/5/5 across the 4 fertilizers by growth pattern: idx0
// organic for bulb/legume crops, idx1 balanced for routine plantation/tree
// crops, idx2 nitrogen-high for leaf/stem/grain crops, idx3 potassium-high
// for the classic fruit-quality trees
const CROP_FERT_CORRECT = {
  garlic: 0, shallot: 0, chili: 0, pineapple: 0, legumes: 0,
  rubber: 1, 'oil-palm': 1, coffee: 1, coconut: 1, pomelo: 1,
  rice: 2, corn: 2, sugarcane: 2, cassava: 2, 'leafy-greens': 2,
  durian: 3, mangosteen: 3, longan: 3, mango: 3, banana: 3,
};

const PROVINCES = [
  'กรุงเทพมหานคร', 'กระบี่', 'กาญจนบุรี', 'กาฬสินธุ์', 'กำแพงเพชร', 'ขอนแก่น', 'จันทบุรี', 'ฉะเชิงเทรา', 'ชลบุรี', 'ชัยนาท',
  'ชัยภูมิ', 'ชุมพร', 'เชียงราย', 'เชียงใหม่', 'ตรัง', 'ตราด', 'ตาก', 'นครนายก', 'นครปฐม', 'นครพนม',
  'นครราชสีมา', 'นครศรีธรรมราช', 'นครสวรรค์', 'นนทบุรี', 'นราธิวาส', 'น่าน', 'บึงกาฬ', 'บุรีรัมย์', 'ปทุมธานี', 'ประจวบคีรีขันธ์',
  'ปราจีนบุรี', 'ปัตตานี', 'พระนครศรีอยุธยา', 'พะเยา', 'พังงา', 'พัทลุง', 'พิจิตร', 'พิษณุโลก', 'เพชรบุรี', 'เพชรบูรณ์',
  'แพร่', 'ภูเก็ต', 'มหาสารคาม', 'มุกดาหาร', 'แม่ฮ่องสอน', 'ยโสธร', 'ยะลา', 'ร้อยเอ็ด', 'ระนอง', 'ระยอง',
  'ราชบุรี', 'ลพบุรี', 'ลำปาง', 'ลำพูน', 'เลย', 'ศรีสะเกษ', 'สกลนคร', 'สงขลา', 'สตูล', 'สมุทรปราการ',
  'สมุทรสงคราม', 'สมุทรสาคร', 'สระแก้ว', 'สระบุรี', 'สิงห์บุรี', 'สุโขทัย', 'สุพรรณบุรี', 'สุราษฎร์ธานี', 'สุรินทร์', 'หนองคาย',
  'หนองบัวลำภู', 'อ่างทอง', 'อำนาจเจริญ', 'อุดรธานี', 'อุตรดิตถ์', 'อุทัยธานี', 'อุบลราชธานี',
];

function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function shuffle(arr, rng) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function buildDefaultLevels() {
  return PROVINCES.map((province, i) => {
    const rng = mulberry32(i * 7919 + 13);
    const soilId = SOIL_IDS[Math.floor(rng() * SOIL_IDS.length)];
    const correctCropId = SOIL_CROP_CORRECT[soilId];
    const distractorPool = CROPS.filter((c) => c.id !== correctCropId).map((c) => c.id);
    const cropChoices = shuffle([correctCropId, ...shuffle(distractorPool, rng).slice(0, 3)], rng);
    const fertOrder = shuffle([0, 1, 2, 3], rng);
    return {
      index: i,
      province,
      soilId,
      careCorrectIdx: SOIL_CARE_CORRECT[soilId],
      cropChoices,
      cropCorrectId: correctCropId,
      fertOrder,
      fertCorrectIdx: CROP_FERT_CORRECT[correctCropId],
    };
  });
}
