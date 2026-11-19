import { useState } from 'react';
import { createPortal } from 'react-dom';
import StarIcon from './StarIcon';
import { PROVINCES } from '../data/content';
import Dropdown from './Dropdown';

// first-run welcome popup, four pages:
//   1) "มาผจญภัยกัน!"   the adventure pitch                → "ถัดไป"
//   2) "จังหวัดของคุณ"  pick a home province (= level 1);  → "ถัดไป" saves it
//                        via onChooseProvince (a promise) and waits for it
//   3) "วิธีเล่น"         how to play (3 steps)             → "เข้าใจแล้ว!"
//   4) "แลกของรางวัล"    points → items/characters/prizes  → "เริ่มผจญภัย!"
// mode="tf" (the ⓘ on the ถูก/ผิด screen) shows that mode's how-to pages
// instead; it can be closed any time (✕ / tap outside) and ends with "ปิด".
// The mascot pops out of the card over a sunburst, a different pose per page.
const icon = (src) => <img src={src} alt="" />;

const PAGES = [
  {
    key: 'intro',
    title: 'มาผจญภัยกัน!',
    mascot: '/mascot/nong-din-dee.webp',
    lead: <>มาผจญภัยดูแลดินทั่วไทยไปกับ <b>น้องดินดี</b> กันนะ แต่ละด่านสุ่มชุดดินให้ ตอบให้ถูกว่าควรดูแลดิน ปลูกอะไร ใส่ปุ๋ยแบบไหน</>,
    button: 'ถัดไป',
  },
  {
    key: 'province',
    title: 'จังหวัดของคุณ',
    mascot: '/mascot/nong-din-dee-thinking.webp',
    button: 'ถัดไป',
  },
  {
    key: 'howto',
    title: 'วิธีเล่น',
    mascot: '/mascot/nong-din-dee-point.webp',
    steps: [
      { key: 'tap', icon: icon('/icons/ui/pin.webp'), text: <>แตะที่<b>ด่าน</b>ในหน้าผจญภัยเพื่อเริ่มเล่น</> },
      { key: 'star', icon: <StarIcon filled />, text: <>ตอบคำถาม 3 ข้อ ยิ่งถูกเยอะ ยิ่งได้<b>ดาว</b>เยอะ</> },
      { key: 'book', icon: icon('/icons/ui/book.webp'), text: <>อยากรู้เรื่องดิน พืช ปุ๋ย แตะแท็บ<b>ความรู้</b>ด้านล่าง</> },
    ],
    button: 'เข้าใจแล้ว!',
  },
  {
    key: 'shop',
    title: 'แลกของรางวัล',
    mascot: '/mascot/nong-din-dee-cheer.webp',
    steps: [
      { key: 'points', icon: icon('/icons/shop/points.webp'), text: <>ตอบถูกได้<b>เหรียญ</b> สะสมไว้ใช้ที่ร้านค้า</> },
      { key: 'items', icon: icon('/icons/shop/time.webp'), text: <>แลก<b>ไอเทม</b>ช่วยตอบ เช่น เพิ่มเวลา ตัดตัวเลือกผิด เหรียญ x2</> },
      { key: 'chars', icon: icon('/characters/worm.webp'), text: <>ซื้อ<b>ตัวละครพิเศษ</b> รับเหรียญเพิ่มทุกวัน</> },
      { key: 'prizes', icon: icon('/icons/ui/gift.webp'), text: <>สะสมเหรียญแลก<b>ของรางวัลจริง</b> เช่น หมวก เสื้อน้องดินดี</> },
    ],
    button: 'เริ่มผจญภัย!',
  },
];

// ถูก/ผิด how-to (numbers mirror TF_LEVELS / TF_ROUND_SIZE in lib/tfQuestions)
const tfMini = <span className="tf-mini" aria-hidden="true"><b>✓</b><b>✗</b></span>;
const TF_PAGES = [
  {
    key: 'tf-howto',
    title: 'วิธีเล่น ถูก หรือ ผิด',
    mascot: '/mascot/nong-din-dee-thinking.webp',
    steps: [
      { key: 'read', icon: tfMini, text: <>อ่านข้อความเรื่องดิน พืช ปุ๋ย แล้วตอบว่า<b>ถูก</b>หรือ<b>ผิด</b></> },
      { key: 'time', icon: icon('/icons/shop/time.webp'), text: <>ตอบให้ทันเวลา รอบละ <b>10 ข้อ</b></> },
      { key: 'items', icon: icon('/icons/shop/double.webp'), text: <>ใช้ไอเทม<b>เพิ่มเวลา</b> หรือ<b>เหรียญ x2</b> จากร้านค้าช่วยได้</> },
    ],
    button: 'ถัดไป',
  },
  {
    key: 'tf-score',
    title: 'ระดับ & คอมโบ',
    mascot: '/mascot/nong-din-dee-point.webp',
    steps: [
      { key: 'easy', icon: icon('/icons/level/easy.webp'), text: <><b>ง่าย</b> ข้อละ 15 วินาที · ถูกได้ 1 เหรียญ</> },
      { key: 'medium', icon: icon('/icons/level/medium.webp'), text: <><b>กลาง</b> ข้อละ 10 วินาที · ถูกได้ 2 เหรียญ</> },
      { key: 'hard', icon: icon('/icons/level/hard.webp'), text: <><b>ยาก</b> ข้อละ 5 วินาที · ถูกได้ 3 เหรียญ</> },
      { key: 'combo', icon: icon('/icons/shop/combo.webp'), text: <>ตอบถูกติดกันได้<b>คอมโบ</b> โบนัส +1 +2 +3… เพิ่มทุกข้อ</> },
    ],
    button: 'ถัดไป',
  },
  {
    key: 'tf-survival',
    title: 'เอาตัวรอด',
    mascot: '/icons/shop/survival.webp',
    steps: [
      { key: 'hearts', icon: icon('/icons/shop/heart.webp'), text: <>มี <b>3 หัวใจ</b> ตอบผิดหรือหมดเวลา เสีย 1 หัวใจ</> },
      { key: 'pts', icon: icon('/icons/shop/points.webp'), text: <>ข้อละ 10 วินาที · ถูกได้ <b>2 เหรียญ</b></> },
      { key: 'combo', icon: icon('/icons/shop/combo.webp'), text: <>ตอบถูกติดกันได้<b>คอมโบ</b> โบนัส +1 +2 +3… เหมือนโหมดปกติ</> },
      { key: 'endless', icon: <StarIcon filled />, text: <>คำถามไม่จำกัด เล่นจนหัวใจหมด ทำ<b>สถิติ</b>ให้สูงสุด!</> },
    ],
    button: 'ปิด',
  },
];

// แผนที่ 77 จังหวัด how-to (the ⓘ on the map header) — numbers mirror
// QUIZ_TIME_MS (QuizScreen) and POINTS_PER_STAR / SPEED_BONUS_MAX (App)
const MAP_PAGES = [
  {
    key: 'map-howto',
    title: 'วิธีเล่น ผจญภัย',
    mascot: '/mascot/nong-din-dee-point.webp',
    steps: [
      { key: 'tap', icon: icon('/icons/ui/pin.webp'), text: <>แตะด่านที่มีธง<b>เล่นเลย!</b> เริ่มจากจังหวัดของคุณ</> },
      { key: 'q', icon: icon('/icons/ui/sprout.webp'), text: <>ด่านละ 3 ข้อ: <b>ดูแลดิน · เลือกพืช · ใส่ปุ๋ย</b></> },
      { key: 'time', icon: icon('/icons/shop/time.webp'), text: <>ข้อละ <b>30 วินาที</b> ตอบให้ทันเวลา</> },
      { key: 'pass', icon: icon('/icons/ui/map.webp'), text: <>ถูก <b>1 ข้อขึ้นไป</b>ผ่านด่าน ปลดล็อกจังหวัดถัดไป</> },
    ],
    button: 'ถัดไป',
  },
  {
    key: 'map-score',
    title: 'การคิดเหรียญ',
    mascot: '/mascot/nong-din-dee-cheer.webp',
    steps: [
      { key: 'star', icon: <StarIcon filled />, text: <>ตอบถูกได้ดาว <b>ดาวละ 20 เหรียญ</b> (สูงสุด 60)</> },
      { key: 'speed', icon: icon('/icons/shop/time.webp'), text: <>ตอบเร็วได้โบนัสสูงสุด <b>40 เหรียญ</b> ลดวินาทีละ 1 (นับเฉพาะข้อที่ถูก)</> },
      { key: 'x2', icon: icon('/icons/shop/double.webp'), text: <>ไอเทม<b>เหรียญ x2</b> คูณเหรียญทั้งด่าน</> },
      { key: 'best', icon: icon('/icons/ui/trophy.webp'), text: <>เล่นซ้ำได้ แต่ได้เหรียญเพิ่ม<b>เฉพาะส่วนที่เกินสถิติเดิม</b> ไม่เกินได้ +0</> },
    ],
    button: 'ปิด',
  },
];

export default function IntroModal({ onNext, onChooseProvince, mode = 'welcome' }) {
  const isHelp = mode !== 'welcome';
  const pages = mode === 'tf' ? TF_PAGES
    : mode === 'survival' ? TF_PAGES.filter((pg) => pg.key === 'tf-survival')
      : mode === 'map' ? MAP_PAGES
        : PAGES;
  const [page, setPage] = useState(0);
  const [province, setProvince] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const p = pages[page];
  const isLast = page === pages.length - 1;
  const goOn = () => (isLast ? onNext() : setPage(page + 1));

  function next() {
    if (p.key !== 'province') return goOn();
    setSaving(true);
    setSaveError(false);
    Promise.resolve(onChooseProvince?.(province))
      .then(goOn)
      .catch(() => setSaveError(true))
      .finally(() => setSaving(false));
  }

  const label = p.key === 'province' && saving ? 'กำลังบันทึก...' : isLast && isHelp ? 'ปิด' : isHelp ? 'ถัดไป' : p.button;
  const blocked = p.key === 'province' && (!province || saving);

  // portal to <body>: opened from inside a screen (ถูก/ผิด ⓘ) the overlay would
  // otherwise be trapped in that screen's transformed layer under HUD + nav
  return createPortal(
    <div className="intro-overlay" onClick={isHelp ? onNext : undefined}>
      <div className="intro-card welcome-card" role="dialog" aria-labelledby="welcome-title" onClick={(e) => e.stopPropagation()}>
        {isHelp && <button className="welcome-close" type="button" onClick={onNext} aria-label="ปิด">✕</button>}
        <div className="welcome-hero" aria-hidden="true">
          <div className="welcome-rays" />
          <img key={p.key} className="welcome-mascot" src={p.mascot} alt="" />
        </div>

        <div className="welcome-page" key={p.key}>
          <h2 id="welcome-title" className="welcome-ribbon"><span>{p.title}</span></h2>
          {p.lead && <p className="welcome-lead">{p.lead}</p>}
          {p.key === 'province' && (
            <div className="welcome-province">
              <p className="welcome-lead">เลือกจังหวัดที่คุณอยู่ ด่านแรกของคุณจะเริ่มที่จังหวัดนี้ แล้วค่อยผจญภัยต่อไปทั่วไทย</p>
              <Dropdown
                value={province}
                onChange={(v) => { setProvince(v); setSaveError(false); }}
                options={PROVINCES}
                icon={<img src="/icons/ui/home.webp" alt="" />}
                placeholder="เลือกจังหวัด..."
                searchable
                searchPlaceholder="พิมพ์ชื่อจังหวัด..."
                emptyText="ไม่พบจังหวัดนี้"
                ariaLabel="เลือกจังหวัด"
              />
              {province && !saveError && <div className="province-note">ด่านที่ 1 ของคุณ: <b>{province}</b></div>}
              {saveError && <div className="province-note err">บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง</div>}
            </div>
          )}
          {p.steps && (
            <ol className="welcome-steps">
              {p.steps.map((s, i) => (
                <li key={s.key} style={{ '--i': i }}>
                  <span className="welcome-step-icon">{s.icon}</span>
                  <span>{s.text}</span>
                </li>
              ))}
            </ol>
          )}
          <button className="btn welcome-start" type="button" onClick={next} disabled={blocked}>{label}</button>
          {page > 0 && <button className="welcome-back" type="button" disabled={saving} onClick={() => setPage(page - 1)}>‹ ย้อนกลับ</button>}
        </div>

        <div className="welcome-dots" aria-label={`หน้า ${page + 1} จาก ${pages.length}`}>
          {pages.map((pg, i) => <i key={pg.key} className={i === page ? 'on' : ''} />)}
        </div>
      </div>
    </div>,
    document.body,
  );
}
