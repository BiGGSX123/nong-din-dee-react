export default function IntroModal({ onNext, hasNextStep }) {
  return (
    <div className="intro-overlay">
      <div className="intro-card">
        <img src="/mascot/nong-din-dee.png" alt="" />
        <h2>น้องดินดี ยินดีต้อนรับ</h2>
        <p>ผจญภัยไปทีละจังหวัดทั่วไทย 77 ด่าน แต่ละด่านสุ่มชุดดินให้ ตอบให้ถูกว่าควรดูแลดิน ปลูกอะไร ใส่ปุ๋ยแบบไหน</p>
        <button className="btn" type="button" onClick={onNext}>{hasNextStep ? 'ถัดไป' : 'เริ่มเล่น'}</button>
      </div>
    </div>
  );
}
