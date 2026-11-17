// pick the clay icon for a soil-care method or fertilizer by KEYWORDS in its
// text (admins can edit/reorder these lists, so matching by index would
// drift). Order matters: the more specific rules come first. Returns null when
// nothing matches, so a new custom entry just shows no icon instead of a
// wrong one.
const CARE_RULES = [
  [/ยิปซัม.*(อินทรีย|ปุ๋ยคอก)|(อินทรีย|ปุ๋ยคอก).*ยิปซัม/, 'organic-gypsum'],
  [/ยิปซัม|gypsum/i, 'gypsum'],
  [/ปูน/, 'lime'],
  [/แฝก|ขั้นบันได/, 'vetiver'],
  [/ไถ|ดินดาน|subsoil/i, 'subsoiler'],
  [/ปริมาณมาก/, 'compost-lots'],
  [/เคมี|ฟอสฟอรัส|โพแทสเซียม/, 'chemical'],
  [/หมัก|ปุ๋ยคอก|อินทรีย/, 'compost'],
];

const FERT_RULES = [
  [/46-0-0|ไนโตรเจน|ยูเรีย/, 'nitrogen'],
  [/0-0-60|โพแทส/, 'potash'],
  [/15-15-15|เสมอ/, 'npk'],
  [/อินทรีย์|คอก|หมัก/, 'organic'],
];

function match(rules, text, dir) {
  const hit = rules.find(([re]) => re.test(text || ''));
  return hit ? `/icons/${dir}/${hit[1]}.webp` : null;
}

export const careIcon = (text) => match(CARE_RULES, text, 'care');
export const fertIcon = (fert) => match(FERT_RULES, `${fert?.label || ''} ${fert?.sub || ''}`, 'fert');
