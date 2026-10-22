// 管理画面の画面ロジック（admin.html）。認証なしのデモ。
// 予約一覧・スタッフの休み・今週の空き状況・初期化。変更は store に即保存する（予約画面は読み込み時に読む）。
import { CONFIG } from "./config.js";
import { formatDate, formatRange, formatYen, dateParts, toISODate, addDays } from "./format.js";
import { bookingState, findConflicts, openStarts } from "./availability.js";
import { createStore } from "./store.js";
import { h, openModal, familyName, mountFontScale, mountDemoBand, aboutDemoButton, SHOP_NAME } from "./ui.js";

const store = createStore(window.localStorage);
const $ = (sel) => document.querySelector(sel);

const today = () => toISODate(new Date());
const dates = (n) => Array.from({ length: n }, (_, i) => addDays(today(), i));
const staffById = (list, id) => list.find((s) => s.id === id) || null;
const dowOf = (iso) => { const [y, m, d] = iso.split("-").map(Number); return new Date(y, m - 1, d).getDay(); };

/* ---------- 担当の丸い写真（無ければ杉緑の円に姓の1字） ---------- */
function avatar(s, size = "") {
  const initial = h("span", { class: "avatar__initial" }, familyName(s.name)[0]);
  const img = h("img", { class: "avatar__img", src: `assets/staff-${s.id}.webp`, alt: "", width: 48, height: 48, decoding: "async" });
  img.addEventListener("error", () => img.remove());
  return h("span", { class: `avatar ${size}`.trim(), "aria-hidden": "true" }, initial, img);
}

/* ================= 予約の一覧 ================= */
const STATE_TEXT = { paid: "支払い済み", pending: "決済待ち", expired: "期限切れ", cancelled: "取り消し" };

function stateLabel(b, state, now) {
  if (state !== "pending") return STATE_TEXT[state];
  const min = Math.max(1, Math.ceil((new Date(b.expiresAt).getTime() - now.getTime()) / 60000));
  return `決済待ち（残り${min}分）`;
}

function bookingRow(b, ctx) {
  const { staff, now, conflicts } = ctx;
  const state = bookingState(b, now);
  const s = staffById(staff, b.staffId);
  const proxy = b.customer?.proxy;
  const isConflict = conflicts.has(b.id);
  const sid = b.sessionId ? String(b.sessionId).slice(-6) : null;
  const cancellable = state === "paid" || state === "pending";

  return h("tr", { dataset: { bookingId: b.id, state, ...(isConflict ? { conflict: "true" } : {}) } },
    h("td", { class: "bk__when" },
      h("span", { class: "bk__date" }, formatDate(b.date)),
      h("span", { class: "bk__time" }, formatRange(b.start, b.hours))),
    h("td", { class: "bk__state" },
      h("span", { class: "state" }, stateLabel(b, state, now)),
      isConflict && h("span", { class: "bk__conflict" }, "重複",
        h("span", { class: "bk__conflict-note" }, sid ? `決済の番号 ${sid}` : "ほかの予約と時間が重なっています"))),
    h("td", { class: "bk__staff" }, s ? [avatar(s), h("span", {}, familyName(s.name))] : "担当者"),
    h("td", { class: "bk__hours" }, `${b.hours}時間`),
    h("td", { class: "bk__amount num-cell" }, formatYen(b.amount)),
    h("td", { class: "bk__customer" },
      h("span", { class: "bk__name" }, `${b.customer?.name ?? ""} 様`),
      proxy?.name && h("span", { class: "bk__proxy" }, `ご家族：${proxy.name}様`)),
    h("td", { class: "bk__id" }, b.id),
    h("td", { class: "bk__action" }, cancellable && h("button", {
      type: "button", class: "btn btn--secondary btn--small", "data-action": "cancel",
      "aria-label": `${b.id}を取り消す`, onclick: () => cancelFlow(b, s),
    }, "取り消す")));
}

let lastSig = "";
function renderBookings() {
  const now = new Date();
  const staff = store.getStaff();
  const bookings = store.getBookings();
  const conflicts = findConflicts(bookings, now);
  const rows = bookings.map((b) => bookingRow(b, { staff, now, conflicts }));
  const counts = { paid: 0, pending: 0, expired: 0, cancelled: 0 };
  bookings.forEach((b) => { counts[bookingState(b, now)]++; });
  $("#bookings-summary").textContent = bookings.length
    ? `全${bookings.length}件。支払い済み${counts.paid}件、決済待ち${counts.pending}件、期限切れ${counts.expired}件、取り消し${counts.cancelled}件。日付の早い順です。`
    : "";
  // 内容が変わらない時は描き直さない（操作中のボタンを奪わない）
  const sig = rows.map((r) => r.outerHTML).join("");
  if (sig === lastSig && $("#bookings").firstChild) return;
  lastSig = sig;
  if (!bookings.length) {
    $("#bookings").replaceChildren(h("p", { class: "admin__empty" }, "予約はまだありません。予約画面から入れると、ここに並びます。"));
    return;
  }
  const head = h("tr", {}, ["日時", "状態", "担当", "時間", "金額", "お客様", "予約番号"].map((t) => h("th", { scope: "col" }, t)),
    h("th", { scope: "col" }, h("span", { class: "visually-hidden" }, "操作")));
  $("#bookings").replaceChildren(h("div", { class: "table-wrap" },
    h("table", { class: "table table--admin admin-table" }, h("thead", {}, head), h("tbody", {}, rows))));
}

async function cancelFlow(b, s) {
  const answer = await openModal({
    title: "この予約を取り消しますか",
    body: [
      `${b.id}　${formatDate(b.date)} ${formatRange(b.start, b.hours)}、${s ? familyName(s.name) : "担当者"}、${b.customer?.name ?? ""}様のご予約です。`,
      "取り消すと、この時間は予約画面で ○ に戻ります。元には戻せません。",
    ],
    actions: [{ label: "やめる", value: "keep" }, { label: "取り消す", value: "yes", primary: true }],
  });
  if (answer !== "yes") return;
  store.cancelBooking(b.id);
  renderAll();
}

/* ================= スタッフの休み ================= */
function renderDayOff() {
  const staff = store.getStaff();
  const off = store.getDaysOff();
  const days = dates(CONFIG.bookableDays);
  const blocks = staff.map((s) => {
    const cells = days.map((date) => {
      const { day, dow } = dateParts(date);
      const works = s.workDays.includes(dowOf(date));
      const isOff = off.some((o) => o.staffId === s.id && o.date === date);
      const kind = !works ? "none" : isOff ? "off" : "on";
      const word = { none: "勤務日ではない", off: "休み", on: "出勤" }[kind];
      return h("button", {
        type: "button", role: "switch", class: "dayoff", "aria-checked": String(kind === "off"),
        "aria-disabled": kind === "none" ? "true" : null,
        "aria-label": `${s.name} ${formatDate(date)} ${word}`,
        dataset: { dayoff: "", staff: s.id, date, kind },
        onclick: () => {
          if (kind === "none") return;
          store.toggleDayOff(s.id, date);
          renderAll();
          document.querySelector(`[data-dayoff][data-staff="${s.id}"][data-date="${date}"]`)?.focus();
        },
      }, h("span", { class: "dayoff__num" }, day), h("span", { class: "dayoff__dow" }, dow),
      h("span", { class: "dayoff__word", "aria-hidden": "true" }, kind === "none" ? "" : word));
    });
    const workText = s.workDays.map((d) => "日月火水木金土"[d]).join("") + `（${s.start}時から${s.end}時）`;
    return h("div", { class: "dayoff-block", role: "group", "aria-label": s.name },
      h("div", { class: "dayoff-block__who" }, avatar(s, "avatar--lg"),
        h("div", {}, h("p", { class: "dayoff-block__name" }, s.name), h("p", { class: "note" }, `勤務日：${workText}`))),
      h("div", { class: "dayoff-grid" }, cells));
  });
  $("#dayoff").replaceChildren(...blocks);
}

/* ================= 今週の空き状況（2時間利用） ================= */
function renderWeek() {
  const staff = store.getStaff();
  const ctx = { bookings: store.getBookings(), daysOff: store.getDaysOff(), now: new Date() };
  const days = dates(7);
  const head = h("tr", {}, h("th", { scope: "col" }, "担当"), days.map((d) => {
    const p = dateParts(d);
    return h("th", { scope: "col", class: "week__day" }, `${p.month}/${p.day}`, h("span", { class: "week__dow" }, `（${p.dow}）`));
  }));
  const rows = staff.map((s) => h("tr", {},
    h("th", { scope: "row", class: "week__who" }, avatar(s), h("span", {}, familyName(s.name))),
    days.map((date) => {
      const n = openStarts({ staff: s, date, hours: 2, starts: CONFIG.slotStarts, ...ctx }).length;
      return h("td", { class: "week__cell", dataset: { weekCell: "", staff: s.id, date, open: String(n > 0) } },
        n > 0 ? [h("span", { class: "week__ok" }, "○"), `${n}枠`] : h("span", { class: "week__ng" }, "×"));
    })));
  $("#week").replaceChildren(h("div", { class: "table-wrap" },
    h("table", { class: "table week" }, h("thead", {}, head), h("tbody", {}, rows))));
}

/* ================= 初期化 ================= */
async function resetFlow() {
  const answer = await openModal({
    title: "デモデータを初期状態に戻しますか",
    body: ["入れた予約と休みの設定がすべて消え、最初の見本の状態になります。元には戻せません。"],
    actions: [{ label: "やめる", value: "keep" }, { label: "初期状態に戻す", value: "yes", primary: true }],
  });
  if (answer !== "yes") return;
  store.reset();
  lastSig = "";
  renderAll();
}

function renderAll() {
  renderBookings();
  renderDayOff();
  renderWeek();
}

/* ================= 読み込み時 ================= */
function init() {
  $("#topline").append(h("div", { class: "topline__inner" },
    h("a", { class: "topline__shop", href: "index.html" }, SHOP_NAME),
    h("div", { id: "font-scale" })));
  mountFontScale($("#font-scale"), store);
  $("#admin-foot").append(aboutDemoButton());
  mountDemoBand();
  $("[data-action='reset']").addEventListener("click", resetFlow);
  renderAll();
  // 残り分数と期限切れを進める。別のタブでの変更、戻ってきた時も読み直す
  setInterval(renderAll, 20000);
  window.addEventListener("storage", renderAll);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) renderAll(); });
  window.addEventListener("pageshow", (e) => { if (e.persisted) renderAll(); });
}
init();
