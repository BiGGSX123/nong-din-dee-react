export default function MascotTip({ onClose }) {
  return (
    <div className="mascot-tip">
      <div className="mascot-tip-bubble">
        <button className="mascot-tip-close" type="button" onClick={onClose}>✕</button>
        <p>แตะที่ด่านเพื่อเริ่มเล่นได้เลย! ตอบคำถาม 3 ข้อให้ถูกในแต่ละด่าน ยิ่งถูกเยอะยิ่งได้ดาวเยอะ อยากรู้เรื่องดิน พืช ปุ๋ยเพิ่มเติม แตะแท็บ "ความรู้" ด้านล่างได้เลยนะ</p>
      </div>
      <img src="/mascot/nong-din-dee.png" alt="" />
    </div>
  );
}
