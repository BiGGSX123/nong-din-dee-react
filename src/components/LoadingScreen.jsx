import { useState } from 'react';
import GameLogo from './GameLogo';

// simple white chat-bubble mark for the LINE button
const LineMark = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 3C6.5 3 2 6.6 2 11c0 3.9 3.5 7.2 8.3 7.9.3.1.8.2.9.5.1.3.1.7 0 1l-.1.9c0 .3-.2 1 .9.5s6-3.5 8.2-6.1C21.5 14 22 12.6 22 11c0-4.4-4.5-8-10-8Z" fill="#fff" />
    <path d="M7 9v4h2.2M10.6 9v4M12.6 13V9l2.6 4V9M19 9h-2.2v4H19M16.8 11h2" fill="none" stroke="#06C755" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// first thing on screen: the game logo over a light burst. While data loads it
// shows a loading bar; when LINE login is needed (onLogin given) it shows the
// "เข้าสู่ระบบด้วย LINE" button instead; on a failure (error given) it shows the
// message and a retry button.
export default function LoadingScreen({ onLogin, error, onRetry, retryLabel = 'ลองใหม่' }) {
  const [going, setGoing] = useState(false);
  return (
    <div className="phone">
      <div className={`loading-screen ${onLogin ? 'needs-login' : ''}`}>
        <GameLogo className="loading-logo" rays />
        {error ? (
          <div className="login-box load-error" role="alert">
            <p>{error}</p>
            {onRetry && <button type="button" className="btn load-retry" onClick={onRetry}>{retryLabel}</button>}
          </div>
        ) : onLogin ? (
          <div className="login-box">
            <p>เข้าสู่ระบบเพื่อเก็บเหรียญ อันดับ<br />และ แลกของรางวัลต่างๆ</p>
            <button
              type="button"
              className="line-login-btn"
              disabled={going}
              onClick={() => { setGoing(true); Promise.resolve(onLogin()).catch(() => setGoing(false)); }}
            >
              <span className="line-login-mark"><LineMark /></span>
              <span>{going ? 'กำลังไปที่ LINE...' : 'เข้าสู่ระบบด้วย LINE'}</span>
            </button>
          </div>
        ) : (
          <>
            <div className="loading-bar"><span /></div>
            <div className="loading-text">กำลังโหลด<span className="loading-dots"><i /><i /><i /></span></div>
          </>
        )}
      </div>
    </div>
  );
}
