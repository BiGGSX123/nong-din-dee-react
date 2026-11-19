import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { REWARDS } from '../data/rewards';
import FakeQR from '../components/FakeQR';
import { SHOP_ITEMS } from '../data/shopItems';
import { CHARACTERS } from '../data/characters';
import CharPortrait from '../components/CharPortrait';
import Sparkles from '../components/Sparkles';
import { playUnlock, playWrong } from '../lib/sound';

const MODE_LABEL = { map: 'ด่านผจญภัย', tf: 'ถูก หรือ ผิด' };

// item shop: spend points (เหรียญสะสม) on power-ups used during quizzes
export default function ShopScreen({ points, inventory, onBuy, isLoggedIn, characters = [], onBuyCharacter }) {
  const [busy, setBusy] = useState(null); // itemId being bought
  const [flash, setFlash] = useState(null); // { id, ok, msg, n } after a purchase (n restarts the bounce)
  const [soldOut, setSoldOut] = useState(null); // reward shown in the out-of-stock popup
  const [confirmChar, setConfirmChar] = useState(null); // character waiting for "ยืนยัน"
  const [welcome, setWelcome] = useState(null); // { ch, bonus } — popup: the daily bonus paid with the purchase

  // a purchase is a moment, not a state: a successful item buy is just a quick
  // bounce (no text), errors stay readable a little longer
  useEffect(() => {
    if (!flash) return undefined;
    const t = setTimeout(() => setFlash(null), flash.ok ? 900 : 2200);
    return () => clearTimeout(t);
  }, [flash]);

  function buyChar(ch) {
    setConfirmChar(null);
    if (busy) return;
    setBusy(ch.id);
    onBuyCharacter(ch.id)
      .then((bonus) => {
        playUnlock();
        setFlash({ id: ch.id, ok: true, n: Date.now() });
        if (bonus > 0) setWelcome({ ch, bonus });
      })
      .catch(() => { playWrong(); setFlash({ id: ch.id, ok: false, msg: 'ซื้อไม่สำเร็จ ลองใหม่อีกครั้ง' }); })
      .finally(() => setBusy(null));
  }

  function buy(item) {
    if (busy) return;
    setBusy(item.id);
    onBuy(item.id)
      .then(() => { playUnlock(); setFlash({ id: item.id, ok: true, n: Date.now() }); })
      .catch(() => { playWrong(); setFlash({ id: item.id, ok: false, msg: 'ซื้อไม่สำเร็จ ลองใหม่อีกครั้ง' }); })
      .finally(() => setBusy(null));
  }

  return (
    <>
      <section className="shop-hero">
        <div className="shop-awning" aria-hidden="true" />
        <h1><img className="shop-title-icon" src="/icons/shop/shop.webp" alt="" />ร้านค้าน้องดินดี</h1>
        <p>เอาเหรียญสะสมมาแลกไอเทมช่วยตอบคำถาม</p>
        <div className="shop-balance">
          <img src="/icons/shop/points.webp" alt="" />
          <b>{points.toLocaleString()}</b><span>เหรียญที่ใช้ได้</span>
        </div>
      </section>

      <div className="shop-list">
        {SHOP_ITEMS.map((item) => {
          const owned = inventory[item.id] || 0;
          const affordable = points >= item.price;
          const justBought = flash?.id === item.id;
          return (
            <article className={`shop-item ${justBought && flash.ok ? 'bought' : ''}`} key={item.id}>
              {/* keyed by the purchase so buying again replays the bounce */}
              <div key={justBought && flash.ok ? flash.n : 'icon'} className={`shop-icon icon-${item.id}`} aria-hidden="true">{item.img ? <img src={item.img} alt="" /> : item.icon}</div>
              <div className="shop-info">
                <h2>{item.name}</h2>
                <p>{item.desc}</p>
                <div className="shop-meta">
                  {item.modes.map((m) => <span key={m} className="shop-mode">{MODE_LABEL[m]}</span>)}
                  <span key={justBought && flash.ok ? flash.n : 'owned'} className="shop-owned">มีอยู่ {owned} ชิ้น</span>
                </div>
                {justBought && !flash.ok && <div className="shop-flash err">{flash.msg}</div>}
              </div>
              <button
                type="button"
                className="shop-buy"
                disabled={!affordable || busy === item.id}
                onClick={() => buy(item)}
              >
                <span className="shop-price"><img src="/icons/shop/points.webp" alt="" />{item.price}</span>
                <span className="shop-buy-label">{busy === item.id ? '...' : affordable ? 'ซื้อ' : 'เหรียญไม่พอ'}</span>
              </button>
            </article>
          );
        })}
      </div>

      <h2 className="shop-section">⭐ ตัวละครพิเศษ</h2>
      <p className="shop-section-sub">ซื้อครั้งเดียวได้ถาวร — รับเหรียญเพิ่มทุกวันที่หน้าคลังสะสม</p>
      <div className="char-shop-grid">
        {CHARACTERS.map((ch) => {
          const owned = characters.includes(ch.id);
          const affordable = points >= ch.price;
          const justBought = flash?.id === ch.id;
          return (
            <article className={`char-card ${owned ? 'owned' : ''} ${justBought && flash.ok ? 'bought' : ''}`} key={ch.id}>
              <Sparkles img={ch.img}><CharPortrait ch={ch} size={96} variant="sticker" /></Sparkles>
              <h3>{ch.name}</h3>
              <div className="char-bonus">+{ch.bonus} เหรียญ/วัน</div>
              <p>{ch.desc}</p>
              {justBought && !flash.ok && <div className="shop-flash err">{flash.msg}</div>}
              {owned ? (
                <div className="char-owned">มีแล้ว ✓</div>
              ) : (
                <button type="button" className="shop-buy wide" disabled={!affordable || busy === ch.id} onClick={() => setConfirmChar(ch)}>
                  <span className="shop-price"><img src="/icons/shop/points.webp" alt="" />{ch.price}</span>
                  <span className="shop-buy-label">{busy === ch.id ? '...' : affordable ? 'ซื้อ' : 'เหรียญไม่พอ'}</span>
                </button>
              )}
            </article>
          );
        })}
      </div>

      <h2 className="shop-section"><img className="shop-section-icon" src="/icons/ui/gift.webp" alt="" />แลกของรางวัล</h2>
      <p className="shop-section-sub">ใช้เหรียญสะสมแลกของรางวัลจริง!</p>
      <div className="reward-grid">
        {REWARDS.map((r) => (
          <article className="reward-card" key={r.id}>
            <span className="reward-ribbon">ของจริง!</span>
            <img className="reward-art" src={r.img} alt="" />
            <h3>{r.name}</h3>
            <button type="button" className="reward-btn" onClick={() => { playWrong(); setSoldOut(r); }}>
              <span className="shop-price"><img src="/icons/shop/points.webp" alt="" />{r.price.toLocaleString()}</span>
              <span className="shop-buy-label">แลก</span>
            </button>
          </article>
        ))}
      </div>

      {confirmChar && createPortal(
        <div className="card-detail-overlay" onClick={() => setConfirmChar(null)}>
          <div className="soldout-card confirm-card" role="alertdialog" aria-labelledby="confirm-title" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-char"><Sparkles img={confirmChar.img}><CharPortrait ch={confirmChar} size={110} variant="sticker" /></Sparkles></div>
            <h2 id="confirm-title">ซื้อ {confirmChar.name} ไหม?</h2>
            <div className="confirm-bonus">+{confirmChar.bonus} เหรียญ/วัน ถาวร</div>
            <div className="confirm-cost">
              <span>ใช้</span>
              <b><img src="/icons/shop/points.webp" alt="" />{confirmChar.price.toLocaleString()}</b>
              <span>เหลือ {(points - confirmChar.price).toLocaleString()} เหรียญ</span>
            </div>
            <div className="confirm-actions">
              <button type="button" className="btn secondary" onClick={() => setConfirmChar(null)}>ยกเลิก</button>
              <button type="button" className="btn" onClick={() => buyChar(confirmChar)}>ยืนยันซื้อ</button>
            </div>
          </div>
        </div>,
        document.body,
      )}

      {welcome && createPortal(
        <div className="card-detail-overlay" onClick={() => setWelcome(null)}>
          <div className="soldout-card bonus-card" role="dialog" aria-labelledby="bonus-title" onClick={(e) => e.stopPropagation()}>
            <div className="bonus-hero">
              <div className="bonus-rays" aria-hidden="true" />
              <Sparkles img={welcome.ch.img}><CharPortrait ch={welcome.ch} size={124} variant="sticker" /></Sparkles>
            </div>
            <h2 id="bonus-title">ได้รับเหรียญทันที!</h2>
            <div className="bonus-amount"><img src="/icons/shop/points.webp" alt="" />+{welcome.bonus}<span>เหรียญ</span></div>
            <p>โบนัสวันนี้จาก <b>{welcome.ch.name}</b><br />ตั้งแต่พรุ่งนี้กดรับ +{welcome.bonus} เหรียญได้ทุกวันที่หน้าคลังสะสม</p>
            <button type="button" className="btn" onClick={() => setWelcome(null)}>เยี่ยมเลย!</button>
          </div>
        </div>,
        document.body,
      )}

      {soldOut && createPortal(
        <div className="card-detail-overlay" onClick={() => setSoldOut(null)}>
          <div className="soldout-card" role="alertdialog" aria-labelledby="soldout-title" onClick={(e) => e.stopPropagation()}>
            <img className="soldout-mascot" src="/mascot/nong-din-dee-sad.webp" alt="" />
            {/* faded voucher QR with the prize icon in the middle, stamped sold out */}
            <div className="soldout-qr">
              <FakeQR seed={soldOut.id} />
              <img className="soldout-qr-logo" src={soldOut.img} alt="" />
              <span className="soldout-stamp">สินค้าหมด</span>
            </div>
            <h2 id="soldout-title">ขออภัย สินค้าหมดชั่วคราว</h2>
            <p><b>{soldOut.name}</b> หมดแล้ว กลับมาแลกใหม่เร็วๆ นี้นะ<br />ยังไม่มีการหักเหรียญของคุณ</p>
            <button type="button" className="btn" onClick={() => setSoldOut(null)}>ตกลง</button>
          </div>
        </div>,
        document.body,
      )}

      <p className="shop-note">
        เหรียญที่ใช้ซื้อจะถูกหักจากเหรียญคงเหลือ (อันดับไม่ลด เพราะนับจากเหรียญที่ได้รับทั้งหมด)
        {!isLoggedIn && ' — โหมดผู้เยี่ยมชม ไอเทมจะหายเมื่อปิดเกม เข้าสู่ระบบด้วย LINE เพื่อเก็บไว้'}
      </p>
    </>
  );
}
