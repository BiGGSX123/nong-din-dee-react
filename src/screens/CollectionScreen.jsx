import { useEffect, useRef, useState } from 'react';
import { CROPS, SOIL } from '../data/content';
import { CHARACTERS, dailyBonusOf } from '../data/characters';
import CharPortrait from '../components/CharPortrait';
import Sparkles from '../components/Sparkles';
import { playCoinShower } from '../lib/sound';

// a hand-stuck look: each sticker gets its own small fixed tilt (stable per
// slot, so it doesn't jiggle between renders)
const tilt = (i) => `${((i * 37) % 9) - 4}deg`;

export default function CollectionScreen({ levels, levelStatus, characters = [], dailyPending = 0, newStickerIds = [], onStickersSeen, onClaimDaily, onOpenShop, focusDaily = false, onFocusDone }) {
  // stickers that are new on THIS visit: snapshot on open (they keep their
  // NEW badge + pop-in while you look), then mark everything seen right away
  // so the nav dot clears and next visit they're ordinary stickers
  const [fresh] = useState(() => new Set(newStickerIds));
  useEffect(() => { onStickersSeen?.(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  // opened from "ไปรับเลย" on the ranking page: bring the daily-claim card
  // into view (the page otherwise keeps the old scroll position) + nudge it
  const dailyRef = useRef(null);
  const [nudge] = useState(focusDaily);
  useEffect(() => {
    if (!focusDaily) return;
    dailyRef.current?.scrollIntoView({ block: 'center' });
    onFocusDone?.();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  let popOrder = 0;
  const freshProps = (id) => (fresh.has(id) ? { isNew: true, delay: popOrder++ * 0.12 } : {});
  const [claiming, setClaiming] = useState(false);
  const [claimMsg, setClaimMsg] = useState(null);
  const dailyTotal = dailyBonusOf(characters);

  function claim() {
    if (claiming) return;
    setClaiming(true);
    onClaimDaily()
      .then((pts) => { playCoinShower(); setClaimMsg(`ได้รับ +${pts} เหรียญ!`); })
      .catch(() => setClaimMsg(null))
      .finally(() => setClaiming(false));
  }

  const discoveredCropIds = new Set(
    levelStatus.filter((s) => s.completed && s.stars >= 2 && s.pickedCropId).map((s) => s.pickedCropId)
  );
  const discoveredSoilIds = new Set(
    levels.filter((lvl, i) => levelStatus[i].completed && levelStatus[i].stars >= 2).map((lvl) => lvl.soilId)
  );
  const found = discoveredCropIds.size + discoveredSoilIds.size;
  const total = CROPS.length + SOIL.length;

  return (
    <>
      <h1>คลังสะสม</h1>
      <div className="lede">สมุดสติกเกอร์ของหนู — ผ่านด่านได้ 2 ดาวขึ้นไป จะได้สติกเกอร์พืชที่ปลูกและชุดดินของด่านนั้น</div>
      <div className="album-progress">
        <span>สะสมแล้ว <b>{found}</b>/{total}</span>
        <div className="album-progress-bar"><i style={{ width: `${(found / total) * 100}%` }} /></div>
      </div>

      <section ref={dailyRef} className={`daily-card ${characters.length && dailyPending <= 0 ? 'done' : ''} ${nudge ? 'nudge' : ''}`}>
        <div className="daily-chars" aria-hidden="true">
          {(characters.length ? CHARACTERS.filter((c) => characters.includes(c.id)) : CHARACTERS.slice(0, 3)).slice(0, 4).map((c) => (
            <CharPortrait key={c.id} ch={c} size={96} locked={!characters.length} variant="sticker" />
          ))}
        </div>
        {characters.length === 0 ? (
          <div className="daily-body">
            <b>เหรียญประจำวันจากตัวละครพิเศษ</b>
            <span>ซื้อตัวละครที่ร้านค้า แล้วกลับมารับเหรียญที่นี่ได้ทุกวัน</span>
            <button type="button" className="daily-btn shop" onClick={onOpenShop}><img src="/icons/shop/shop.webp" alt="" />ไปร้านค้า</button>
          </div>
        ) : dailyPending <= 0 ? (
          <div className="daily-body">
            <b>{claimMsg || 'รับเหรียญประจำวันแล้ว ✓'}</b>
            <span>กลับมารับ +{dailyTotal} เหรียญได้อีกครั้งพรุ่งนี้</span>
          </div>
        ) : (
          <div className="daily-body">
            <b>เหรียญประจำวันพร้อมรับ!</b>
            <span>จากตัวละครพิเศษ รวม <strong>+{dailyPending}</strong> เหรียญ</span>
            <button type="button" className="daily-btn" onClick={claim} disabled={claiming}>{claiming ? '...' : 'รับเลย!'}</button>
          </div>
        )}
      </section>

      <AlbumPage title="ตัวละครพิเศษ" tape="rainbow" count={`${characters.length}/${CHARACTERS.length}`}>
        {CHARACTERS.map((c, i) => {
          const owned = characters.includes(c.id);
          return (
            <div
              className={`sticker-slot ${owned ? '' : 'empty'} ${owned && fresh.has(`char:${c.id}`) ? 'is-new' : ''}`}
              key={c.id}
              style={owned ? { '--tilt': tilt(i + 5), '--pop-delay': `${freshProps(`char:${c.id}`).delay ?? 0}s` } : undefined}
            >
              {owned && fresh.has(`char:${c.id}`) && <span className="new-badge">NEW</span>}
              {owned
                ? <div className="sticker char-sticker"><Sparkles img={c.img}><CharPortrait ch={c} size={84} variant="sticker" /></Sparkles></div>
                : <div className="slot-hole"><CharPortrait ch={c} size={64} locked variant="sticker" /><span className="slot-q">?</span></div>}
              <div className="slot-name">{owned ? c.name : '???'}</div>
              <div className="slot-sub">{owned ? `+${c.bonus} เหรียญ/วัน` : 'ซื้อที่ร้านค้า'}</div>
            </div>
          );
        })}
      </AlbumPage>

      <AlbumPage title="พืชที่เคยปลูก" tape="green" count={`${discoveredCropIds.size}/${CROPS.length}`}>
        {CROPS.map((c, i) => (
          <StickerSlot key={c.id} img={c.img} name={c.nameTh} found={discoveredCropIds.has(c.id)} tilt={tilt(i)} {...freshProps(`crop:${c.id}`)} />
        ))}
      </AlbumPage>

      <AlbumPage title="ชุดดินที่เคยเจอ" tape="orange" count={`${discoveredSoilIds.size}/${SOIL.length}`}>
        {SOIL.map((s, i) => (
          <StickerSlot key={s.id} img={s.img} name={s.nameTh} found={discoveredSoilIds.has(s.id)} tilt={tilt(i + 3)} {...freshProps(`soil:${s.id}`)} />
        ))}
      </AlbumPage>
    </>
  );
}

function AlbumPage({ title, tape, count, children }) {
  return (
    <section className="album-page">
      <h3 className={`washi washi-${tape}`}>{title} <span className="washi-count">{count}</span></h3>
      <div className="album-grid">{children}</div>
    </section>
  );
}

function StickerSlot({ img, name, found, tilt: rot, isNew = false, delay = 0 }) {
  if (!found) {
    return (
      <div className="sticker-slot empty">
        <div className="slot-hole">
          <img src={img} alt="" />
          <span className="slot-q">?</span>
        </div>
        <div className="slot-name">???</div>
      </div>
    );
  }
  return (
    <div className={`sticker-slot ${isNew ? 'is-new' : ''}`} style={{ '--tilt': rot, '--pop-delay': `${delay}s` }}>
      {isNew && <span className="new-badge">NEW</span>}
      <div className="sticker">
        <img src={img} alt="" />
      </div>
      <div className="slot-name">{name}</div>
    </div>
  );
}
