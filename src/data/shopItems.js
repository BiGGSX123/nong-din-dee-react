// shop catalog shown in the UI. Prices mirror server/src/shopItems.js, which is
// the source of truth for logged-in players (guests just use these locally).
// `modes` = where the item can be used: 'map' (level quiz) / 'tf' (ถูกหรือผิด).
export const SHOP_ITEMS = [
  {
    id: 'time', icon: '⏱️', img: '/icons/shop/time.webp', name: 'เพิ่มเวลา', price: 30, modes: ['map', 'tf'],
    desc: 'เพิ่มเวลา +10 วินาที ในข้อที่กำลังตอบ',
  },
  {
    id: 'fifty', icon: '💡', img: '/icons/shop/fifty.webp', name: 'ตัดตัวเลือกผิด', price: 40, modes: ['map'],
    desc: 'ซ่อนตัวเลือกที่ผิดไปครึ่งหนึ่ง (ใช้ในด่านแผนที่)',
  },
  {
    id: 'double', icon: '✨', img: '/icons/shop/double.webp', name: 'แต้ม x2', price: 80, modes: ['map', 'tf'],
    desc: 'แต้มของด่านหรือรอบถูก/ผิดที่กำลังเล่นคูณ 2',
  },
];

export const itemById = (id) => SHOP_ITEMS.find((i) => i.id === id);
export const TIME_BONUS_MS = 10000;
