// special characters sold in the shop: permanent, each adds a daily point
// bonus (claimed once per day from the collection screen). Prices/bonuses
// mirror server/src/characters.js, which is authoritative for logged-in
// players. `img` is the clay-toy art (prompts in docs/art/prompts/todo/char__*.txt);
// `emoji` is only a fallback if the image fails to load.
export const CHARACTERS = [
  { id: 'worm', img: '/characters/worm.webp', emoji: '🪱', name: 'ไส้เดือนนักพรวนดิน', price: 2500, bonus: 8, color: '#F7A6B5', desc: 'ช่วยพรวนดินให้ร่วนซุย อากาศและน้ำซึมผ่านได้ดี' },
  { id: 'soil-doctor', img: '/characters/soil-doctor.webp', emoji: '👨‍⚕️', name: 'หมอดินอาสา', price: 3000, bonus: 10, color: '#8FD3FF', desc: 'อาสาสมัครกรมพัฒนาที่ดิน ช่วยตรวจและแนะนำการดูแลดิน' },
  { id: 'scientist', img: '/characters/scientist.webp', emoji: '🧑‍🔬', name: 'นักวิทยาศาสตร์ดิน', price: 4000, bonus: 15, color: '#B9F0C8', desc: 'วิเคราะห์ค่า pH และธาตุอาหารในดินจากห้องแล็บ' },
  { id: 'sage', img: '/characters/sage.webp', emoji: '👩‍🌾', name: 'ปราชญ์ชาวบ้าน', price: 5000, bonus: 20, color: '#FFE08A', desc: 'ภูมิปัญญาท้องถิ่น รู้จักดินและฤดูกาลเพาะปลูก' },
  { id: 'surveyor', img: '/characters/surveyor.webp', emoji: '🧭', name: 'นักสำรวจดิน', price: 6000, bonus: 25, color: '#FFC08A', desc: 'ออกสำรวจทำแผนที่ชุดดินทั่วประเทศ' },
  { id: 'drone', img: '/characters/drone.webp', emoji: '🚁', name: 'โดรนเกษตรอัจฉริยะ', price: 8000, bonus: 35, color: '#D7B8FF', desc: 'บินสำรวจแปลงและพ่นปุ๋ยได้แม่นยำ' },
];

export const characterById = (id) => CHARACTERS.find((c) => c.id === id);
export const dailyBonusOf = (ownedIds) => ownedIds.reduce((sum, id) => sum + (characterById(id)?.bonus || 0), 0);

// today's date in Thailand as YYYY-MM-DD — same daily key the server uses
export function bangkokToday() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}
