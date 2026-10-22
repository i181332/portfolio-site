// 予約フローの画面ロジック（booking.html）。
// 手順は #step-1〜#step-4 と #testpay・#unpaid・#notice・#done。history.pushState で積み、
// 端末の戻る（popstate）と画面の「戻る」は同じ go() を通る。
import { CONFIG } from "./config.js";
import { formatDate, formatHour, formatYen, yenParts, dateParts, toISODate, addDays } from "./format.js";
import { slotStatus, slotStatusAny, assignStaff, dayHasOpening, bookingState } from "./availability.js";
import { createStore } from "./store.js";
import { h, reasonText, familyName, mountFontScale, mountDemoBand, aboutDemoButton, openModal, SHOP_NAME } from "./ui.js";

const store = createStore(window.localStorage);
const $ = (sel, root = document) => root.querySelector(sel);
const flow = $("#flow");

/* ================= 選んだ内容（下書きはタブの間だけ残す） ================= */
const DRAFT_KEY = CONFIG.storagePrefix + "flowDraft";
const blankSel = () => ({ staff: "any", hours: null, date: null, start: null, assigned: null, customer: null, keepDate: false });
let sel = blankSel();
const saveSel = () => { try { sessionStorage.setItem(DRAFT_KEY, JSON.stringify(sel)); } catch {} };
const loadSel = () => {
  try { return { ...blankSel(), ...JSON.parse(sessionStorage.getItem(DRAFT_KEY) || "{}") }; } catch { return blankSel(); }
};
const resetSel = (patch = {}) => { sel = { ...blankSel(), ...patch }; saveSel(); };

/* ================= データの読み出し ================= */
const staffAll = () => store.getStaff();
const staffById = (id) => staffAll().find((s) => s.id === id) || null;
const chosenStaffList = () => (sel.staff === "any" ? staffAll() : staffAll().filter((s) => s.id === sel.staff));
const ctx = () => ({ bookings: store.getBookings(), daysOff: store.getDaysOff(), now: new Date() });
const bookingById = (id) => store.getBookings().find((b) => b.id === id) || null;
const today = () => toISODate(new Date());
const bookableDates = () => Array.from({ length: CONFIG.bookableDays }, (_, i) => addDays(today(), i));
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];
const DOW = ["日", "月", "火", "水", "木", "金", "土"];
const deadlineText = (iso) => { const d = new Date(iso); return `${formatHour(d.getHours())}${d.getMinutes()}分`; };
const staffLabel = (id) => (staffById(id)?.name ?? "担当者");

/* ================= 手順の表示と履歴 ================= */
const LAST = 4; // 手順の数（1 利用時間 → 2 担当と日時 → 3 お客様情報 → 4 確認）
const ORDER = { 1: 1, 2: 2, 3: 3, 4: 4, testpay: 5, unpaid: 6, notice: 6, done: 7 };
const LABEL = { testpay: "お支払い", unpaid: "お支払いの確認", notice: "ご案内", done: "ご予約完了" };
const TITLE = {
  1: "利用時間を選んでください", 2: "担当と日時を選んでください",
  3: "お客様のことを教えてください", 4: "この内容で予約します",
};
let current = null;
let noticeKind = null;
let doneId = null;

const hashOf = (step) => (ORDER[step] <= LAST ? `#step-${step}` : `#${step}`);
function stepFromHash(hash) {
  const m = /^#step-([1-4])$/.exec(hash);
  if (m) return m[1];
  const name = hash.slice(1);
  return ["testpay", "unpaid", "notice", "done"].includes(name) ? name : "1";
}

// 足りない選択があれば、揃っている所まで戻す
function guard(step) {
  const n = ORDER[step];
  if (n >= 2 && n <= LAST && !sel.hours) return "1";
  if (n >= 3 && n <= LAST && (!sel.date || sel.start == null || !sel.assigned)) return "2";
  if (n === LAST && !sel.customer) return "3";
  if (step === "testpay") {
    const b = bookingById(store.getPendingId());
    return b && bookingState(b, new Date()) === "pending" ? step : "1";
  }
  if (step === "done" && !doneId) return "1";
  if (step === "notice" && !noticeKind) return "1";
  if (step === "unpaid") return store.getPendingId() ? step : "1";
  return step;
}

const RENDER = {
  1: renderHours, 2: renderPick, 3: renderCustomer, 4: renderConfirm,
  testpay: renderTestpay, unpaid: renderUnpaid, notice: renderNotice, done: renderDone,
};

// mode: "push"（進む）/ "replace"（置き換え）/ "pop"（端末の戻る・進む）/ "initial"
function go(step, mode = "push") {
  step = String(step);
  const target = guard(step);
  const prev = current;
  // 完了の後などに端末の戻るで、もう選べない手順の履歴に来たら、描かずにさらに戻る
  if (target !== step && mode === "pop" && prev && ORDER[step] < ORDER[prev] && history.state?.idx > 0) { history.back(); return; }
  if (target !== step) mode = mode === "pop" || mode === "initial" ? "replace" : mode;
  step = target;

  if (prev === "testpay" && step !== "testpay") releasePending(); // 支払わずに離れたら仮押さえを解く
  RENDER[step]();

  if (mode === "initial") flow.removeAttribute("data-dir");
  else flow.dataset.dir = prev && ORDER[step] < ORDER[prev] ? "back" : "forward";
  for (const sec of flow.querySelectorAll(":scope > [data-step]")) sec.hidden = sec.dataset.step !== step;

  const idx = history.state?.kaji ? history.state.idx : 0;
  const url = location.pathname + hashOf(step);
  if (mode === "push") history.pushState({ kaji: true, idx: idx + 1 }, "", url);
  else if (mode !== "pop") history.replaceState({ kaji: true, idx: mode === "initial" ? 0 : idx }, "", url);

  current = step;
  updateBar(step);
  if (mode !== "initial") {
    window.scrollTo({ top: 0 });
    $(`[data-step="${step}"] [tabindex="-1"]`)?.focus({ preventScroll: true });
    const label = ORDER[step] <= LAST ? `手順${step} / ${LAST}。${TITLE[step]}` : $(`[data-step="${step}"] h1`).textContent;
    $("#announce").textContent = label;
  }
}

function updateBar(step) {
  const label = $("#step-label");
  if (ORDER[step] <= LAST) label.replaceChildren("手順 ", h("b", {}, step), ` / ${LAST}`);
  else label.textContent = LABEL[step];
  $("#back").textContent = step === "1" || ["unpaid", "notice", "done"].includes(step) ? "トップへ" : "戻る";
}

function prevOf(step) {
  if (step === "testpay") return String(LAST);
  const n = Number(step);
  return n > 1 ? String(n - 1) : null;
}

// 画面の「戻る」：積んだ履歴があれば端末の戻ると同じく history.back()、無ければ前の手順へ置き換え
function onBack() {
  const prev = prevOf(current);
  if (!prev) { location.href = "index.html"; return; }
  if (history.state?.kaji && history.state.idx > 0) history.back();
  else go(prev, "replace");
}

window.addEventListener("popstate", () => go(stepFromHash(location.hash), "pop"));
$("#back").addEventListener("click", onBack);

/* ================= 選択の部品（role="radio" の束） ================= */
// 矢印キーで移動、aria-disabled は飛ばす。押されたら onPick(button)
function bindRadios(group, onPick) {
  const items = () => [...group.querySelectorAll('[role="radio"]')];
  const roving = () => {
    const all = items();
    const checked = all.find((b) => b.getAttribute("aria-checked") === "true")
      || all.find((b) => b.getAttribute("aria-disabled") !== "true") || all[0];
    all.forEach((b) => { b.tabIndex = b === checked ? 0 : -1; });
  };
  group.addEventListener("click", (e) => {
    const btn = e.target.closest('[role="radio"]');
    if (!btn || btn.getAttribute("aria-disabled") === "true") return;
    onPick(btn);
  });
  group.addEventListener("keydown", (e) => {
    const keys = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 };
    if (!(e.key in keys)) return;
    e.preventDefault();
    const usable = items().filter((b) => b.getAttribute("aria-disabled") !== "true");
    const i = usable.indexOf(document.activeElement);
    const next = usable[(i + keys[e.key] + usable.length) % usable.length];
    if (next) { onPick(next); next.focus(); }
  });
  group.roving = roving;
  return group;
}
const check = (group, btn) => {
  group.querySelectorAll('[role="radio"]').forEach((b) => b.setAttribute("aria-checked", String(b === btn)));
  group.roving?.();
};

// 選んだ内容を次の画面の上部に小さく残す
function renderCarry(step) {
  const rows = [["利用時間", `${sel.hours}時間`]];
  if (step >= 3) rows.push(["担当", staffLabel(sel.assigned)], ["日時", `${formatDate(sel.date)} ${formatHour(sel.start)}から`]);
  $(`[data-step="${step}"] [data-carry]`).replaceChildren(
    ...rows.flatMap(([k, v]) => [h("dt", {}, k), h("dd", {}, `${k}：${v}`)]));
}

/* ================= 手順1 利用時間 ================= */
const HOURS_DESC = {
  2: "掃除機がけと台所など、2つほどの作業に",
  3: "家じゅうの掃除機がけと水まわりなどに",
  4: "お部屋の片づけまで、まとめてお願いしたい時に",
};
const hoursList = bindRadios($("#hours-list"), (btn) => {
  sel.hours = Number(btn.dataset.hours);
  sel.start = null; sel.assigned = null; saveSel();
  check($("#hours-list"), btn);
});
function renderHours() {
  const rate = yenParts(CONFIG.hourlyRate);
  $("#rate-note").textContent = `料金は1時間${rate.num}${rate.unit}です。作業の前にカードでお支払いいただきます。`;
  hoursList.replaceChildren(...CONFIG.hoursOptions.map((n) => {
    const y = yenParts(n * CONFIG.hourlyRate);
    return h("button", { type: "button", class: "choice choice--hours", role: "radio", "data-hours": n },
      h("span", { class: "choice__body" },
        h("span", { class: "choice__title" }, h("span", { class: "figure" }, n, h("span", { class: "unit" }, "時間"))),
        h("span", { class: "choice__desc" }, HOURS_DESC[n] || "")),
      h("span", { class: "choice__aside figure figure--price" }, y.num, h("span", { class: "unit" }, y.unit)));
  }));
  if (!sel.hours) sel.hours = CONFIG.hoursOptions[0];
  check(hoursList, hoursList.querySelector(`[data-hours="${sel.hours}"]`));
}

/* ================= 手順2 担当と日時（1画面） ================= */
// 担当は横1列のタイル（どなたでも＋3名）。替えるとその場で日付と時刻の ○× が切り替わる
// 「どなたでも」の円は文字を置かず、3人の形だけ（下の名前「どなたでも」と言葉を重ねない）
const ANY_MARK = '<svg viewBox="0 0 40 28" width="40" height="28" fill="currentColor"><circle cx="9" cy="10" r="4.5"/><circle cx="31" cy="10" r="4.5"/><path d="M0 27c0-5 4-9 9-9s9 4 9 9zM22 27c0-5 4-9 9-9s9 4 9 9z" opacity=".65"/><circle cx="20" cy="8" r="5.5"/><path d="M9 28c0-7 5-12 11-12s11 5 11 12z"/></svg>';
const STAFF_PHOTO = (id) => `assets/staff-${id}.webp`;
function staffAvatar(s) {
  const initial = h("span", { class: "staffpick__initial" }, familyName(s.name)[0]);
  const img = h("img", { class: "staffpick__img", src: STAFF_PHOTO(s.id), alt: "", width: 64, height: 64, decoding: "async" });
  img.addEventListener("error", () => img.remove()); // 写真が無ければ杉緑の円に姓の1字
  img.addEventListener("load", () => img.closest(".staffpick__photo")?.classList.add("has-photo"));
  return h("span", { class: "staffpick__photo", "aria-hidden": "true" }, initial, img);
}
const staffList = bindRadios($("#staff-list"), (btn) => {
  if (sel.staff === btn.dataset.staff) return;
  sel.staff = btn.dataset.staff; saveSel(); // 自分で選んだ日付（keepDate）でなければ、新しい担当の最初の○の日に移る
  check($("#staff-list"), btn);
  renderIntro();
  renderSchedule({ swap: true });
});
function renderPick() { // 利用時間は上部に残さず、時刻の見出しに入れる（最初の画面に最初の時刻の行まで収めるため）
  if (sel.staff !== "any" && !staffById(sel.staff)) sel.staff = "any";
  const any = h("button", { type: "button", class: "staffpick__tile", role: "radio", "data-staff": "any", "aria-label": "どなたでも" },
    h("span", { class: "staffpick__photo staffpick__photo--any", "aria-hidden": "true", html: ANY_MARK }),
    h("span", { class: "staffpick__name", "aria-hidden": "true" }, "どなたでも"));
  const tiles = staffAll().map((s) => h("button", { type: "button", class: "staffpick__tile", role: "radio", "data-staff": s.id, "aria-label": s.name },
    staffAvatar(s), h("span", { class: "staffpick__name", "aria-hidden": "true" }, familyName(s.name))));
  staffList.replaceChildren(any, ...tiles);
  check(staffList, staffList.querySelector(`[data-staff="${sel.staff}"]`));
  renderIntro();
  renderSchedule();
}
// 選んだ担当の紹介（行の形。箱・影なし）
function renderIntro() {
  const box = $("#staff-intro");
  if (sel.staff === "any") {
    box.replaceChildren(
      h("p", { class: "staffintro__text" }, "その時間に空いている者がお伺いします。"));
    return;
  }
  const s = staffById(sel.staff);
  const days = WEEK_ORDER.filter((d) => s.workDays.includes(d)).map((d) => DOW[d]).join(" ");
  box.replaceChildren(
    h("p", { class: "staffintro__text" }, h("span", { class: "staffintro__name" }, s.name), s.intro),
    h("p", { class: "staffintro__meta" }, `得意なこと　${s.skills.join("、")}`),
    h("p", { class: "staffintro__meta staffintro__last" }, h("span", {}, `お伺いできる曜日　${days}`,
      h("span", { class: "nowrap" }, `（${formatHour(s.start)}〜${formatHour(s.end)}）`)),
      h("span", { class: "staffintro__photonote" }, "写真は素材です（本番はご本人）")));
}

/* ---- 日付の帯と時刻の縦1列（○×） ---- */
const dateStrip = bindRadios($("#date-strip"), (btn) => {
  sel.date = btn.dataset.date; sel.keepDate = true; sel.start = null; sel.assigned = null; saveSel();
  check($("#date-strip"), btn);
  renderSlots();
});
// 「前の日へ」「次の日へ」：選んだ日を1日ずらす（PC のマウスでも先の日へ動ける。帯は選んだ日を中央へ送る）
function stepDay(delta) {
  const dates = bookableDates();
  const i = dates.indexOf(sel.date) + delta;
  if (i < 0 || i >= dates.length) return;
  sel.date = dates[i]; sel.keepDate = true; sel.start = null; sel.assigned = null; saveSel();
  check(dateStrip, dateStrip.querySelector(`[data-date="${sel.date}"]`));
  centerSelectedDay();
  renderSlots();
}
function updateDayNav() {
  const dates = bookableDates();
  const i = dates.indexOf(sel.date);
  $("#day-prev").setAttribute("aria-disabled", String(i <= 0));
  $("#day-next").setAttribute("aria-disabled", String(i >= dates.length - 1));
}
for (const [id, d] of [["day-prev", -1], ["day-next", 1]]) {
  $(`#${id}`).addEventListener("click", (e) => { if (e.currentTarget.getAttribute("aria-disabled") !== "true") stepDay(d); });
}
function centerSelectedDay() {
  requestAnimationFrame(() => {
    const selected = dateStrip.querySelector('[aria-checked="true"]');
    if (!selected) return;
    const left = selected.offsetLeft - dateStrip.offsetLeft;
    dateStrip.scrollLeft = Math.max(0, left - (dateStrip.clientWidth - selected.offsetWidth) / 2);
  });
}
const slotList = bindRadios($("#slot-list"), (btn) => {
  sel.start = Number(btn.dataset.slot);
  sel.assigned = btn.dataset.assigned;
  saveSel();
  check($("#slot-list"), btn);
  updateDock();
  slotList.querySelectorAll(".slot[data-status=open] .mark-label").forEach((l) => {
    l.textContent = l.closest(".slot") === btn ? "選択中" : "空き";
  });
  // 主ボタンが出て下の固定欄が伸びるので、押した行がその後ろに隠れないように送る
  requestAnimationFrame(() => {
    const dockTop = $('[data-step="2"] .dock').getBoundingClientRect().top;
    const r = btn.getBoundingClientRect();
    if (r.bottom > dockTop - 8) window.scrollBy({ top: r.bottom - dockTop + 16 });
  });
});

// 下部の固定欄：時刻を選ぶまでは主ボタンを出さず、「下の時刻から1つ選んでください」の案内だけ
function updateDock() {
  const ready = sel.start != null && !!sel.assigned;
  $('[data-next="2"]').hidden = !ready;
  $("#slot-hint").hidden = ready;
  $("#picked").hidden = !ready;
  $("#picked").textContent = ready
    ? `${formatDate(sel.date)} ${formatHour(sel.start)}〜${formatHour(sel.start + sel.hours)}　担当：${familyName(staffLabel(sel.assigned))}`
    : "";
}
function renderSchedule({ swap = false } = {}) {
  if (swap) { // 担当を替えた時だけ短く切り替わる（reduced-motion では base.css が止める）
    const box = $("#schedule");
    box.classList.remove("is-swapping"); void box.offsetWidth; box.classList.add("is-swapping");
  }
  const list = chosenStaffList();
  const c = ctx();
  const dates = bookableDates();
  const opens = dates.map((date) => dayHasOpening({ staffList: list, date, hours: sel.hours, ...c, starts: CONFIG.slotStarts }));
  if (!dates.includes(sel.date) || (!sel.keepDate && !opens[dates.indexOf(sel.date)] && opens.includes(true))) {
    sel.date = dates[Math.max(0, opens.indexOf(true))];
    sel.start = null; sel.assigned = null;
  }
  dateStrip.replaceChildren(...dates.map((date, i) => {
    const p = dateParts(date);
    return h("button", { type: "button", class: "day", role: "radio", "data-date": date, "data-open": String(opens[i]) },
      h("span", { class: "day__num" }, h("span", { class: "day__month" }, `${p.month}/`), p.day),
      h("span", { class: "day__wd" }, p.dow),
      h("span", { class: "mark", "aria-hidden": "true" }),
      h("span", { class: "visually-hidden" }, opens[i] ? "空きあり" : "空きなし"));
  }));
  check(dateStrip, dateStrip.querySelector(`[data-date="${sel.date}"]`));
  centerSelectedDay();
  renderSlots();
}

function renderSlots() {
  const list = chosenStaffList();
  const c = ctx();
  const any = sel.staff === "any";
  const rows = CONFIG.slotStarts.map((start) => {
    const st = any
      ? slotStatusAny({ staffList: list, date: sel.date, start, hours: sel.hours, ...c })
      : (() => { const r = slotStatus({ staff: list[0], date: sel.date, start, hours: sel.hours, ...c }); return r.ok ? { ...r, staffId: list[0].id } : r; })();
    const time = formatHour(start);
    const pre = time.slice(0, 2);
    const btn = h("button", {
      type: "button", class: "slot", role: "radio", "aria-checked": "false",
      "data-slot": start, "data-status": st.ok ? "open" : "closed",
      "data-reason": st.ok ? null : st.reason, "aria-disabled": st.ok ? null : "true",
      "data-assigned": st.ok ? st.staffId : null,
    },
      h("span", { class: "slot__time" }, h("span", { class: "unit--pre" }, pre), h("span", { class: "num" }, start > 12 ? start - 12 : start === 12 ? 0 : start), h("span", { class: "unit" }, "時")),
      h("span", { class: "slot__state" }, h("span", { class: "mark", "aria-hidden": "true" }), h("span", { class: "mark-label" }, st.ok ? "空き" : reasonText(st.reason))),
      st.ok && any ? h("span", { class: "slot__staff" }, `担当：${familyName(staffLabel(st.staffId))}`) : null,
      st.ok ? h("span", { class: "slot__until" }, `${formatHour(start + sel.hours)}まで`) : null);
    return btn;
  });
  slotList.replaceChildren(...rows);
  const keep = sel.start != null && slotList.querySelector(`[data-slot="${sel.start}"][data-status=open]`);
  if (keep) { sel.assigned = keep.dataset.assigned; check(slotList, keep); keep.querySelector(".mark-label").textContent = "選択中"; }
  else { sel.start = null; sel.assigned = null; check(slotList, null); }
  saveSel();
  updateDock();

  const openCount = rows.filter((r) => r.dataset.status === "open").length;
  $("#slot-heading").textContent = `${formatDate(sel.date)}の開始時刻（${sel.hours}時間）`;
  const info = $("#day-info");
  info.hidden = openCount > 0;
  const who = sel.staff === "any" ? "" : `${familyName(staffLabel(sel.staff))}は`;
  info.textContent = openCount ? "" : `この日、${who}${sel.hours}時間で始められる時刻がありません。○の付いた日を選ぶか、担当を替えてください。`;
  updateDayNav();
}

/* ================= 手順3 お客様情報 ================= */
const form = $("#customer-form");
const proxy = $("#proxy");
function setProxy(on) {
  proxy.checked = on;
  $("#proxy-state").textContent = on ? "はい" : "いいえ";
  $("#proxy-fields").hidden = !on;
  $("#proxy-note").hidden = !on;
  $("#legend-user").textContent = on ? "ご利用になる方（お伺い先）のこと" : "ご本人のこと";
  $("#h-phone").textContent = on ? "ご本人に直接かけてよい場合だけご記入ください。" : "当日、お伺いの前にお電話することがあります。";
  $("#phone-label").textContent = on ? "ご利用になる方の電話番号" : "電話番号";
  $("#phone-req").textContent = on ? "なくてもかまいません" : "必須";
  $("#f-phone").toggleAttribute("data-optional", on);
  if (!on) for (const id of ["f-proxy-name", "f-proxy-phone"]) clearError($(`#${id}`));
}
proxy.addEventListener("change", () => setProxy(proxy.checked));

function fieldError(input, message) {
  const err = $(`#${input.id.replace(/^f-/, "e-")}`);
  err.textContent = message;
  err.hidden = false;
  input.setAttribute("aria-invalid", "true");
  const ids = new Set((input.getAttribute("aria-describedby") || "").split(/\s+/).filter(Boolean));
  ids.add(err.id);
  input.setAttribute("aria-describedby", [...ids].join(" "));
}
function clearError(input) {
  const err = $(`#${input.id.replace(/^f-/, "e-")}`);
  if (!err) return;
  err.hidden = true;
  input.removeAttribute("aria-invalid");
  const ids = (input.getAttribute("aria-describedby") || "").split(/\s+/).filter((x) => x && x !== err.id);
  if (ids.length) input.setAttribute("aria-describedby", ids.join(" ")); else input.removeAttribute("aria-describedby");
}
function validate(input) {
  if (input.closest("[hidden]")) { clearError(input); return true; }
  const v = input.value.trim();
  if (!v) {
    if (input.hasAttribute("data-optional")) { clearError(input); return true; }
    fieldError(input, input.dataset.required); return false;
  }
  if (input.hasAttribute("data-phone")) {
    const digits = v.replace(/[^0-9０-９]/g, "").length;
    if (digits < 10 || digits > 11) { fieldError(input, "電話番号は、市外局番から10けたか11けたの数字で入力してください。"); return false; }
  }
  clearError(input); return true;
}
form.addEventListener("input", (e) => { if (e.target.getAttribute("aria-invalid") === "true") validate(e.target); });
form.addEventListener("submit", (e) => {
  e.preventDefault();
  const inputs = [...form.querySelectorAll("[data-required]")];
  const bad = inputs.filter((i) => !validate(i));
  if (bad.length) { bad[0].focus(); return; }
  const val = (id) => $(`#${id}`).value.trim();
  sel.customer = {
    name: val("f-name"), phone: val("f-phone"), address: val("f-address"), notes: val("f-notes"),
    ...(proxy.checked ? { proxy: { name: val("f-proxy-name"), phone: val("f-proxy-phone") } } : {}),
  };
  saveSel();
  go("4");
});
$("#fill-sample").addEventListener("click", () => {
  const sample = { "f-name": "高尾 はな", "f-phone": "090-0000-1234", "f-address": "東京都八王子市高尾町 0-0（見本）", "f-notes": "台所の換気扇まわりを特にお願いします。" };
  if (proxy.checked) Object.assign(sample, { "f-name": "高尾 はな", "f-phone": "", "f-proxy-name": "高尾 ゆうこ", "f-proxy-phone": "080-0000-5678" });
  for (const [id, v] of Object.entries(sample)) { $(`#${id}`).value = v; clearError($(`#${id}`)); }
});
function renderCustomer() {
  renderCarry(3);
  const c = sel.customer;
  if (!c) return;
  $("#f-name").value = c.name; $("#f-phone").value = c.phone; $("#f-address").value = c.address; $("#f-notes").value = c.notes || "";
  setProxy(!!c.proxy);
  if (c.proxy) { $("#f-proxy-name").value = c.proxy.name; $("#f-proxy-phone").value = c.proxy.phone; }
}

/* ================= 手順4 確認（文章で読み上げる形） ================= */
function readoutOf(b) {
  const staff = staffLabel(b.staffId);
  const y = yenParts(b.amount ?? b.hours * CONFIG.hourlyRate);
  const c = b.customer;
  const lines = [
    h("p", { class: "readout__when" }, h("b", {}, formatDate(b.date)), "の", h("b", {}, `${formatHour(b.start)}から${formatHour(b.start + b.hours)}まで`), `（${b.hours}時間）、`, h("b", {}, staff), "がお伺いします。"),
    h("p", {}, "お伺い先は、", h("b", {}, c.address), "の", h("b", {}, `${c.name}様`), "のお宅です。"),
    c.proxy
      ? h("p", {}, "ご連絡は、ご家族の", h("b", {}, `${c.proxy.name}様`), `（${c.proxy.phone}）にいたします。`)
      : h("p", {}, "ご連絡先は ", h("b", {}, c.phone), " です。"),
    c.notes ? h("p", {}, "ご要望は「", c.notes, "」です。") : null,
    h("p", { class: "readout__price" }, "料金は ", h("span", { class: "figure figure--price" }, y.num, h("span", { class: "unit" }, y.unit)), " です。",
      h("span", { class: "readout__tax" }, "税込か税別かは、本制作の時に確かめて記載します。")),
  ];
  return lines.filter(Boolean); // replaceChildren は null を「null」の文字にするので、ここで落とす
}
function renderConfirm() {
  const draft = { staffId: sel.assigned, date: sel.date, start: sel.start, hours: sel.hours, customer: sel.customer };
  const extra = sel.staff === "any" ? h("p", { class: "note" }, "「どなたでも」でお選びいただいたので、この時間に空いている者がお伺いします。") : null;
  $("#readout").replaceChildren(...[...readoutOf(draft), extra].filter(Boolean));
  $("#pay-error").hidden = true;
}

$("#pay").addEventListener("click", () => {
  const c = ctx();
  let staffId = sel.assigned;
  const staff = staffById(staffId);
  const ok = staff && slotStatus({ staff, date: sel.date, start: sel.start, hours: sel.hours, ...c }).ok;
  if (!ok) {
    staffId = sel.staff === "any" ? assignStaff({ staffList: staffAll(), date: sel.date, start: sel.start, hours: sel.hours, ...c }) : null;
    if (!staffId) {
      const err = $("#pay-error");
      err.textContent = "この時間は、ついさきほど予約が入りました。お手数ですが「担当・日時を変える」から選び直してください。";
      err.hidden = false;
      return;
    }
    sel.assigned = staffId; saveSel();
  }
  const b = store.addBooking({ staffId, date: sel.date, start: sel.start, hours: sel.hours, customer: sel.customer });
  store.setPendingId(b.id);
  // 保存できない端末（プライベートモードなど）では、戻ってきた時に予約を照合できないので進まない
  const persistent = typeof store.isPersistent === "function" ? store.isPersistent() : true;
  if (!persistent) {
    store.cancelBooking(b.id);
    store.clearPendingId();
    const err = $("#pay-error");
    err.textContent = "この端末では予約を保存できないため、支払いに進めません。プライベートブラウズを終えるか、別のブラウザでお試しください。";
    err.hidden = false;
    return;
  }
  toPayment(b);
});
$("#flow").addEventListener("click", (e) => {
  const to = e.target.closest("[data-goto]");
  if (to) go(to.dataset.goto);
  const next = e.target.closest("[data-next]");
  if (next) onNext(next.dataset.next);
});
$("#flow").addEventListener("click", (e) => { if (e.target.closest("[data-policy]")) showPolicy(); });
// 取り消しの決まり（正式な規定は本制作でお店と決める）
function showPolicy() {
  openModal({ title: "取り消しの決まり", body: [
    "ご予約の取り消しや日時の変更について、いつまでなら無料か、いつから料金がかかるかを、ここに掲載します。",
    "正式な規定は、本制作の時にお店と決めて掲載します（このデモでは未定です）。",
  ] });
}
function onNext(step) {
  if (step === "2" && (sel.start == null || !sel.assigned)) {
    slotList.querySelector("[data-status=open]")?.focus();
    return;
  }
  go(String(Number(step) + 1));
}

/* ================= お支払い（Stripe Payment Link かデモ内のテスト決済） ================= */
function toPayment(b) {
  const link = CONFIG.paymentLinks[b.hours];
  if (link) {
    location.href = `${link}${link.includes("?") ? "&" : "?"}client_reference_id=${encodeURIComponent(b.id)}`;
  } else {
    go("testpay");
  }
}

// テスト決済の画面から支払わずに離れた時：仮押さえを取り消し、確認画面からやり直せるようにする
function releasePending() {
  const id = store.getPendingId();
  const b = id && bookingById(id);
  if (b && b.status === "pending") store.cancelBooking(id);
  store.clearPendingId();
}

// ?paid=1 と「支払う（テスト）」の共通処理
function completePayment(sessionId) {
  const id = store.getPendingId();
  const b = id && bookingById(id);
  if (!b) { store.clearPendingId(); noticeKind = "nopending"; return go("notice", "initial"); }
  store.markPaid(id, sessionId ? { sessionId } : {});
  store.clearPendingId();
  doneId = id;
  resetSel();
  current = "done"; // testpay から来ても仮押さえを解かない
  go("done", "replace");
}

function bookingSummary(b) {
  const y = yenParts(b.amount);
  return h("dl", { class: "summary" },
    h("div", {}, h("dt", {}, "予約番号"), h("dd", { class: "summary__id" }, b.id)),
    h("div", {}, h("dt", {}, "日時"), h("dd", {}, `${formatDate(b.date)} ${formatHour(b.start)}〜${formatHour(b.start + b.hours)}`)),
    h("div", {}, h("dt", {}, "担当"), h("dd", {}, staffLabel(b.staffId))),
    h("div", {}, h("dt", {}, "金額"), h("dd", {}, h("span", { class: "figure figure--price" }, y.num, h("span", { class: "unit" }, y.unit)), `（${b.hours}時間）`)));
}

function renderTestpay() {
  const b = bookingById(store.getPendingId());
  const y = yenParts(b.amount);
  $("#testpay").replaceChildren(
    h("p", { class: "testpay__lead" }, "ここはデモ用のお支払いの画面です。カード番号の入力はいらず、実際の請求もありません。"),
    h("div", { class: "testpay__card" },
      h("p", { class: "testpay__amount" }, h("span", { class: "testpay__label" }, "お支払い金額"), h("span", { class: "figure figure--price" }, y.num, h("span", { class: "unit" }, y.unit))),
      h("p", { class: "testpay__row" }, h("span", { class: "testpay__label" }, "内容"), `家事代行 ${b.hours}時間（${formatDate(b.date)} ${formatHour(b.start)}から）`),
      h("p", { class: "testpay__row" }, h("span", { class: "testpay__label" }, "カード"), "テスト用のカード（番号の入力は不要です）"),
      h("p", { class: "testpay__row" }, h("span", { class: "testpay__label" }, "予約番号"), b.id)),
    h("p", { class: "booking__deadline" }, `${deadlineText(b.expiresAt)}までにお支払いがないと、この時間をほかの方にお譲りします。「戻る」を押すと仮の予約を取り消し、確認の画面に戻ります。`),
    h("div", { class: "booking__actions" }, h("button", { type: "button", class: "btn btn--primary btn--block", "data-action": "testpay", onclick: () => completePayment(null) }, "支払う（テスト）")),
    h("p", { class: "note testpay__demo" }, "（デモの説明）本番では、カード決済サービス Stripe（ストライプ）のお支払い画面に移ります。"));
}

function renderUnpaid() {
  const b = bookingById(store.getPendingId());
  $("#unpaid").replaceChildren(
    h("p", { class: "booking__lead" }, `この予約は、まだお支払いが終わっていません。${deadlineText(b.expiresAt)}までにお支払いがないと、この時間をほかの方にお譲りします。`),
    bookingSummary(b),
    h("div", { class: "booking__actions booking__actions--pair" },
      h("button", { type: "button", class: "btn btn--primary btn--block", "data-action": "resume", onclick: () => toPayment(b) }, "支払いに進む"),
      h("button", { type: "button", class: "btn btn--secondary btn--block", "data-action": "cancel-pending", onclick: () => {
        store.cancelBooking(b.id); store.clearPendingId(); noticeKind = "cancelled"; go("notice", "replace");
      } }, "この予約を取り消す")));
}

const NOTICE = {
  expired: ["お支払いの期限が過ぎました", "15分以内にお支払いが終わらなかったため、仮に押さえていた時間をほかの方にお譲りしました。お手数ですが、もう一度お選びください。"],
  cancelled: ["予約を取り消しました", "仮に押さえていた時間を空けました。お支払いは発生していません。"],
  nopending: ["お支払いを確かめる予約が見つかりません", "この端末には、お支払いを待っている予約がありません。別の端末やブラウザで予約を始めた場合は、そちらの画面でご確認ください。"],
};
function renderNotice() {
  const [title, text] = NOTICE[noticeKind] || NOTICE.nopending;
  $("#h-notice").textContent = title;
  $("#notice").replaceChildren(h("p", { class: "booking__lead" }, text),
    h("div", { class: "booking__actions" }, h("button", { type: "button", class: "btn btn--primary btn--block", onclick: () => { resetSel(); go("1"); } }, "空き状況を見て予約する")));
}

// 完了：お客様向けに「誰の家に・いつ・誰が・誰へ連絡」と、この後の流れ・取り消しの連絡先・控え方。
// デモの仕組み（同じ時刻が×になる・お店の管理画面）は、下の「デモの確認用」の小さな行からだけ見せる
function renderDone() {
  const b = bookingById(doneId);
  const c = b.customer;
  const contact = c.proxy ? `ご家族の${c.proxy.name}様` : `${c.name}様`;
  const sub = (text) => h("h2", { class: "done__sub" }, text);
  $("#done").replaceChildren(
    h("p", { class: "done__id" }, "予約番号 ", h("b", { class: "summary__id" }, b.id), h("span", { class: "done__paid" }, "お支払い済み")),
    h("div", { class: "readout readout--done" }, readoutOf(b)),
    sub("この後の流れ"),
    h("ol", { class: "done__steps" },
      h("li", {}, `前日までに、お店から${contact}へお電話で内容をお確かめします。`),
      h("li", {}, `当日は${staffLabel(b.staffId)}がお伺いします。着く少し前に、${contact}へお電話します。`),
      h("li", {}, `作業が終わったら、${contact}へ作業のご報告をお届けします。`)),
    sub("取り消し・変更をしたい時"),
    h("p", {}, "お店へお電話ください。電話番号は", h("b", {}, "本制作時に掲載"), "します（このデモでは未定です）。"),
    h("p", {}, h("button", { type: "button", class: "link link--action", "data-policy": "" }, "取り消しの決まりを見る")),
    sub("この内容を控えておくには"),
    h("p", {}, "本番では、ご予約の内容を確認のメールか SMS（携帯電話のメッセージ）でお送りします。この画面を印刷するか、写真に撮って残すこともできます。"),
    h("div", { class: "booking__actions done__actions" },
      h("button", { type: "button", class: "btn btn--secondary btn--block", "data-action": "print", onclick: () => window.print() }, "この画面を印刷する"),
      h("a", { class: "link link--action", href: "index.html" }, "トップページへ")),
    h("p", { class: "done__democheck" }, "デモの確認用：",
      h("button", { type: "button", class: "link", "data-action": "see-slot", onclick: () => {
        resetSel({ staff: b.staffId, hours: b.hours, date: b.date, keepDate: true }); go("2");
      } }, "予約画面（デモ）"),
      h("span", { "aria-hidden": "true" }, "・"),
      h("a", { class: "link", href: "admin.html" }, "管理画面（デモ）")));
}

/* ================= 読み込み時 ================= */
// Stripe の画面から端末の戻るで帰った時（bfcache の復元）は、読み直して決済待ちの確認から始める
window.addEventListener("pageshow", (e) => { if (e.persisted) location.reload(); });

function init() {
  if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  document.querySelectorAll("[data-shop-name]").forEach((n) => { n.textContent = SHOP_NAME; });
  mountFontScale($("#font-scale"), store);
  $("#booking-foot").append(aboutDemoButton());
  mountDemoBand();

  const params = new URLSearchParams(location.search);
  sel = loadSel();

  if (params.get("paid") === "1") return completePayment(params.get("session_id"));

  const pid = store.getPendingId();
  if (pid) {
    const b = bookingById(pid);
    const state = b ? bookingState(b, new Date()) : null;
    if (state === "pending") {
      const resumeTest = location.hash === "#testpay" && !CONFIG.paymentLinks[b.hours];
      current = resumeTest ? null : "unpaid";
      return go(resumeTest ? "testpay" : "unpaid", "initial");
    }
    store.clearPendingId();
    if (state === "expired") { noticeKind = "expired"; return go("notice", "initial"); }
  }

  // トップの縮小表から：?staff=s1&date=YYYY-MM-DD を引き継ぎ、手順2（担当と日時）で選んだ状態から始める（縮小表は最短の利用時間が前提）
  if (params.has("staff") || params.has("date")) {
    const staff = staffById(params.get("staff")) ? params.get("staff") : "any";
    const date = bookableDates().includes(params.get("date")) ? params.get("date") : null;
    resetSel({ staff, date, hours: CONFIG.hoursOptions[0], keepDate: !!date });
    return go("2", "initial");
  }
  go(stepFromHash(location.hash), "initial");
}
init();
