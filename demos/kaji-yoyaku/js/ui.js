// 画面の共通部分（トップ・予約フロー・管理画面で使う）。
// 文字サイズ切替、下部のデモ注記帯、モーダル、×の理由の文言、DOM を組む小さな道具。

/* ---------- DOM を組む道具 ---------- */
// h("button", { class: "btn", onclick: fn, dataset: { step: 1 } }, "文字", 子要素…)
export function h(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === "class") node.className = v;
    else if (k === "dataset") Object.assign(node.dataset, v);
    else if (k.startsWith("on") && typeof v === "function") node.addEventListener(k.slice(2), v);
    else if (k === "html") node.innerHTML = v;
    else node.setAttribute(k, v === true ? "" : String(v));
  }
  for (const c of children.flat(Infinity)) {
    if (c == null || c === false) continue;
    node.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return node;
}

// 店名（架空）。本制作でお店の屋号に置き換える。表示はここだけを読む
export const SHOP_NAME = "高尾の家事手伝い みどり";

/* ---------- ×の理由コード → 画面の文言（対応はここ1か所） ---------- */
export const REASON_TEXT = {
  DAY_OFF: "お休み",
  OUTSIDE_HOURS: "お休み",
  INSUFFICIENT_TIME: "時間が足りません",
  BOOKED: "予約済み",
  PAST: "受付終了",
};
export const reasonText = (code) => REASON_TEXT[code] || "予約できません";

// 「山本 さち子」→「山本」（店の名前は姓と名を空白で区切る）
export const familyName = (name) => String(name).split(/\s+/)[0];

/* ---------- 文字サイズ切替（標準／大きく） ---------- */
// store の prefs に記憶し、<html data-font-scale> に反映する。
// 切替の部品は mount の中に作る（固定ヘッダーの外に置く）。
export function applyFontScale(scale) {
  document.documentElement.dataset.fontScale = scale === "large" ? "large" : "normal";
}

export function mountFontScale(mount, store) {
  const current = store.getPrefs().fontScale;
  applyFontScale(current);
  const options = [
    ["normal", "標準"],
    ["large", "大きく"],
  ].map(([value, label]) =>
    h("button", {
      type: "button", class: "scale-switch__option", role: "radio",
      "aria-checked": String(value === current), "data-font-scale": value,
    }, label));
  const group = h("div", { class: "scale-switch__group", role: "radiogroup", "aria-labelledby": "scale-label" }, options);
  const select = (btn) => {
    for (const b of options) {
      b.setAttribute("aria-checked", String(b === btn));
      b.tabIndex = b === btn ? 0 : -1;
    }
    applyFontScale(btn.dataset.fontScale);
    store.setPrefs({ fontScale: btn.dataset.fontScale });
  };
  options.forEach((b) => { b.tabIndex = b.getAttribute("aria-checked") === "true" ? 0 : -1; });
  group.addEventListener("click", (e) => {
    const btn = e.target.closest(".scale-switch__option");
    if (btn) select(btn);
  });
  group.addEventListener("keydown", (e) => {
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) return;
    e.preventDefault();
    const i = options.indexOf(document.activeElement);
    const next = options[(i + 1) % options.length];
    select(next);
    next.focus();
  });
  mount.replaceChildren(h("div", { class: "scale-switch" }, h("span", { id: "scale-label" }, "文字の大きさ"), group));
}

/* ---------- モーダル ---------- */
// openModal({ title, body: 文字列か Node か配列, actions: [{ label, value, primary }] }) → 押されたボタンの value
export function openModal({ title, body, actions = [{ label: "閉じる", value: "close", primary: true }] }) {
  const titleId = `modal-title-${Date.now()}`;
  const paragraphs = (Array.isArray(body) ? body : [body]).map((b) => (b instanceof Node ? b : h("p", {}, b)));
  const dialog = h("dialog", { class: "modal", "aria-labelledby": titleId },
    h("div", { class: "modal__body stack" }, h("h2", { class: "modal__title title-step", id: titleId }, title), paragraphs),
    h("form", { class: "modal__actions", method: "dialog" },
      actions.map((a) => h("button", {
        class: `btn ${a.primary ? "btn--primary" : "btn--secondary"}`, value: a.value,
      }, a.label))));
  document.body.append(dialog);
  return new Promise((resolve) => {
    dialog.addEventListener("close", () => {
      resolve(dialog.returnValue || "close");
      dialog.remove();
    });
    dialog.showModal();
  });
}

/* ---------- 下部のデモ注記帯（常時） ---------- */
// 390px で1行に収まる短い文言だけを置く。架空である旨は ABOUT_DEMO をページ下からモーダルで見せる。
export const DEMO_BAND_TEXT = "ご提案用のデモです。実際の請求はありません";
export const ABOUT_DEMO = [
  "このサイトは、ご提案のために作ったデモです。店名・スタッフ・料金の条件・見本のお客様は、すべて架空です。",
  "予約の内容は、お使いの端末のブラウザの中にだけ保存されます。ほかの端末やご家族の画面とは共有されません。",
  "お支払いはテスト用の画面で行い、実際の請求はありません。",
];

export function mountDemoBand() {
  if (document.querySelector(".demo-band")) return;
  document.body.append(h("div", { class: "demo-band", role: "note" }, h("p", {}, DEMO_BAND_TEXT)));
}

// ページ下に置く「このデモについて」のボタン（モーダルで ABOUT_DEMO を出す）
export function aboutDemoButton(label = "このデモについて（店名・スタッフは架空です）") {
  return h("button", {
    type: "button", class: "link link--action",
    onclick: () => openModal({ title: "このデモについて", body: ABOUT_DEMO }),
  }, label);
}
