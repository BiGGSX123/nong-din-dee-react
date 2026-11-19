import { useRef, useState } from 'react';
import { CROPS, SOIL, cropById, soilById } from '../data/content';
import { useConfirmAction } from '../hooks/useConfirmAction';
import { careIcon, fertIcon } from '../lib/choiceIcons';
import Dropdown from '../components/Dropdown';

const LETTER = (i) => String.fromCharCode(65 + i);

function AdminLevelRow({
  level, index, isExpanded, isLast, careMethods, fertilizers,
  onToggle, onFieldChange, onCropChoiceChange, onDelete,
  confirmKey, onConfirmDelete, rowRef,
}) {
  const soil = soilById(level.soilId);
  const deleteKey = 'lvl-' + index;
  const isArmed = confirmKey === deleteKey;

  const soilOptions = SOIL.map((s) => ({ value: s.id, label: s.nameTh, img: s.img }));
  const cropOptions = CROPS.map((c) => ({ value: c.id, label: c.nameTh, img: c.img }));
  const careOptions = careMethods.map((m, ci) => ({ value: ci, label: `${LETTER(ci)}. ${m}`, img: careIcon(m) || undefined }));
  const fertOptions = fertilizers.map((f, fi) => ({ value: fi, label: f.label, img: fertIcon(f) || undefined }));
  const correctCropOptions = level.cropChoices.map((cid) => {
    const c = cropById(cid);
    return { value: cid, label: c ? c.nameTh : cid, img: c?.img };
  });

  return (
    <div className={`admin-level-card ${isExpanded ? 'open' : ''}`} ref={rowRef}>
      <button className="admin-level-summary" type="button" onClick={() => onToggle(index)} aria-expanded={isExpanded}>
        <span className="admin-level-num">{index + 1}</span>
        {soil ? <img className="admin-level-thumb" src={soil.img} alt="" /> : <span className="admin-level-thumb" />}
        <span className="admin-level-text">
          <b>{level.province}</b>
          <small>{soil ? soil.nameTh : 'ยังไม่ได้เลือกชุดดิน'}</small>
        </span>
        <span className="admin-level-caret" aria-hidden="true">
          <svg viewBox="0 0 24 24"><path d="M6 9.5 L12 15.5 L18 9.5" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </span>
      </button>

      {isExpanded && (
        <div className="admin-level-edit">
          <div className="admin-field">
            <span className="admin-label">ชื่อด่าน / จังหวัด</span>
            <input type="text" className="admin-input" value={level.province} onChange={(e) => onFieldChange(index, 'province', e.target.value)} />
          </div>

          <div className="admin-field">
            <span className="admin-label">ชุดดิน</span>
            <Dropdown className="admin-dd" value={level.soilId} options={soilOptions} onChange={(v) => onFieldChange(index, 'soilId', v)} ariaLabel="ชุดดิน" />
          </div>

          <div className="admin-field">
            <span className="admin-label"><i className="q-num">1</i>วิธีดูแลดินที่ถูกต้อง</span>
            <Dropdown className="admin-dd" value={level.careCorrectIdx} options={careOptions} onChange={(v) => onFieldChange(index, 'careCorrectIdx', v)} ariaLabel="วิธีดูแลดินที่ถูกต้อง" />
          </div>

          <div className="admin-field">
            <span className="admin-label"><i className="q-num">2</i>ตัวเลือกพืช 4 ช่อง</span>
            <div className="admin-crop-grid">
              {[0, 1, 2, 3].map((ci) => (
                <div className="admin-crop-choice" key={ci}>
                  <span className="admin-choice-letter">{LETTER(ci)}</span>
                  <Dropdown
                    className={`admin-dd ${level.cropChoices[ci] === level.cropCorrectId ? 'is-correct' : ''}`}
                    value={level.cropChoices[ci]}
                    options={cropOptions}
                    onChange={(v) => onCropChoiceChange(index, ci, v)}
                    searchable
                    searchPlaceholder="ค้นหาพืช..."
                    emptyText="ไม่พบพืชนี้"
                    ariaLabel={`ตัวเลือกพืช ${LETTER(ci)}`}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="admin-field">
            <span className="admin-label"><span className="admin-correct-tag">✓</span>พืชที่ถูกต้อง</span>
            <Dropdown className="admin-dd is-correct" value={level.cropCorrectId} options={correctCropOptions} onChange={(v) => onFieldChange(index, 'cropCorrectId', v)} ariaLabel="พืชที่ถูกต้อง" />
          </div>

          <div className="admin-field">
            <span className="admin-label"><i className="q-num">3</i>ปุ๋ยที่ถูกต้อง</span>
            <Dropdown className="admin-dd" value={level.fertCorrectIdx} options={fertOptions} onChange={(v) => onFieldChange(index, 'fertCorrectIdx', v)} ariaLabel="ปุ๋ยที่ถูกต้อง" />
          </div>

          {isLast
            ? (
              <button
                type="button"
                className={`admin-danger-btn ${isArmed ? 'confirming' : ''}`}
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
  const [levelQuery, setLevelQuery] = useState('');
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
    setLevelQuery('');
    const newIdx = levels.length;
    setExpandedLevel(newIdx);
    requestAnimationFrame(() => rowRefs.current[newIdx]?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };

  const q = levelQuery.trim();
  const shownLevels = levels.map((lvl, i) => ({ lvl, i })).filter(({ lvl }) => !q || lvl.province.includes(q));

  return (
    <div className="admin-page">
      <section className="admin-hero">
        <span className="admin-hero-icon"><img src="/icons/ui/gear.webp" alt="" /></span>
        <div className="admin-hero-text">
          <h1>จัดการด่าน</h1>
          <p>แก้แล้วบันทึกเข้าฐานข้อมูลทันที ผู้เล่นทุกคนเห็นค่าใหม่</p>
        </div>
        <div className="admin-stats">
          <span><b>{levels.length}</b>ด่าน</span>
          <span><b>{careMethods.length}</b>วิธีดูแลดิน</span>
          <span><b>{fertilizers.length}</b>ปุ๋ย</span>
        </div>
      </section>

      <section className="admin-card">
        <h3 className="admin-card-title"><img src="/icons/ui/pin.webp" alt="" />เพิ่มด่านใหม่</h3>
        <div className="admin-row">
          <input
            type="text" className="admin-input" placeholder="ชื่อด่าน เช่น ด่านพิเศษ 1"
            value={newLevelName}
            onChange={(e) => setNewLevelName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleAddLevel(); }}
          />
          <button className="admin-add-btn" type="button" onClick={handleAddLevel}>+ เพิ่มด่าน</button>
        </div>
      </section>

      <section className="admin-card">
        <h3 className="admin-card-title"><img src="/icons/ui/map.webp" alt="" />ด่านทั้งหมด <span className="admin-count">{levels.length}</span></h3>
        <label className="admin-search">
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" strokeWidth="2.6" /><path d="M15.5 15.5 L20.5 20.5" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" /></svg>
          <input type="text" placeholder="ค้นหาจังหวัด..." value={levelQuery} onChange={(e) => setLevelQuery(e.target.value)} />
        </label>
        <div className="admin-level-list">
          {shownLevels.map(({ lvl, i }) => (
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
          {shownLevels.length === 0 && <div className="admin-empty">ไม่พบจังหวัด “{q}”</div>}
        </div>
      </section>

      <section className="admin-card">
        <h3 className="admin-card-title"><img src="/icons/ui/sprout.webp" alt="" />ตัวเลือกวิธีดูแลดิน <span className="admin-count">{careMethods.length}</span></h3>
        <div className="admin-option-list">
          {careMethods.map((m, i) => {
            const isLast = i === careMethods.length - 1 && careMethods.length > 1;
            const key = 'care-' + i;
            const isArmed = confirmKey === key;
            const ic = careIcon(m);
            return (
              <div className="admin-option" key={i}>
                <span className="admin-choice-letter">{LETTER(i)}</span>
                <span className="admin-option-icon">{ic ? <img src={ic} alt="" /> : null}</span>
                <input type="text" className="admin-input" value={m} onChange={(e) => onUpdateCareMethod(i, e.target.value)} />
                {isLast && (
                  <button type="button" className={`admin-danger-btn small ${isArmed ? 'confirming' : ''}`} onClick={() => triggerConfirm(key, () => onDeleteCareMethod(i))}>
                    {isArmed ? 'แน่ใจ?' : 'ลบ'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
        <button className="admin-add-btn wide" type="button" onClick={onAddCareMethod}>+ เพิ่มตัวเลือก</button>
      </section>

      <section className="admin-card">
        <h3 className="admin-card-title"><img src="/icons/fert/npk.webp" alt="" />ตัวเลือกปุ๋ย <span className="admin-count">{fertilizers.length}</span></h3>
        <div className="admin-option-list">
          {fertilizers.map((f, i) => {
            const isLast = i === fertilizers.length - 1 && fertilizers.length > 1;
            const key = 'fert-' + i;
            const isArmed = confirmKey === key;
            const ic = fertIcon(f);
            return (
              <div className="admin-option fert" key={i}>
                <span className="admin-option-icon">{ic ? <img src={ic} alt="" /> : null}</span>
                <div className="admin-fert-fields">
                  <input type="text" className="admin-input" placeholder="ชื่อปุ๋ย" value={f.label} onChange={(e) => onUpdateFertLabel(i, e.target.value)} />
                  <input type="text" className="admin-input sub" placeholder="คำอธิบาย" value={f.sub} onChange={(e) => onUpdateFertSub(i, e.target.value)} />
                </div>
                {isLast && (
                  <button type="button" className={`admin-danger-btn small ${isArmed ? 'confirming' : ''}`} onClick={() => triggerConfirm(key, () => onDeleteFertilizer(i))}>
                    {isArmed ? 'แน่ใจ?' : 'ลบ'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
        <button className="admin-add-btn wide" type="button" onClick={onAddFertilizer}>+ เพิ่มตัวเลือกปุ๋ย</button>
      </section>

      <section className="admin-card danger">
        <h3 className="admin-card-title">โซนอันตราย</h3>
        <p className="admin-danger-note">รีเซ็ตด่าน วิธีดูแลดิน และปุ๋ยทั้งหมดกลับเป็นค่าเริ่มต้น (ความคืบหน้าของผู้เล่นไม่หาย)</p>
        <button
          type="button"
          className={`admin-danger-btn ${confirmKey === 'reset' ? 'confirming' : ''}`}
          onClick={() => triggerConfirm('reset', onReset)}
        >
          {confirmKey === 'reset' ? 'แน่ใจนะ? กดอีกครั้งเพื่อรีเซ็ตทั้งหมด' : '↺ รีเซ็ตเป็นค่าเริ่มต้นทั้งหมด'}
        </button>
      </section>
    </div>
  );
}
