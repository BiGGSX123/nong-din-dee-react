import { CROPS, SOIL } from '../data/content';

export default function CollectionScreen({ levels, levelStatus }) {
  const discoveredCropIds = new Set(
    levelStatus.filter((s) => s.completed && s.stars >= 2 && s.pickedCropId).map((s) => s.pickedCropId)
  );
  const discoveredSoilIds = new Set(
    levels.filter((lvl, i) => levelStatus[i].completed && levelStatus[i].stars >= 2).map((lvl) => lvl.soilId)
  );

  return (
    <>
      <h1>คลังสะสม</h1>
      <div className="lede">สะสมพืชที่เคยปลูกและชุดดินที่เคยเจอระหว่างเก็บเกี่ยว</div>
      <div className="panel">
        <h3>พืชที่เคยปลูก <span className="dex-count">{discoveredCropIds.size}/{CROPS.length}</span></h3>
        <div className="dex-grid">
          {CROPS.map((c) => {
            const found = discoveredCropIds.has(c.id);
            return (
              <div className={`dex-item ${found ? '' : 'locked'}`} key={c.id}>
                <img src={c.img} alt="" />
                <div className="dex-name">{found ? c.nameTh : '???'}</div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="panel">
        <h3>ชุดดินที่เคยเจอ <span className="dex-count">{discoveredSoilIds.size}/{SOIL.length}</span></h3>
        <div className="dex-grid">
          {SOIL.map((s) => {
            const found = discoveredSoilIds.has(s.id);
            return (
              <div className={`dex-item ${found ? '' : 'locked'}`} key={s.id}>
                <img src={s.img} alt="" />
                <div className="dex-name">{found ? s.nameTh : '???'}</div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
