// special characters sold in the shop — owned forever, each pays a daily point
// bonus (claimed once per Bangkok calendar day). Server prices/bonuses are the
// ones that count; mirrors CHARACTERS in src/data/characters.js (which adds
// names/art for the UI).
export const CHARACTERS = {
  worm: { price: 2500, bonus: 8 },
  'soil-doctor': { price: 3000, bonus: 10 },
  scientist: { price: 4000, bonus: 15 },
  sage: { price: 5000, bonus: 20 },
  surveyor: { price: 6000, bonus: 25 },
  drone: { price: 8000, bonus: 35 },
};

// today's date in Thailand as YYYY-MM-DD (the daily-claim key)
export function bangkokToday() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}
