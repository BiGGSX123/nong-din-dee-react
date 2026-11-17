import { SHOP_ITEMS } from '../data/shopItems';

// row of power-up buttons shown during a quiz. `mode` filters which items
// apply ('map' | 'tf'); `active` marks an item already in effect (e.g. x2 on);
// `blocked` disables everything (e.g. the question was already answered).
export default function ItemBar({ mode, inventory, active = {}, blocked = false, onUse }) {
  const items = SHOP_ITEMS.filter((i) => i.modes.includes(mode));
  return (
    <div className="item-bar" role="group" aria-label="ไอเทม">
      {items.map((item) => {
        const count = inventory[item.id] || 0;
        const on = Boolean(active[item.id]);
        return (
          <button
            key={item.id}
            type="button"
            className={`item-btn ${on ? 'on' : ''}`}
            disabled={blocked || on || count < 1}
            onClick={() => onUse(item.id)}
            title={item.desc}
          >
            {item.img
              ? <img className="item-btn-icon" src={item.img} alt="" />
              : <span className="item-btn-icon" aria-hidden="true">{item.icon}</span>}
            <span className="item-btn-name">{on ? 'ใช้อยู่' : item.name}</span>
            {!on && <span className="item-btn-count">{count}</span>}
          </button>
        );
      })}
    </div>
  );
}
