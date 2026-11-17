import { useState } from 'react';
import { getVolume, setVolume } from '../lib/sound';

const VOLUME_STEP = 0.2;

export default function SettingsModal({ textSize, onChangeTextSize, onClose }) {
  const [volume, setVolumeState] = useState(getVolume());

  function adjustVolume(delta) {
    const next = Math.min(1, Math.max(0, Math.round((volume + delta) * 10) / 10));
    setVolume(next);
    setVolumeState(next);
  }

  return (
    <div className="intro-overlay" onClick={onClose}>
      <div className="intro-card settings-card" onClick={(e) => e.stopPropagation()}>
        <button className="settings-close" type="button" onClick={onClose} aria-label="ปิด">✕</button>
        <h2>ตั้งค่า</h2>

        <div className="settings-row">
          <span className="settings-label">เสียง</span>
          <div className="settings-stepper">
            <button type="button" onClick={() => adjustVolume(-VOLUME_STEP)} disabled={volume <= 0} aria-label="ลดเสียง">−</button>
            <span className="settings-stepper-value">{volume <= 0 ? 'ปิดเสียง' : `${Math.round(volume * 100)}%`}</span>
            <button type="button" onClick={() => adjustVolume(VOLUME_STEP)} disabled={volume >= 1} aria-label="เพิ่มเสียง">+</button>
          </div>
        </div>

        <div className="settings-row">
          <span className="settings-label">ขนาดตัวอักษร</span>
          <div className="settings-toggle">
            <button
              type="button"
              className={textSize === 'normal' ? 'active' : ''}
              onClick={() => onChangeTextSize('normal')}
            >
              ธรรมดา
            </button>
            <button
              type="button"
              className={textSize === 'large' ? 'active' : ''}
              onClick={() => onChangeTextSize('large')}
            >
              ใหญ่
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
