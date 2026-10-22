// トップページ（index.html）の画面ロジック。
// 最初の画面の ○× 縮小表（今日から3日 × スタッフ3名。今日の受付が全員終わっていれば明日から3日）、料金表、担当スタッフの行、フッターのモーダル。
// 縮小表の数は予約画面と同じ判定（openStarts・最短の利用時間）で、localStorage の予約・休みと連動する。
import { CONFIG } from "./config.js";
import { dateParts, formatDate, formatHour, yenParts, toISODate, addDays } from "./format.js";
import { openStarts, dayHasOpening } from "./availability.js";
import { createStore } from "./store.js";
import { h, familyName, mountFontScale, mountDemoBand, aboutDemoButton, openModal, SHOP_NAME } from "./ui.js";

const store = createStore(window.localStorage);
const $ = (sel, root = document) => root.querySelector(sel);

const MINI_DAYS = 3;
const MIN_HOURS = CONFIG.hoursOptions[0]; // 予約画面の受け口（?staff=&date=）も最短の利用時間で始まる
const DAY_WORD = ["今日", "明日", "あさって", "3日後"];
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];
const DOW = ["日", "月", "火", "水", "木", "金", "土"];

const bookingUrl = (params) => `booking.html?${new URLSearchParams(params)}`;
const staffPhoto = (s, cls) => {
  const box = h("span", { class: cls, "aria-hidden": "true" }, h("span", { class: `${cls}-initial` }, s.name.slice(0, 1)));
  const img = h("img", { src: `assets/staff-${s.id}.webp`, alt: "", width: 480, height: 480, decoding: "async" });
  img.addEventListener("error", () => img.remove()); // 写真が無い時は杉緑の円に姓の1字
  box.append(img);
  return box;
};

/* ================= ○× 縮小表 ================= */
function renderMini() {
  const now = new Date();
  const today = toISODate(now);
  const data = { bookings: store.getBookings(), daysOff: store.getDaysOff(), now };
  const staffList = store.getStaff();
  // 今日はもう誰も受けられない（受付の時刻を過ぎた・埋まった・休み）時は、明日から3日分を出す
  const offset = dayHasOpening({ staffList, date: today, hours: MIN_HOURS, starts: CONFIG.slotStarts, ...data }) ? 0 : 1;
  const dates = Array.from({ length: MINI_DAYS }, (_, i) => addDays(today, offset + i));
  $("#mini-title").textContent = `${DAY_WORD[offset]}から3日間の空き`;

  const head = h("tr", {}, h("td", { class: "mini__corner" }),
    dates.map((iso, i) => {
      const { day, dow } = dateParts(iso);
      return h("th", { scope: "col", class: "mini__day" },
        h("span", { class: "mini__rel" }, DAY_WORD[offset + i]),
        h("span", { class: "mini__date" }, `${day}日`, h("span", { class: "mini__dow" }, `（${dow}）`)));
    }));

  const rows = staffList.map((s) => h("tr", {},
    h("th", { scope: "row", class: "mini__staff" }, staffPhoto(s, "mini__photo"), h("span", { class: "mini__name" }, familyName(s.name))),
    dates.map((iso) => {
      const n = openStarts({ staff: s, date: iso, hours: MIN_HOURS, starts: CONFIG.slotStarts, ...data }).length;
      const open = n > 0;
      const attrs = { class: "mini__cell", "data-mini-cell": "", "data-staff": s.id, "data-date": iso, "data-open": String(open), "data-count": n };
      const mark = h("span", { class: "mark", "aria-hidden": "true" });
      const spoken = `${familyName(s.name)}、${formatDate(iso)}、`;
      // 空きなしは × だけを見せ、「空きなし」は読み上げにだけ渡す（行と列の見出しが担当と日を伝える）
      return h("td", {}, open
        ? h("a", { ...attrs, href: bookingUrl({ staff: s.id, date: iso }), "aria-label": `${spoken}空き${n}枠。この担当と日にちで予約に進む` },
          mark, h("span", { class: "mini__count", "aria-hidden": "true" }, `${n}枠`))
        : h("span", attrs, mark, h("span", { class: "visually-hidden" }, "空きなし")));
    })));

  $("#mini").replaceChildren(h("table", { class: "mini__grid" },
    h("caption", { class: "visually-hidden" }, `${formatDate(dates[0])}から3日間、担当ごとの空き枠の数`),
    h("thead", {}, head), h("tbody", {}, rows)));
}

/* ================= 料金 ================= */
function renderPrice() {
  const rate = yenParts(CONFIG.hourlyRate).num;
  document.querySelectorAll("[data-rate]").forEach((n) => { n.textContent = rate; });
  $("#price-rows").replaceChildren(...CONFIG.hoursOptions.map((hrs) => {
    const { num, unit } = yenParts(hrs * CONFIG.hourlyRate);
    return h("tr", {},
      h("th", { scope: "row" }, h("span", { class: "figure price__hours" }, hrs, h("span", { class: "unit" }, "時間"))),
      h("td", { class: "num-cell" }, h("span", { class: "figure figure--price price__yen" }, num, h("span", { class: "unit" }, unit))));
  }));
}

/* ================= 担当スタッフ ================= */
const workDaysText = (days) => WEEK_ORDER.filter((d) => days.includes(d)).map((d) => DOW[d]).join("、") + "曜";

function renderPeople() {
  $("#people").replaceChildren(...store.getStaff().map((s) => h("li", { class: "people__row" },
    staffPhoto(s, "people__photo"),
    h("div", { class: "people__body" },
      h("h3", { class: "people__name" }, s.name),
      h("p", { class: "people__intro" }, s.intro),
      h("dl", { class: "people__facts" },
        h("div", {}, h("dt", {}, "得意なこと"), h("dd", {}, s.skills.join("、"))),
        h("div", {}, h("dt", {}, "お伺いする日"),
          h("dd", {}, h("span", {}, workDaysText(s.workDays)), "　", h("span", {}, `${formatHour(s.start)}〜${formatHour(s.end)}`))))),
    h("a", { class: "btn btn--secondary people__btn", href: bookingUrl({ staff: s.id }), "aria-label": `${familyName(s.name)}さんで予約する` }, "この人で予約する"))));
}

/* ================= モーダル ================= */
const LEGAL = {
  law: { title: "特定商取引法に基づく表記", body: ["事業者名、所在地、連絡先、料金とお支払いの方法、取り消しの決まりなどを掲載します。", "本制作時に、お店の情報をもとに正式な文面を作成します。"] },
  privacy: { title: "プライバシーポリシー", body: ["お預かりするお名前、ご住所、電話番号の使い道と、管理の方法を掲載します。", "本制作時に、お店の運用に合わせて正式な文面を作成します。"] },
};

function bindModals() {
  document.querySelectorAll("[data-legal]").forEach((btn) => btn.addEventListener("click", () => openModal(LEGAL[btn.dataset.legal])));
  $("#tel").addEventListener("click", () => openModal({
    title: "お電話でのご予約",
    body: ["本番では、ここにお店の電話番号を載せ、押すとそのまま電話をかけられるようにします。", "ご提案用のデモのため、番号は載せていません。"],
  }));
}

/* ================= 読み込み時 ================= */
function render() { renderMini(); renderPeople(); }

function init() {
  document.querySelectorAll("[data-shop-name]").forEach((n) => { n.textContent = SHOP_NAME; });
  mountFontScale($("#font-scale"), store);
  $("#about-demo").append(aboutDemoButton("このデモについて"));
  mountDemoBand();
  renderPrice();
  render();
  bindModals();
}
init();

// 予約画面から端末の戻るで帰った時（bfcache）や、別のタブで予約・取り消しをした時に、空きを数え直す
window.addEventListener("pageshow", (e) => { if (e.persisted) render(); });
window.addEventListener("storage", (e) => { if (!e.key || e.key.startsWith(CONFIG.storagePrefix)) render(); });
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") renderMini(); });
