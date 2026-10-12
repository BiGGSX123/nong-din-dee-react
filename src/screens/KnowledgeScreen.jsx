import { SOIL, CROPS } from '../data/content';
import { SOIL_LABELS, SOIL_PROBLEMS, CROP_KNOWLEDGE, CARE_PROBLEM_LABELS, FERTILIZER_DETAILS, CROP_FERT_CORRECT } from '../data/knowledge';

function SoilTagList({ ids, cls }) {
  if (!ids.length) return <span className="fit-empty">—</span>;
  return (
    <span className={`fit-tags ${cls}`}>
      {ids.map((id) => <span key={id} className="fit-tag" title={SOIL_LABELS[id]}>{SOIL_LABELS[id]}</span>)}
    </span>
  );
}

export default function KnowledgeScreen({ careMethods, fertilizers }) {
  return (
    <>
      <h1>คลังความรู้</h1>
      <div className="lede">ความรู้เรื่องดิน พืช และปุ๋ย จากกรมพัฒนาที่ดิน สรุปให้เข้าใจง่าย</div>
      <div className="know-hero">
        <img src="/mascot/nong-din-dee.png" alt="" />
        <p>สวัสดีครับ! ผม <b>น้องดินดี</b> — รู้จักดินให้ลึก เลือกพืชให้ถูก ใส่ปุ๋ยให้ตรง ผลผลิตจะดีขึ้นแน่นอน</p>
      </div>
      <div className="panel">
        <h3>วิธีดูแล/ปรับปรุงดิน</h3>
        {careMethods.map((m, i) => (
          <div className="know-row" key={i}>
            <span className="know-badge">{String.fromCharCode(65 + i)}</span>
            <div>
              <div className="know-sub">ปัญหา: {CARE_PROBLEM_LABELS[i]}</div>
              <span>{m}</span>
            </div>
          </div>
        ))}
      </div>
      <div className="panel">
        <h3>ชนิดปุ๋ย</h3>
        {fertilizers.map((f, i) => {
          const detail = FERTILIZER_DETAILS[i];
          const suitedCrops = CROPS.filter((c) => CROP_FERT_CORRECT[c.id] === i);
          return (
            <div className="know-row" key={i}>
              <span className="know-icon">🌿</span>
              <div>
                <b>{f.label}</b><div className="know-sub">{f.sub}</div>
                {detail && (
                  <>
                    <div className="know-sub know-fert-npk">{detail.npk}</div>
                    <div className="know-sub">{detail.desc}</div>
                  </>
                )}
                {suitedCrops.length > 0 && (
                  <div className="fit-tags best know-fert-crops">
                    {suitedCrops.map((c) => (
                      <span key={c.id} className="fit-tag fit-tag-crop">
                        <img src={c.img} alt="" />{c.nameTh}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div className="panel">
        <h3>ชุดดินในเกม</h3>
        {SOIL.map((s) => (
          <div className="know-row" key={s.id}>
            <img className="know-soil-icon" src={s.img} alt="" />
            <div>
              <div>{s.nameTh}</div>
              <div className="know-sub">
                มักพบปัญหา: {SOIL_PROBLEMS[s.id].map((p, i) => (
                  <span key={p.label}>
                    {i > 0 ? ', ' : ''}{p.label} <span className="know-care-ref">({String.fromCharCode(65 + p.careIdx)})</span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="panel">
        <h3>พืชเหมาะกับดินแบบไหน</h3>
        <div className="fit-legend">
          <span className="fit-legend-item"><i className="fit-dot best" />เหมาะมากที่สุด</span>
        </div>
        {CROP_KNOWLEDGE.map((c) => (
          <div className="crop-fit-row" key={c.id}>
            <img className="crop-fit-icon" src={c.img} alt="" />
            <div className="crop-fit-body">
              <div className="crop-fit-name">{c.nameTh}</div>
              <SoilTagList ids={c.best} cls="best" />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
