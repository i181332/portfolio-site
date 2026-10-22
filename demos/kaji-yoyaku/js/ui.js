// 全ページの共通部品。各ページはこれを呼ぶだけ。
// ヘッダーとフッター（mountChrome）、文字サイズ切替、デモ注記帯、予約ボタン（Square 予約へ）、モーダル、DOM を組む小さな道具。
import { CONFIG } from "./config.js";
import { NAV } from "./content.js";

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

// 「山本 さち子」→「山本」（店の名前は姓と名を空白で区切る）
export const familyName = (name) => String(name).split(/\s+/)[0];

// ページの名前（"staff.html" など）。トップの "/" は index.html
export const currentPage = () => location.pathname.split("/").pop() || "index.html";

/* ---------- 文字サイズ切替（標準／大きく） ---------- */
// localStorage の kajiDemo.prefs（{"fontScale":"normal|large"}）に記憶し、<html data-font-scale> に反映する。
const PREFS_KEY = `${CONFIG.storagePrefix}prefs`;
const readPrefs = () => {
  try {
    const p = JSON.parse(localStorage.getItem(PREFS_KEY));
    return p && typeof p === "object" && !Array.isArray(p) ? p : {};
  } catch { return {}; }
};
const writePrefs = (patch) => {
  try { localStorage.setItem(PREFS_KEY, JSON.stringify({ ...readPrefs(), ...patch })); } catch { /* 保存できない端末では、このページの間だけ効く */ }
};

export function applyFontScale(scale) {
  document.documentElement.dataset.fontScale = scale === "large" ? "large" : "normal";
}

export function mountFontScale(mount) {
  const current = readPrefs().fontScale === "large" ? "large" : "normal";
  applyFontScale(current);
  const options = [
    ["normal", "標準"],
    ["large", "大きく"],
  ].map(([value, label]) =>
    h("button", { type: "button", class: "scale-switch__option", "aria-pressed": String(value === current), "data-font-scale": value }, label));
  const group = h("div", { class: "scale-switch__group", role: "group", "aria-labelledby": "scale-label" }, options);
  group.addEventListener("click", (e) => {
    const btn = e.target.closest(".scale-switch__option");
    if (!btn) return;
    for (const b of options) b.setAttribute("aria-pressed", String(b === btn));
    applyFontScale(btn.dataset.fontScale);
    writePrefs({ fontScale: btn.dataset.fontScale });
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
// 390px で1行に収まる短い文言だけを置く。架空である旨は ABOUT_DEMO をフッターからモーダルで見せる。
export const DEMO_BAND_TEXT = "ご提案用のデモです。実際の請求はありません";
export const ABOUT_DEMO = [
  "このサイトは、ご提案のために作ったデモです。店名、スタッフ、料金の条件は、すべて架空です。",
  "予約は、予約システム（Square 予約）の実際の画面で行います。架空の店のため、予約してもお伺いはしません。",
  "カード払いは、テスト用の支払い画面で試せます。実際の請求はありません。",
];

export function mountDemoBand() {
  if (document.querySelector("[data-demo-band]")) return;
  document.body.append(h("div", { class: "demo-band", role: "note", "data-demo-band": "" }, h("p", {}, DEMO_BAND_TEXT)));
}

// フッターに置く「このデモについて」のボタン（モーダルで ABOUT_DEMO を出す）
export function aboutDemoButton(label = "このデモについて（店名とスタッフは架空です）") {
  return h("button", {
    type: "button", class: "link link--action",
    onclick: () => openModal({ title: "このデモについて", body: ABOUT_DEMO }),
  }, label);
}

/* ---------- 予約（Square 予約へ） ---------- */
// 担当の入口が空なら店全体、店全体も空なら null
export function bookingHref(staffId) {
  const { shop, staff } = CONFIG.booking;
  return (staffId && staff[staffId]) || shop || null;
}

const BOOKING_PENDING = {
  title: "予約システム（Square 予約）を準備中です",
  body: [
    "このボタンから、予約システム（Square 予約）の画面へ進みます。担当と日時を選び、カードでお支払いいただくと予約が決まります。",
    "デモの準備が整うまで、もうしばらくお待ちください。",
  ],
};

// [data-book="any|s1|s2|s3"] のリンクとボタンに予約の URL を付ける。URL が無い間は、押すと準備中のモーダル
export function wireBookingButtons(root = document) {
  for (const el of root.querySelectorAll("[data-book]")) {
    const id = el.dataset.book;
    const url = bookingHref(id === "any" ? null : id);
    if (url && el.tagName === "A") { el.href = url; continue; }
    if (el.tagName === "A") { el.setAttribute("href", "#"); el.setAttribute("aria-haspopup", "dialog"); }
    el.addEventListener("click", (e) => {
      e.preventDefault();
      if (url) location.href = url;
      else openModal(BOOKING_PENDING);
    });
  }
}

// 予約ボタンの直前か直後に置く、小さな注記
export function bookingNote() {
  return h("p", { class: "booking-note", "data-booking-note": "" }, "ここから先は予約システム（Square 予約）の画面です。本番も同じ画面です");
}

/* ---------- ヘッダーとフッター ---------- */
const LEGAL = {
  law: { title: "特定商取引法に基づく表記", body: ["事業者名、所在地、連絡先、料金とお支払いの方法、取り消しの決まりなどを掲載します。", "本制作時に、お店の情報をもとに正式な文面を作成します。"] },
  privacy: { title: "プライバシーポリシー", body: ["お預かりするお名前、ご住所、電話番号の使い道と、管理の方法を掲載します。", "本制作時に、お店の運用に合わせて正式な文面を作成します。"] },
};

const navList = (cls, current) => h("ul", { class: cls, role: "list" },
  NAV.map((n) => h("li", {}, h("a", {
    href: n.href,
    "aria-current": n.href === current ? "page" : null,
    "data-nav-current": n.href === current ? "" : null,
  }, n.label))));

// <header data-chrome>・<footer data-chrome> の中を組み、文字サイズ切替とデモ注記帯を置く。current はメニューの今のページ
export function mountChrome({ current } = {}) {
  const header = document.querySelector("header[data-chrome]");
  const footer = document.querySelector("footer[data-chrome]");

  if (header) {
    const scale = h("div", { class: "topline__scale" });
    const list = navList("gnav__list", current);
    list.id = "gnav-list";
    const toggle = h("button", { type: "button", class: "gnav__toggle", "aria-expanded": "false", "aria-controls": "gnav-list" },
      h("span", { class: "gnav__icon", "aria-hidden": "true" }), "メニュー");
    toggle.addEventListener("click", () => toggle.setAttribute("aria-expanded", String(toggle.getAttribute("aria-expanded") !== "true")));
    header.classList.add("chrome");
    header.replaceChildren(
      h("div", { class: "topline" }, h("div", { class: "topline__inner" },
        h("a", { class: "topline__shop", href: "index.html" }, CONFIG.shopName), toggle, scale)),
      h("nav", { class: "gnav", "aria-label": "メニュー" }, h("div", { class: "gnav__inner" }, list)));
    mountFontScale(scale);
  }

  if (footer) {
    footer.classList.add("band", "band--sugi", "foot");
    footer.replaceChildren(h("div", { class: "container foot__inner" },
      h("div", { class: "foot__id" },
        h("p", { class: "foot__shop" }, CONFIG.shopName),
        h("p", { class: "foot__area" }, `対応エリア　${CONFIG.area}`)),
      h("nav", { class: "foot__nav", "aria-label": "サイトの案内" }, navList("foot__navlist")),
      h("ul", { class: "foot__links", role: "list" },
        Object.entries(LEGAL).map(([key, m]) => h("li", {},
          h("button", { type: "button", class: "link link--action", "data-legal": key, onclick: () => openModal(m) }, m.title))),
        h("li", {}, aboutDemoButton("このデモについて")))));
  }

  mountDemoBand();
}
