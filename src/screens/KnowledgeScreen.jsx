import { useState } from 'react';
import { SOIL, CROPS } from '../data/content';
import { careIcon, fertIcon } from '../lib/choiceIcons';
import { SOIL_LABELS, SOIL_PROBLEMS, CROP_KNOWLEDGE, CARE_PROBLEM_LABELS, FERTILIZER_DETAILS, CROP_FERT_CORRECT } from '../data/knowledge';

const TABS = [
  { id: 'soil', img: '/soil/04-sandy-loam.webp', label: 'ชุดดิน' },
  { id: 'care', img: '/icons/care/compost.webp', label: 'ปรับปรุงดิน' },
  { id: 'crop', img: '/icons/ui/sprout.webp', label: 'พืช' },
  { id: 'fert', img: '/icons/fert/npk.webp', label: 'ปุ๋ย' },
];

// one topic at a time (tabs), one card per item, every fact under its own
// small heading — easier to read than the old single long list. All content
// is the same LDD-sourced data as before (src/data/knowledge.js).
export default function KnowledgeScreen({ careMethods, fertilizers }) {
  const [tab, setTab] = useState('soil');

  return (
    <>
      {/* banner: book icon + title on the left, thinking น้องดินดี peeking on the right */}
      <section className="know-banner">
        <div className="know-banner-text">
          <span className="know-banner-tag"><img src="/icons/ui/book.webp" alt="" />คลังความรู้</span>
          <h1>รู้จักดิน เลือกพืช ใส่ปุ๋ย</h1>
          <p>ความรู้จากกรมพัฒนาที่ดิน สรุปให้เข้าใจง่าย</p>
        </div>
        <img className="know-banner-mascot" src="/mascot/nong-din-dee-thinking.webp" alt="" />
      </section>

      <div className="know-tabs" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            className={`know-tab ${tab === t.id ? 'active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            <img className="know-tab-icon" src={t.img} alt="" />{t.label}
          </button>
        ))}
      </div>

      <div className={`know-list topic-${tab}`} key={tab}>
        {tab === 'soil' && SOIL.map((s) => {
          const goodCrops = CROPS.filter((c) => CROP_KNOWLEDGE.find((k) => k.id === c.id)?.best.includes(s.id));
          return (
            <article className="know-card" key={s.id}>
              <header className="know-card-head">
                <img className="know-card-art" src={s.img} alt="" />
                <h2>{s.nameTh}</h2>
              </header>
              <Field label="ปัญหาที่มักพบ">
                <ul className="know-points">
                  {SOIL_PROBLEMS[s.id].map((p) => (
                    <li key={p.label}>
                      <b>{p.label}</b>
                      {careMethods[p.careIdx] && (
                        <span className="know-fix">
                          {careIcon(careMethods[p.careIdx]) && <img src={careIcon(careMethods[p.careIdx])} alt="" />}
                          <span><em>แก้โดย</em> {careMethods[p.careIdx]}</span>
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </Field>
              <Field label="พืชที่เหมาะมาก">
                {goodCrops.length ? <CropChips crops={goodCrops} /> : <span className="know-none" style={{ marginLeft: '8px' }}>ไม่มีพืชในเกมที่เหมาะมาก</span>}
              </Field>
            </article>
          );
        })}

        {tab === 'care' && careMethods.map((m, i) => (
          <article className="know-card" key={i}>
            <header className="know-card-head">
              <span className="know-icon-wrap">
                {careIcon(m) ? <img src={careIcon(m)} alt="" /> : <span className="know-letter">{String.fromCharCode(65 + i)}</span>}
                {careIcon(m) && <span className="know-icon-letter">{String.fromCharCode(65 + i)}</span>}
              </span>
              <h2>{m}</h2>
            </header>
            {CARE_PROBLEM_LABELS[i] && <Field label="ใช้แก้ปัญหา"><p>{CARE_PROBLEM_LABELS[i]}</p></Field>}
          </article>
        ))}

        {tab === 'crop' && CROP_KNOWLEDGE.map((c) => {
          const fert = fertilizers[CROP_FERT_CORRECT[c.id]];
          return (
            <article className="know-card" key={c.id}>
              <header className="know-card-head">
                <img className="know-card-art" src={c.img} alt="" />
                <h2>{c.nameTh}</h2>
              </header>
              <Field label="ดินที่เหมาะมาก">
                {c.best.length
                  ? <div className="chips">{c.best.map((id) => <span key={id} className="chip soil">{SOIL_LABELS[id]}</span>)}</div>
                  : <span className="know-none">—</span>}
              </Field>
              {fert && <Field label="ปุ๋ยที่แนะนำ"><p><b>{fert.label}</b>{fert.sub ? ` — ${fert.sub}` : ''}</p></Field>}
            </article>
          );
        })}

        {tab === 'fert' && fertilizers.map((f, i) => {
          const detail = FERTILIZER_DETAILS[i];
          const suited = CROPS.filter((c) => CROP_FERT_CORRECT[c.id] === i);
          return (
            <article className="know-card" key={i}>
              <header className="know-card-head">
                {fertIcon(f)
                  ? <span className="know-icon-wrap"><img src={fertIcon(f)} alt="" /></span>
                  : <span className="know-letter fert" aria-hidden="true">🧪</span>}
                <div>
                  <h2>{f.label}</h2>
                  {f.sub && <div className="know-card-sub">{f.sub}</div>}
                </div>
              </header>
              {detail && (
                <>
                  <Field label="สูตร"><span className="chip npk">{detail.npk}</span></Field>
                  <Field label="คืออะไร / ใช้เมื่อไร"><p>{detail.desc}</p></Field>
                </>
              )}
              {suited.length > 0 && <Field label="เหมาะกับพืช"><CropChips crops={suited} /></Field>}
            </article>
          );
        })}
      </div>
    </>
  );
}

function Field({ label, children }) {
  return (
    <div className="know-field">
      <div className="know-field-label">{label}</div>
      {children}
    </div>
  );
}

function CropChips({ crops }) {
  return (
    <div className="chips">
      {crops.map((c) => (
        <span key={c.id} className="chip crop"><img src={c.img} alt="" />{c.nameTh}</span>
      ))}
    </div>
  );
}
