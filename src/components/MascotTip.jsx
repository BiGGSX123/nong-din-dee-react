import SpeechBubble from './SpeechBubble';
import StarIcon from './StarIcon';

// first-visit map tip: mascot + sticker speech bubble with three short steps
export default function MascotTip({ onClose }) {
  return (
    <div className="mascot-tip">
      <SpeechBubble tail="right" className="mascot-tip-bubble">
        <button className="mascot-tip-close" type="button" onClick={onClose} aria-label="ปิด">✕</button>
        <div className="tip-title">วิธีเล่น</div>
        <ul className="tip-steps">
          <li><span className="tip-step-icon"><img src="/icons/ui/pin.webp" alt="" /></span><span>แตะที่<b>ด่าน</b>เพื่อเริ่มเล่นได้เลย!</span></li>
          <li><span className="tip-step-icon"><StarIcon filled /></span><span>ตอบคำถาม 3 ข้อ ยิ่งถูกเยอะ ยิ่งได้<b>ดาว</b>เยอะ</span></li>
          <li><span className="tip-step-icon"><img src="/icons/ui/book.webp" alt="" /></span><span>อยากรู้เรื่องดิน พืช ปุ๋ย แตะแท็บ<b>ความรู้</b>ด้านล่าง</span></li>
        </ul>
        <button className="tip-ok" type="button" onClick={onClose}>เข้าใจแล้ว!</button>
      </SpeechBubble>
      <img className="mascot-tip-art" src="/mascot/nong-din-dee.webp" alt="" />
    </div>
  );
}
