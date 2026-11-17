export const SOIL = [
  { id: 'lowland-clay', nameTh: 'ดินเหนียวที่ราบลุ่ม', img: '/soil/02-lowland-clay.webp' },
  { id: 'vertisol', nameTh: 'ดินเหนียวจัด / ดินสีดำ', img: '/soil/03-vertisol.webp' },
  { id: 'sandy-loam', nameTh: 'ดินร่วนปนทราย / ที่ดอน', img: '/soil/04-sandy-loam.webp' },
  { id: 'sandy', nameTh: 'ดินทรายจัด', img: '/soil/05-sandy.webp' },
  { id: 'acid-sulfate', nameTh: 'ดินเปรี้ยวจัด', img: '/soil/06-acid-sulfate.webp' },
  { id: 'saline', nameTh: 'ดินเค็ม', img: '/soil/07-saline.webp' },
  { id: 'skeletal', nameTh: 'ดินตื้น / ลูกรัง', img: '/soil/08-skeletal.webp' },
];

export const CROPS = [
  { id: 'rice', nameTh: 'ข้าว', img: '/crops/01-rice.webp', base: 80 },
  { id: 'rubber', nameTh: 'ยางพารา', img: '/crops/02-rubber.webp', base: 120 },
  { id: 'cassava', nameTh: 'มันสำปะหลัง', img: '/crops/03-cassava.webp', base: 60 },
  { id: 'sugarcane', nameTh: 'อ้อยโรงงาน', img: '/crops/04-sugarcane.webp', base: 70 },
  { id: 'corn', nameTh: 'ข้าวโพด', img: '/crops/05-corn.webp', base: 65 },
  { id: 'oil-palm', nameTh: 'ปาล์มน้ำมัน', img: '/crops/06-oil-palm.webp', base: 150 },
  { id: 'coffee', nameTh: 'กาแฟ', img: '/crops/07-coffee.webp', base: 110 },
  { id: 'coconut', nameTh: 'มะพร้าว', img: '/crops/08-coconut.webp', base: 90 },
  { id: 'durian', nameTh: 'ทุเรียน', img: '/crops/09-durian.webp', base: 200 },
  { id: 'mangosteen', nameTh: 'มังคุด', img: '/crops/10-mangosteen.webp', base: 180 },
  { id: 'longan', nameTh: 'ลำไย', img: '/crops/11-longan.webp', base: 150 },
  { id: 'mango', nameTh: 'มะม่วง', img: '/crops/12-mango.webp', base: 130 },
  { id: 'pineapple', nameTh: 'สับปะรด', img: '/crops/13-pineapple.webp', base: 70 },
  { id: 'pomelo', nameTh: 'ส้มโอ', img: '/crops/14-pomelo.webp', base: 140 },
  { id: 'banana', nameTh: 'กล้วย', img: '/crops/16-banana.webp', base: 50 },
  { id: 'chili', nameTh: 'พริก', img: '/crops/15-chili.webp', base: 90 },
  { id: 'garlic', nameTh: 'กระเทียม', img: '/crops/17-garlic.webp', base: 100 },
  { id: 'shallot', nameTh: 'หอมแดง', img: '/crops/18-shallot.webp', base: 110 },
  { id: 'leafy-greens', nameTh: 'พืชตระกูลกะหล่ำ / ผักใบ', img: '/crops/19-leafy-greens.webp', base: 40 },
  { id: 'legumes', nameTh: 'พืชตระกูลถั่ว', img: '/crops/20-legumes.webp', base: 55 },
];

// note: default care-method/fertilizer text and the soil→crop/care/fert
// correctness mappings used to live here too, but level generation is now
// owned by the server (server/src/defaults.js) and fetched via useGameConfig()

export const PROVINCES = [
  'กรุงเทพมหานคร', 'กระบี่', 'กาญจนบุรี', 'กาฬสินธุ์', 'กำแพงเพชร', 'ขอนแก่น', 'จันทบุรี', 'ฉะเชิงเทรา', 'ชลบุรี', 'ชัยนาท',
  'ชัยภูมิ', 'ชุมพร', 'เชียงราย', 'เชียงใหม่', 'ตรัง', 'ตราด', 'ตาก', 'นครนายก', 'นครปฐม', 'นครพนม',
  'นครราชสีมา', 'นครศรีธรรมราช', 'นครสวรรค์', 'นนทบุรี', 'นราธิวาส', 'น่าน', 'บึงกาฬ', 'บุรีรัมย์', 'ปทุมธานี', 'ประจวบคีรีขันธ์',
  'ปราจีนบุรี', 'ปัตตานี', 'พระนครศรีอยุธยา', 'พะเยา', 'พังงา', 'พัทลุง', 'พิจิตร', 'พิษณุโลก', 'เพชรบุรี', 'เพชรบูรณ์',
  'แพร่', 'ภูเก็ต', 'มหาสารคาม', 'มุกดาหาร', 'แม่ฮ่องสอน', 'ยโสธร', 'ยะลา', 'ร้อยเอ็ด', 'ระนอง', 'ระยอง',
  'ราชบุรี', 'ลพบุรี', 'ลำปาง', 'ลำพูน', 'เลย', 'ศรีสะเกษ', 'สกลนคร', 'สงขลา', 'สตูล', 'สมุทรปราการ',
  'สมุทรสงคราม', 'สมุทรสาคร', 'สระแก้ว', 'สระบุรี', 'สิงห์บุรี', 'สุโขทัย', 'สุพรรณบุรี', 'สุราษฎร์ธานี', 'สุรินทร์', 'หนองคาย',
  'หนองบัวลำภู', 'อ่างทอง', 'อำนาจเจริญ', 'อุดรธานี', 'อุตรดิตถ์', 'อุทัยธานี', 'อุบลราชธานี',
];

export function soilById(id) { return SOIL.find((s) => s.id === id); }
export function cropById(id) { return CROPS.find((c) => c.id === id); }
