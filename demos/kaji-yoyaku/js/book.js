// サイト内の予約ページ（book.html）。段：service → staff → time → checkout →（Stripe のテスト支払い）→ done。
// 段は ?step= と history.pushState で表す。選んだ内容はこのページの間だけ持つ。個人の情報は sessionStorage にだけ置く。
import { CONFIG } from "./config.js";
import { STAFF } from "./content.js";
import { h, mountDemoBand, openModal } from "./ui.js";
import { bookableDates, openTimes, openTimesAny, formatTime, PERIODS } from "./slots.js";

const STEPS = ["service", "staff", "time", "checkout", "done"];
const DOW = ["日", "月", "火", "水", "木", "金", "土"];
const PREFECTURES = ["北海道", "青森県", "岩手県", "宮城県", "秋田県", "山形県", "福島県", "茨城県", "栃木県", "群馬県", "埼玉県", "千葉県", "東京都", "神奈川県", "新潟県", "富山県", "石川県", "福井県", "山梨県", "長野県", "岐阜県", "静岡県", "愛知県", "三重県", "滋賀県", "京都府", "大阪府", "兵庫県", "奈良県", "和歌山県", "鳥取県", "島根県", "岡山県", "広島県", "山口県", "徳島県", "香川県", "愛媛県", "高知県", "福岡県", "佐賀県", "長崎県", "熊本県", "大分県", "宮崎県", "鹿児島県", "沖縄県"];
const BOOKINGS_KEY = `${CONFIG.storagePrefix}bookings`;
const PENDING_KEY = `${CONFIG.storagePrefix}pending`;

const root = document.getElementById("book-root");
const now = () => new Date(); // 画面だけが今の時刻を読む（slots.js は引数で受ける）

/* ---------- 値の整形 ---------- */
const pad = (n) => String(n).padStart(2, "0");
const yen = (n) => `￥${n.toLocaleString("en-US")}`;
const parseISO = (iso) => { const [y, m, d] = iso.split("-").map(Number); return new Date(y, m - 1, d); };
const toISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const addDays = (iso, n) => { const d = parseISO(iso); d.setDate(d.getDate() + n); return toISO(d); };
const monthOf = (iso) => iso.slice(0, 7);
const longDate = (iso) => { const d = parseISO(iso); return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日${DOW[d.getDay()]}曜日`; };
const shortDate = (iso) => { const d = parseISO(iso); return `${d.getMonth() + 1}月${d.getDate()}日${DOW[d.getDay()]}曜日`; };
const timeRange = (start, minutes) => `${formatTime(start)} – ${formatTime(start + minutes)}`;
const serviceName = (hours) => `家事代行 ${hours}時間`;
const priceOf = (hours) => hours * CONFIG.hourlyRate;
const staffName = (id) => (id === "any" ? "すべてのスタッフ" : STAFF.find((s) => s.id === id).name);

/* ---------- 保存（予約の記録は localStorage、個人の情報は sessionStorage） ---------- */
function readBookings() {
  try {
    const list = JSON.parse(localStorage.getItem(BOOKINGS_KEY));
    return Array.isArray(list) ? list : [];
  } catch { return []; }
}
function addBooking(b) {
  try { localStorage.setItem(BOOKINGS_KEY, JSON.stringify([...readBookings(), b])); } catch { /* 保存できない端末では、この画面の間だけ */ }
}
const readPending = () => {
  try { return JSON.parse(sessionStorage.getItem(PENDING_KEY)); } catch { return null; }
};

/* ---------- 状態 ---------- */
const state = {
  step: "service",
  hours: null,          // 2 | 3 | 4
  staffId: "any",       // "any" | "s1"…
  staffConfirmed: false,
  date: null,           // "YYYY-MM-DD"
  start: null,          // 分
  slotStaffIds: [],     // 選んだ時刻に空いているスタッフ（STAFF の並び）
  anchor: null,         // 日時の段で表示している日（週・月の基準）
  monthView: false,
  form: { phone: "", lastName: "", firstName: "", email: "", zip: "", pref: "東京都", city: "", address1: "", address2: "", note: "" },
  done: null,
};

const minutes = () => state.hours * 60;
const staffList = () => (state.staffId === "any" ? STAFF : STAFF.filter((s) => s.id === state.staffId));
const bookedList = () => readBookings();

// その日に選べる時刻 [{ start, staffIds }]
function slotsOn(date) {
  const args = { date, minutes: minutes(), booked: bookedList(), now: now() };
  if (state.staffId === "any") return openTimesAny({ staffList: STAFF, ...args });
  const staff = STAFF.find((s) => s.id === state.staffId);
  return openTimes({ staff, ...args }).map((start) => ({ start, staffIds: [staff.id] }));
}

/* ---------- 段の遷移 ---------- */
const reached = {
  service: () => true,
  staff: () => state.hours != null,
  time: () => state.hours != null && state.staffConfirmed,
  checkout: () => state.hours != null && state.staffConfirmed && state.date != null && state.start != null,
  done: () => state.done != null,
};
function resolveStep(step) {
  if (!STEPS.includes(step)) return "service";
  for (const s of STEPS) {
    if (s === step) return step;
    if (s !== "done" && !reached[STEPS[STEPS.indexOf(s) + 1]]()) return s;
  }
  return step;
}

function show(step, { scroll = true } = {}) {
  const changed = state.step !== step;
  state.step = step;
  const y = window.scrollY;
  root.replaceChildren(VIEWS[step]());
  if (scroll || changed) {
    window.scrollTo(0, 0);
    root.querySelector("h1")?.focus({ preventScroll: true });
  } else window.scrollTo(0, y);
}
function go(step) {
  history.pushState({ step }, "", `?step=${step}`);
  show(step);
}
const rerender = () => show(state.step, { scroll: false });

window.addEventListener("popstate", () => {
  const want = new URLSearchParams(location.search).get("step") || "service";
  const step = resolveStep(want);
  if (step !== want) history.replaceState({ step }, "", `?step=${step}`);
  show(step);
});

/* ---------- 部品 ---------- */
const svg = (inner, size = 24) => h("span", { class: "bk-icon", "aria-hidden": "true",
  html: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>` });
const ICON = {
  down: '<path d="m6 9 6 6 6-6"/>',
  left: '<path d="M19 12H5m7-7-7 7 7 7"/>',
  right: '<path d="M5 12h14m-7-7 7 7-7 7"/>',
  pencil: '<path d="M4 20h4L19 9l-4-4L4 16v4Zm9-13 4 4"/>',
  calendar: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M8 3v4m8-4v4M4 10h16"/>',
  person: '<circle cx="12" cy="8" r="3.5"/><path d="M5 20a7 7 0 0 1 14 0"/>',
  people: '<circle cx="12" cy="5.5" r="2.2"/><circle cx="6.5" cy="12" r="2.2"/><circle cx="17.5" cy="12" r="2.2"/><path d="M3 20a3.8 3.8 0 0 1 7 0m4 0a3.8 3.8 0 0 1 7 0"/>',
};

const sectionOf = (step, cls, ...children) => h("section", { class: `bk-wrap ${cls}`, "data-step": step }, children);
const heading = (text, cls = "") => h("h1", { class: `bk-h1 ${cls}`, tabindex: "-1" }, text);
const serviceDescription = `掃除機がけ、台所と水まわり、お部屋の片づけ。ご自宅にお伺いします（1時間${CONFIG.hourlyRate.toLocaleString("en-US")}円）。`;

// スマホでは画面下の固定のカート、PC では右の列のサマリー（編集で service の段へ）。
// 日時と小計・合計は、お会計の段（full）だけ。見出しは枠の外
function summary({ full = false } = {}) {
  const when = full && state.start != null
    ? h("div", { class: "bk-summary__when" },
      h("span", { class: "bk-circle" }, svg(ICON.calendar, 20)),
      h("div", {}, h("p", { class: "bk-strong" }, shortDate(state.date)), h("p", { class: "bk-muted" }, timeRange(state.start, minutes()))))
    : null;
  const price = priceOf(state.hours);
  return h("div", { class: "bk-summary-wrap" },
    h("h2", { class: "bk-summary__title" }, "予約のサマリー"),
    h("div", { class: "bk-summary", "data-summary": "" },
    when,
    h("div", { class: "bk-summary__line" },
      h("div", { class: "bk-summary__what" },
        h("p", { class: "bk-strong" }, serviceName(state.hours)),
        h("p", { class: "bk-muted" }, `担当：${staffName(state.staffId)}`)),
      h("p", { class: "bk-summary__price" }, yen(price)),
      h("button", { type: "button", class: "bk-edit", "data-edit": "", "aria-label": "予約内容を編集", onclick: () => go("service") }, svg(ICON.pencil, 22))),
    full ? h("dl", { class: "bk-summary__sum" },
      h("div", {}, h("dt", {}, "小計"), h("dd", {}, yen(price))),
      h("div", {}, h("dt", {}, "合計"), h("dd", {}, yen(price)))) : null));
}

/* ---------- service ---------- */
function viewService() {
  const rows = CONFIG.hoursOptions.map((hrs) => h("li", {},
    h("button", { type: "button", class: "bk-row", "data-service-option": hrs, onclick: () => {
      if (state.hours !== hrs) { state.hours = hrs; state.date = null; state.start = null; state.anchor = null; }
      go("staff");
    } },
      h("span", { class: "bk-row__name" }, serviceName(hrs)),
      h("span", { class: "bk-row__desc" }, serviceDescription),
      h("span", { class: "bk-row__meta" }, `${yen(priceOf(hrs))} ・ ${hrs}時間`))));
  return sectionOf("service", "bk-narrow",
    h("h1", { class: "bk-sr", tabindex: "-1" }, "サービス"),
    h("ul", { class: "bk-list", role: "list" }, rows));
}

/* ---------- staff ---------- */
function staffRow(id, name, intro, media) {
  const checked = state.staffId === id;
  return h("div", { class: "bk-row bk-row--staff", role: "radio", "aria-checked": String(checked), tabindex: checked ? "0" : "-1", "data-staff-option": id,
    onclick: () => { state.staffId = id; state.date = null; state.start = null; state.anchor = null; rerender(); root.querySelector(`[data-staff-option="${id}"]`).focus(); },
    onkeydown: (e) => {
      const ids = ["any", ...STAFF.map((s) => s.id)];
      const i = ids.indexOf(id);
      if (e.key === " " || e.key === "Enter") { e.preventDefault(); e.currentTarget.click(); }
      else if (e.key === "ArrowDown" || e.key === "ArrowRight") { e.preventDefault(); root.querySelector(`[data-staff-option="${ids[(i + 1) % ids.length]}"]`).click(); }
      else if (e.key === "ArrowUp" || e.key === "ArrowLeft") { e.preventDefault(); root.querySelector(`[data-staff-option="${ids[(i + ids.length - 1) % ids.length]}"]`).click(); }
    } },
    media,
    h("span", { class: "bk-row__text" },
      h("span", { class: "bk-row__staffname" }, name),
      intro ? h("span", { class: "bk-row__intro" }, intro) : null),
    h("span", { class: "bk-radio", "aria-hidden": "true" }));
}

function viewStaff() {
  const rows = [
    staffRow("any", "指名なし", "", h("span", { class: "bk-circle bk-circle--lg" }, svg(ICON.people, 30))),
    ...STAFF.map((s) => staffRow(s.id, s.name, s.intro,
      h("span", { class: "bk-circle bk-circle--lg" }, h("img", { src: s.photo, alt: "", width: 58, height: 58, loading: "lazy", decoding: "async" })))),
  ];
  return sectionOf("staff", "bk-narrow bk-has-bar",
    h("nav", { class: "bk-crumb", "aria-label": "パンくず" },
      h("a", { href: "?step=service", "data-breadcrumb-back": "", onclick: (e) => { e.preventDefault(); go("service"); } }, "すべてのサービス"),
      h("span", { "aria-hidden": "true" }, "/"),
      h("span", { "aria-current": "page" }, serviceName(state.hours))),
    heading(serviceName(state.hours)),
    h("p", { class: "bk-meta" }, `${yen(priceOf(state.hours))} ・ ${state.hours}時間`),
    h("p", { class: "bk-desc" }, serviceDescription),
    h("h2", { class: "bk-h2" }, "スタッフ"),
    h("div", { class: "bk-list", role: "radiogroup", "aria-label": "スタッフ" }, rows),
    h("div", { class: "bk-bar" },
      h("button", { type: "button", class: "bk-btn", "data-next": "", onclick: () => { state.staffConfirmed = true; go("time"); } }, "次へ")));
}

/* ---------- time ---------- */
const monthTitle = (iso) => { const d = parseISO(iso); return `${d.getFullYear()}年${d.getMonth() + 1}月`; };

function calendar(dates) {
  const available = new Set(dates.filter((d) => slotsOn(d).length));
  const first = dates[0];
  const last = dates[dates.length - 1];
  const anchor = state.anchor;
  let cells;
  if (state.monthView) {
    const start = `${monthOf(anchor)}-01`;
    const lead = parseISO(start).getDay();
    const count = new Date(parseISO(start).getFullYear(), parseISO(start).getMonth() + 1, 0).getDate();
    cells = [...Array(lead).fill(null), ...Array.from({ length: count }, (_, i) => addDays(start, i))];
  } else {
    const sunday = addDays(anchor, -parseISO(anchor).getDay());
    cells = Array.from({ length: 7 }, (_, i) => addDays(sunday, i));
  }
  const firstShown = cells.find(Boolean);
  const lastShown = cells[cells.length - 1];
  const prevDisabled = state.monthView ? monthOf(firstShown) <= monthOf(toISO(now())) : addDays(firstShown, -1) < first;
  const nextDisabled = state.monthView ? monthOf(lastShown) >= monthOf(last) : lastShown >= last;
  const move = (dir) => {
    if (state.monthView) {
      const d = parseISO(`${monthOf(anchor)}-01`);
      d.setMonth(d.getMonth() + dir);
      state.anchor = toISO(d);
    } else state.anchor = addDays(anchor, 7 * dir);
    rerender();
  };
  const arrow = (attr, label, icon, disabled, dir) =>
    h("button", { type: "button", class: "bk-arrow", [attr]: "", "aria-label": label, disabled, onclick: () => move(dir) }, svg(icon, 22));
  return h("div", { class: "bk-cal" },
    h("div", { class: "bk-cal__head" },
      arrow("data-week-prev", state.monthView ? "前の月" : "先週", ICON.left, prevDisabled, -1),
      h("h1", { class: "bk-h1 bk-h1--center", tabindex: "-1" }, monthTitle(anchor)),
      arrow("data-week-next", state.monthView ? "次の月" : "来週", ICON.right, nextDisabled, 1)),
    h("div", { class: "bk-cal__grid bk-cal__dow", "aria-hidden": "true" }, DOW.map((d) => h("span", {}, d))),
    h("div", { class: "bk-cal__grid" }, cells.map((d) => {
      if (!d) return h("span", {});
      const ok = available.has(d);
      return h("button", { type: "button", class: "bk-day", "data-date": d, "aria-disabled": ok ? null : "true", "aria-pressed": ok ? String(d === state.date) : null,
        "aria-label": longDate(d),
        onclick: () => { if (!ok) return; state.date = d; state.anchor = d; state.start = null; rerender(); } }, String(parseISO(d).getDate()));
    })),
    h("button", { type: "button", class: `bk-expand${state.monthView ? " is-open" : ""}`, "data-expand-month": "", "aria-expanded": String(state.monthView),
      "aria-label": state.monthView ? "週表示に戻す" : "展開して月表示を表示",
      onclick: () => { state.monthView = !state.monthView; state.anchor = state.date || state.anchor; rerender(); } }, svg(ICON.down, 22)));
}

function viewTime() {
  const dates = bookableDates(now());
  if (!state.date || !slotsOn(state.date).length) state.date = dates.find((d) => slotsOn(d).length) || null;
  if (!state.anchor || !state.date) state.anchor = state.date || dates[0];
  const slots = state.date ? slotsOn(state.date) : [];
  const groups = PERIODS.map((p) => {
    const inPeriod = slots.filter((s) => s.start >= p.from && s.start < p.to);
    return h("div", { class: "bk-period" },
      h("h3", { class: "bk-period__label" }, p.label),
      inPeriod.length
        ? h("div", { class: "bk-times" }, inPeriod.map((s) => h("button", { type: "button", class: "bk-time", "data-time": `${pad(Math.floor(s.start / 60))}:${pad(s.start % 60)}`,
          onclick: () => { state.start = s.start; state.slotStaffIds = s.staffIds; go("checkout"); } }, formatTime(s.start))))
        : h("p", { class: "bk-none" }, "予約可能な時間がありません"));
  });
  return sectionOf("time", "bk-cols",
    h("div", { class: "bk-col" },
      calendar(dates),
      state.date ? h("h2", { class: "bk-h2" }, longDate(state.date)) : h("p", { class: "bk-none" }, "予約できる日がありません"),
      groups),
    h("aside", { class: "bk-col bk-side" }, summary()));
}

/* ---------- checkout ---------- */
const FIELDS = {
  phone: { label: "電話番号", type: "tel", autocomplete: "tel-national", inputmode: "tel", error: "電話番号を入力してください" },
  lastName: { label: "姓", autocomplete: "family-name", error: "姓を入力してください" },
  firstName: { label: "名", autocomplete: "given-name", error: "名を入力してください" },
  email: { label: "メール", type: "email", autocomplete: "email", error: "メールアドレスを入力してください" },
  zip: { label: "郵便番号", placeholder: "000-0000（半角）", autocomplete: "postal-code", inputmode: "numeric", error: "郵便番号を入力してください" },
  pref: { label: "都道府県", error: "都道府県を選んでください" },
  city: { label: "市区町村", autocomplete: "address-level2", error: "市区町村を入力してください" },
  address1: { label: "住所１（丁目と番地）", autocomplete: "address-line1", error: "住所１を入力してください" },
  address2: { label: "住所２（建物名と部屋番号）", autocomplete: "address-line2" },
};
const REQUIRED = ["phone", "lastName", "firstName", "email", "zip", "pref", "city", "address1"];

function validate() {
  const f = state.form;
  const errors = {};
  for (const k of REQUIRED) if (!String(f[k]).trim()) errors[k] = FIELDS[k].error;
  if (!errors.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) errors.email = "メールアドレスの形式を確認してください";
  if (!errors.zip && !/^\d{3}-?\d{4}$/.test(f.zip.trim())) errors.zip = "郵便番号は 000-0000 の形で入力してください";
  return errors;
}

function field(key) {
  const spec = FIELDS[key];
  const id = `f-${key}`;
  const control = key === "pref"
    ? h("select", { id, class: "bk-input", "data-field": key, autocomplete: "address-level1" }, PREFECTURES.map((p) => h("option", { value: p, selected: p === state.form.pref }, p)))
    : h("input", { id, class: "bk-input", "data-field": key, type: spec.type || "text", value: state.form[key], placeholder: spec.placeholder, autocomplete: spec.autocomplete, inputmode: spec.inputmode });
  control.addEventListener("input", () => { state.form[key] = control.value; });
  const wrap = h("div", { class: `bk-field bk-field--${key}` },
    h("label", { class: "bk-label", for: id }, spec.label),
    key === "phone" ? h("div", { class: "bk-phone" }, h("span", { class: "bk-phone__cc" }, "JP +81"), control) : control);
  return wrap;
}

function showErrors(form, errors) {
  form.querySelectorAll("[data-error]").forEach((n) => n.remove());
  form.querySelectorAll("[aria-invalid]").forEach((n) => { n.removeAttribute("aria-invalid"); n.removeAttribute("aria-describedby"); });
  let focused = false;
  for (const key of [...Object.keys(FIELDS)]) {
    if (!errors[key]) continue;
    const control = form.querySelector(`[data-field="${key}"]`);
    const msg = h("p", { class: "bk-error", "data-error": "", id: `e-${key}`, role: "alert" }, errors[key]);
    control.closest(".bk-field").append(msg);
    control.setAttribute("aria-invalid", "true");
    control.setAttribute("aria-describedby", msg.id);
    if (!focused) { control.focus(); focused = true; }
  }
}

function pay(form) {
  const errors = validate();
  showErrors(form, errors);
  if (Object.keys(errors).length) return;
  const pending = { hours: state.hours, staffId: state.staffId, slotStaffIds: state.slotStaffIds, date: state.date, start: state.start, form: state.form };
  try { sessionStorage.setItem(PENDING_KEY, JSON.stringify(pending)); } catch { /* 保存できない端末では完了の画面で内容が出ない */ }
  const link = CONFIG.payment.links[state.hours];
  if (link) { location.href = link; return; }
  openModal({
    title: "テスト用の支払い画面を準備中です",
    body: ["このボタンから、テスト用の支払い画面（Stripe）を開きます。実際の請求はありません。", "デモの準備が整うまで、もうしばらくお待ちください。"],
  });
}

function viewCheckout() {
  const price = priceOf(state.hours);
  const form = h("form", { class: "bk-form", novalidate: "", onsubmit: (e) => { e.preventDefault(); pay(e.currentTarget); } },
    h("div", { class: "bk-card" },
      h("span", { class: "bk-circle" }, svg(ICON.calendar, 20)),
      h("div", {},
        h("p", { class: "bk-strong" }, shortDate(state.date)),
        h("p", { class: "bk-muted" }, timeRange(state.start, minutes())),
        h("p", { class: "bk-muted" }, serviceName(state.hours)),
        h("p", { class: "bk-muted" }, `担当：${staffName(state.staffId)}`),
        h("p", { class: "bk-muted" }, `お支払い：${yen(price)}`))),
    h("div", { class: "bk-block" },
      h("h2", { class: "bk-h2" }, "連絡先情報"),
      field("phone"),
      h("div", { class: "bk-pair" }, field("lastName"), field("firstName")),
      field("email")),
    h("div", { class: "bk-block" },
      h("h2", { class: "bk-h2" }, "この予約はどこで実施されますか？"),
      h("p", { class: "bk-desc" }, "住所をご入力いただければ、スタッフがご指定の場所に伺います。"),
      field("zip"), field("pref"), field("city"), field("address1"), field("address2")),
    h("details", { class: "bk-block bk-memo" },
      h("summary", {}, h("span", { class: "bk-h2" }, "予約に関するメモ"), h("span", { class: "bk-link" }, "追加")),
      h("div", { class: "bk-field" },
        h("label", { class: "bk-label", for: "f-note" }, "メモ（任意）"),
        (() => {
          const ta = h("textarea", { id: "f-note", class: "bk-input bk-input--area", rows: "3", "data-field": "note" }, state.form.note);
          ta.addEventListener("input", () => { state.form.note = ta.value; });
          return ta;
        })())),
    h("div", { class: "bk-block" },
      h("h2", { class: "bk-h2" }, "キャンセルポリシー"),
      h("p", { class: "bk-desc bk-desc--ink" }, "予約開始前にキャンセルまたはスケジュール変更を行ってください。")),
    h("p", { class: "bk-note" }, "入力は見本の内容で構いません。どこにも送りません。お支払いの画面では、テスト用のカード番号 4242 4242 4242 4242、先の有効期限、好きな3桁の数字をお使いください。メールアドレスも見本で構いません。実際の請求はありません。"));
  const payBtn = h("button", { type: "button", class: "bk-btn", "data-pay": "", onclick: () => pay(form) }, "お支払いへ進む（テスト）");
  return sectionOf("checkout", "bk-cols",
    heading("お会計", "bk-h1--center"),
    h("div", { class: "bk-col" }, form),
    h("aside", { class: "bk-col bk-side" }, summary({ full: true }), h("div", { class: "bk-pay" }, payBtn)));
}

/* ---------- done ---------- */
function viewDone() {
  const b = state.done;
  if (!b) {
    return sectionOf("done", "bk-narrow",
      heading("予約の情報が見つかりません"),
      h("button", { type: "button", class: "bk-btn bk-btn--inline", onclick: () => { history.replaceState({ step: "service" }, "", "?step=service"); show("service"); } }, "最初から予約する"));
  }
  const rows = [
    ["日時", `${longDate(b.date)}　${timeRange(b.start, b.hours * 60)}`],
    ["サービス", serviceName(b.hours)],
    ["担当", staffName(b.staffId)],
    b.address ? ["お伺い先", b.address] : null,
    ["お支払い済みの金額", yen(priceOf(b.hours))],
  ].filter(Boolean);
  return sectionOf("done", "bk-narrow",
    heading("予約が確定しました"),
    h("dl", { class: "bk-done", "data-done-summary": "" }, rows.map(([t, d]) => h("div", {}, h("dt", {}, t), h("dd", {}, d)))),
    h("p", { class: "bk-note" }, "本番では、予約の内容を書いたメールが届きます。"),
    h("a", { class: "bk-btn bk-btn--inline", href: "index.html" }, "トップへ戻る"));
}

const VIEWS = { service: viewService, staff: viewStaff, time: viewTime, checkout: viewCheckout, done: viewDone };

/* ---------- 完了の扱い ---------- */
// 最後に確定した予約（?step=done を直接開いた時・再読み込み）。記録はしない
function lastBooking() {
  const last = readBookings().at(-1);
  return last ? { ...last, hours: last.hours || (last.end - last.start) / 60 } : null;
}

// Stripe の戻り（?paid=1）の時だけ、予約を記録する
function finishPayment() {
  const pending = readPending();
  if (pending) {
    const free = openTimesAny({ staffList: STAFF, date: pending.date, minutes: pending.hours * 60, booked: readBookings(), now: now() })
      .find((s) => s.start === pending.start);
    const candidates = pending.staffId === "any" ? (free?.staffIds || pending.slotStaffIds || []) : [pending.staffId];
    const staffId = candidates[0] || STAFF[0].id;
    const f = pending.form || {};
    const booking = { staffId, date: pending.date, start: pending.start, end: pending.start + pending.hours * 60, hours: pending.hours };
    addBooking(booking);
    try { sessionStorage.removeItem(PENDING_KEY); } catch { /* 消せない端末でも、記録は済んでいる */ }
    state.done = { ...booking, address: [f.zip && `〒${f.zip}`, f.pref, f.city, f.address1, f.address2].filter(Boolean).join(" ") };
    return;
  }
  state.done = lastBooking(); // 再読み込み・別のタブ
}

// Stripe の画面から戻った・お会計で再読み込みした時：選んだ内容と入力を戻す。戻せない内容なら false
function restorePending(p) {
  const staffOk = p?.staffId === "any" || STAFF.some((s) => s.id === p?.staffId);
  if (!p || !CONFIG.hoursOptions.includes(p.hours) || !staffOk || typeof p.date !== "string" || !Number.isFinite(p.start)) return false;
  Object.assign(state, { hours: p.hours, staffId: p.staffId, slotStaffIds: p.slotStaffIds || [], staffConfirmed: true, date: p.date, start: p.start, anchor: p.date });
  Object.assign(state.form, p.form);
  return true;
}

/* ---------- 起動 ---------- */
mountDemoBand();
document.querySelector("[data-square-link]").href = CONFIG.booking.square;

const params = new URLSearchParams(location.search);
const staffParam = params.get("staff");
if (STAFF.some((s) => s.id === staffParam)) state.staffId = staffParam;

if (params.get("paid") === "1") {
  finishPayment();
  history.replaceState({ step: "done" }, "", "?step=done");
  show("done");
} else if (restorePending(readPending())) {
  history.replaceState({ step: "checkout" }, "", "?step=checkout");
  show("checkout", { scroll: false });
} else if (params.get("step") === "done") {
  state.done = lastBooking();
  history.replaceState({ step: "done" }, "", "?step=done");
  show("done");
} else {
  const want = params.get("step");
  const step = resolveStep(want || "service");
  if (want && step !== want) history.replaceState({ step }, "", `?step=${step}`);
  show(step, { scroll: false });
}
