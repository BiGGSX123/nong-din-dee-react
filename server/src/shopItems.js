// shop catalog — the server's prices are the ones that count (a client can't
// pick its own price). Mirrors SHOP_ITEMS in src/data/shopItems.js, which adds
// the names/icons/descriptions the UI shows.
export const ITEM_PRICES = {
  time: 30, // +10s on the current question
  fifty: 40, // hide half the wrong choices (map quiz)
  double: 80, // x2 points for this level / quick-quiz round
};
