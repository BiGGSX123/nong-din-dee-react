export default function ProvinceRegisteredModal({ onStart }) {
  return (
    <div className="intro-overlay">
      <div className="intro-card">
        <img src="/mascot/nong-din-dee.png" alt="" />
        <h2>ลงทะเบียนพื้นที่จังหวัดสำเร็จ!</h2>
        <p>ด่านของคุณถูกปลดล็อกเรียบร้อยแล้ว พร้อมผจญภัยไปทีละจังหวัดทั่วไทย 77 ด่านหรือยัง?</p>
        <button className="btn" type="button" onClick={onStart}>เริ่มเล่น</button>
      </div>
    </div>
  );
}
