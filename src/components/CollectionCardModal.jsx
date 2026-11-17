import { createPortal } from 'react-dom';

export default function CollectionCardModal({ item, onClose }) {
  if (!item) return null;
  return createPortal(
    <div className="card-detail-overlay" onClick={onClose}>
      <div className="card-detail-card" onClick={(e) => e.stopPropagation()}>
        <button className="card-detail-close" type="button" onClick={onClose} aria-label="ปิด">✕</button>
        <div className="card-detail-art">
          <img src={item.img} alt="" />
        </div>
        <h2>{item.name}</h2>
      </div>
    </div>,
    document.body
  );
}
