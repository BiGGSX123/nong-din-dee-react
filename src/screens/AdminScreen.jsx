import { useRef, useState } from 'react';
import { CROPS, SOIL, cropById, soilById } from '../data/content';
import { useConfirmAction } from '../hooks/useConfirmAction';

function AdminLevelRow({
  level, index, isExpanded, isLast, careMethods, fertilizers,
  onToggle, onFieldChange, onCropChoiceChange, onDelete,
  confirmKey, onConfirmDelete, rowRef,
}) {
  const soil = soilById(level.soilId);
  const deleteKey = 'lvl-' + index;
  const isArmed = confirmKey === deleteKey;

  return (
    <div className="admin-level-card" ref={rowRef}>
      <button className={`admin-level-summary ${isExpanded ? 'expanded' : ''}`} type="button" onClick={() => onToggle(index)}>
        {soil ? <img className="admin-level-thumb" src={soil.img} alt="" /> : <span className="admin-level-thumb" />}
        <span className="admin-level-title">#{index + 1} {level.province}</span>
        <span className="admin-level-sub">{soil ? soil.nameTh : '?'} <span className="admin-level-caret">▾</span></span>
      </button>
      {isExpanded && (
        <div className="admin-level-edit">
          <label>ชื่อด่าน/จังหวัด
            <input
              type="text" className="admin-input"
              value={level.province}
              onChange={(e) => onFieldChange(index, 'province', e.target.value)}
            />
          </label>
          <label>ชุดดิน
            <select
              className="admin-select"
              value={level.soilId}
              onChange={(e) => onFieldChange(index, 'soilId', e.target.value)}
            >
              {SOIL.map((s) => <option key={s.id} value={s.id}>{s.nameTh}</option>)}
            </select>
          </label>
          <label>วิธีดูแลดินที่ถูกต้อง
            <select
              className="admin-select"
              value={level.careCorrectIdx}
              onChange={(e) => onFieldChange(index, 'careCorrectIdx', Number(e.target.value))}
            >
              {careMethods.map((m, ci) => <option key={ci} value={ci}>{String.fromCharCode(65 + ci)}. {m}</option>)}
            </select>
          </label>
          {[0, 1, 2, 3].map((ci) => (
            <label key={ci}>ตัวเลือกพืช {String.fromCharCode(65 + ci)}
              <select
                className="admin-select"
                value={level.cropChoices[ci]}
                onChange={(e) => onCropChoiceChange(index, ci, e.target.value)}
              >
                {CROPS.map((c) => <option key={c.id} value={c.id}>{c.nameTh}</option>)}
              </select>
            </label>
          ))}
          <label>พืชที่ถูกต้อง
            <select
              className="admin-select"
              value={level.cropCorrectId}
              onChange={(e) => onFieldChange(index, 'cropCorrectId', e.target.value)}
            >
              {level.cropChoices.map((cid) => {
                const c = cropById(cid);
                return <option key={cid} value={cid}>{c ? c.nameTh : cid}</option>;
              })}
            </select>
          </label>
          <label>ปุ๋ยที่ถูกต้อง
            <select
              className="admin-select"
              value={level.fertCorrectIdx}
              onChange={(e) => onFieldChange(index, 'fertCorrectIdx', Number(e.target.value))}
            >
              {fertilizers.map((f, fi) => <option key={fi} value={fi}>{f.label}</option>)}
            </select>
          </label>
          {isLast
            ? (
              <button
                type="button"
                className={`btn secondary admin-delete-btn ${isArmed ? 'confirming' : ''}`}
                onClick={() => onConfirmDelete(deleteKey, () => onDelete(index))}
              >
                {isArmed ? 'แน่ใจนะ? กดอีกครั้งเพื่อลบ' : 'ลบด่านนี้ (ด่านสุดท้าย)'}
              </button>
            )
            : <div className="admin-delete-hint">ลบได้เฉพาะด่านสุดท้ายเท่านั้น</div>}
        </div>
      )}
    </div>
  );
}

export default function AdminScreen({
  levels, careMethods, fertilizers,
  onUpdateLevel, onUpdateLevelCropChoice, onDeleteLevel, onAddLevel,
  onUpdateCareMethod, onDeleteCareMethod, onAddCareMethod,
  onUpdateFertLabel, onUpdateFertSub, onDeleteFertilizer, onAddFertilizer,
  onReset,
  isAdmin,
}) {
  const [expandedLevel, setExpandedLevel] = useState(null);
  const [newLevelName, setNewLevelName] = useState('');
  const [confirmKey, triggerConfirm] = useConfirmAction();
  const rowRefs = useRef({});

  // gated by the logged-in LINE account's role (Player.role === 'admin'),
  // checked again server-side on every write — this is just the UI message
  if (!isAdmin) {
    return (
      <>
        <h1>จัดการด่าน (แอดมิน)</h1>
        <div className="lede">บัญชีนี้ไม่มีสิทธิ์แอดมิน ต้องล็อกอินด้วยบัญชี LINE ที่ตั้งสิทธิ์แอดมินไว้ในระบบก่อน</div>
      </>
    );
  }

  const toggle = (idx) => {
    const willExpand = expandedLevel !== idx;
    setExpandedLevel(willExpand ? idx : null);
    if (willExpand) {
      requestAnimationFrame(() => rowRefs.current[idx]?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    }
  };

  const handleAddLevel = () => {
    const name = newLevelName.trim() || `ด่านพิเศษ ${levels.length + 1}`;
    onAddLevel(name);
    setNewLevelName('');
    const newIdx = levels.length;
    setExpandedLevel(newIdx);
    requestAnimationFrame(() => rowRefs.current[newIdx]?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };

  return (
    <>
      <h1>จัดการด่าน (แอดมิน)</h1>
      <div className="lede">แก้ไขด่าน ตัวเลือก และคำตอบที่ถูกต้อง</div>

      <div className="admin-hero">
        <div className="admin-hero-icon">⚙️</div>
        <div>
          <b>โหมดแอดมิน</b>
          <p>การแก้ไขทั้งหมดบันทึกในเบราว์เซอร์นี้เท่านั้น (ยังไม่มีฐานข้อมูลกลาง) เปลี่ยนเครื่อง/เบราว์เซอร์แล้วค่าจะไม่ตามไปด้วย</p>
        </div>
      </div>

      <div className="panel admin-panel">
        <h3><span className="admin-panel-icon">✨</span>เพิ่มด่านใหม่</h3>
        <div className="admin-row">
          <input
            type="text" className="admin-input" placeholder="ชื่อด่าน เช่น ด่านพิเศษ 1"
            value={newLevelName}
            onChange={(e) => setNewLevelName(e.target.value)}
          />
          <button className="btn" type="button" onClick={handleAddLevel}>+ เพิ่มด่าน</button>
        </div>
      </div>

      <div className="panel admin-panel">
        <h3><span className="admin-panel-icon">🗺️</span>ด่านทั้งหมด ({levels.length})</h3>
        <div className="admin-level-list">
          {levels.map((lvl, i) => (
            <AdminLevelRow
              key={lvl.id ?? i}
              level={lvl}
              index={i}
              isExpanded={expandedLevel === i}
              isLast={i === levels.length - 1}
              careMethods={careMethods}
              fertilizers={fertilizers}
              onToggle={toggle}
              onFieldChange={onUpdateLevel}
              onCropChoiceChange={onUpdateLevelCropChoice}
              onDelete={onDeleteLevel}
              confirmKey={confirmKey}
              onConfirmDelete={triggerConfirm}
              rowRef={(el) => { rowRefs.current[i] = el; }}
            />
          ))}
        </div>
      </div>

      <div className="panel admin-panel">
        <h3><span className="admin-panel-icon">🌱</span>ตัวเลือกวิธีดูแลดิน ({careMethods.length})</h3>
        {careMethods.map((m, i) => {
          const isLast = i === careMethods.length - 1 && careMethods.length > 1;
          const key = 'care-' + i;
          const isArmed = confirmKey === key;
          return (
            <div className="admin-row" key={i}>
              <span className="know-badge">{String.fromCharCode(65 + i)}</span>
              <input
                type="text" className="admin-input"
                value={m}
                onChange={(e) => onUpdateCareMethod(i, e.target.value)}
              />
              {isLast && (
                <button
                  type="button"
                  className={`btn secondary ${isArmed ? 'confirming' : ''}`}
                  onClick={() => triggerConfirm(key, () => onDeleteCareMethod(i))}
                >
                  {isArmed ? 'แน่ใจนะ?' : 'ลบ'}
                </button>
              )}
            </div>
          );
        })}
        <button className="btn secondary" type="button" onClick={onAddCareMethod}>+ เพิ่มตัวเลือก</button>
      </div>

      <div className="panel admin-panel">
        <h3><span className="admin-panel-icon">🌿</span>ตัวเลือกปุ๋ย ({fertilizers.length})</h3>
        {fertilizers.map((f, i) => {
          const isLast = i === fertilizers.length - 1 && fertilizers.length > 1;
          const key = 'fert-' + i;
          const isArmed = confirmKey === key;
          return (
            <div className="admin-fert-row" key={i}>
              <input
                type="text" className="admin-input" placeholder="ชื่อปุ๋ย"
                value={f.label}
                onChange={(e) => onUpdateFertLabel(i, e.target.value)}
              />
              <input
                type="text" className="admin-input" placeholder="คำอธิบาย"
                value={f.sub}
                onChange={(e) => onUpdateFertSub(i, e.target.value)}
              />
              {isLast && (
                <button
                  type="button"
                  className={`btn secondary ${isArmed ? 'confirming' : ''}`}
                  onClick={() => triggerConfirm(key, () => onDeleteFertilizer(i))}
                >
                  {isArmed ? 'แน่ใจนะ?' : 'ลบ'}
                </button>
              )}
            </div>
          );
        })}
        <button className="btn secondary" type="button" onClick={onAddFertilizer}>+ เพิ่มตัวเลือกปุ๋ย</button>
      </div>

      <button
        type="button"
        className={`btn secondary ${confirmKey === 'reset' ? 'confirming' : ''}`}
        onClick={() => triggerConfirm('reset', onReset)}
      >
        {confirmKey === 'reset' ? 'แน่ใจนะ? กดอีกครั้งเพื่อรีเซ็ตทั้งหมด' : '↺ รีเซ็ตเป็นค่าเริ่มต้นทั้งหมด'}
      </button>
    </>
  );
}
