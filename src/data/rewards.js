// real-world prizes players can redeem with points. Redemption isn't live yet:
// pressing "แลก" only shows an out-of-stock popup and never spends points
// (see ShopScreen). Edit names/prices here; set `inStock: true` once a real
// redemption flow (server + fulfilment) exists.
export const REWARDS = [
  { id: 'seeds', img: '/icons/reward/seeds.webp', name: 'ถุงเมล็ดพันธุ์ผัก', price: 5000, inStock: false },
  { id: 'compost', img: '/icons/reward/compost.webp', name: 'ปุ๋ยหมักอินทรีย์ 1 ถุง', price: 10000, inStock: false },
  { id: 'tote', img: '/icons/reward/tote.webp', name: 'กระเป๋าผ้าน้องดินดี', price: 15000, inStock: false },
  { id: 'cap', img: '/icons/reward/cap.webp', name: 'หมวกน้องดินดี', price: 20000, inStock: false },
  { id: 'tshirt', img: '/icons/reward/tshirt.webp', name: 'เสื้อยืดน้องดินดี', price: 30000, inStock: false },
  { id: 'soilkit', img: '/icons/reward/soilkit.webp', name: 'ชุดตรวจวิเคราะห์ดิน', price: 50000, inStock: false },
];
