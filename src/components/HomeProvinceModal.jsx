import { useState } from 'react';
import { PROVINCES } from '../data/content';

export default function HomeProvinceModal({ onSave, saving }) {
  const [value, setValue] = useState('');

  return (
    <div className="intro-overlay">
      <div className="intro-card">
        <h2>คุณอยู่จังหวัดไหน?</h2>
        <p>เลือกจังหวัดของคุณ แล้วเล่นได้เลย</p>
        <select
          className="admin-select home-province-select"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        >
          <option value="" disabled>เลือกจังหวัด...</option>
          {PROVINCES.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <button className="btn" type="button" disabled={!value || saving} onClick={() => onSave(value)}>
          {saving ? 'กำลังบันทึก...' : 'บันทึก'}
        </button>
      </div>
    </div>
  );
}
