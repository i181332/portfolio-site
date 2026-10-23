// トップページ（index.html）の起動。
// ヘッダーとフッター、できること4項目、料金の行、スタッフ3人、予約ボタン、カード払いのお試し、スタッフの写真の画面遷移。
import { CONFIG } from "./config.js";
import { SERVICES, STAFF } from "./content.js";
import { yenParts } from "./format.js";
import { h, mountChrome, wireBookingButtons, bookingNote } from "./ui.js";

const $ = (sel, root = document) => root.querySelector(sel);

/* ================= できること ================= */
function renderServices() {
  $("#services").replaceChildren(...SERVICES.map((s) =>
    h("li", { class: "services__item", "data-service-item": s.id },
      h("img", { class: "services__img", src: s.photo, alt: "", width: 480, height: 360, loading: "lazy", decoding: "async" }),
      h("h3", { class: "services__name" }, s.name),
      h("p", { class: "services__ex" }, s.examples[0]))));
}

/* ================= 料金 ================= */
function renderPrice() {
  const rate = yenParts(CONFIG.hourlyRate).num;
  document.querySelectorAll("[data-rate]").forEach((n) => { n.textContent = rate; });
  $("#price-rows").replaceChildren(...CONFIG.hoursOptions.map((hrs) => {
    const { num, unit } = yenParts(hrs * CONFIG.hourlyRate);
    return h("tr", {},
      h("th", { scope: "row" }, `${hrs}時間`),
      h("td", {}, h("span", { class: "price__yen" }, num, unit)));
  }));
}

/* ================= スタッフ ================= */
// 写真は3人とも同じ枠（正方形）。写真を押すとスタッフ紹介の同じ人へ（画面遷移は下）
function renderStaff() {
  $("#staff").replaceChildren(...STAFF.map((s) => {
    return h("li", { class: "staff__item", "data-staff-card": s.id },
      h("a", { class: "staff__photo", href: `staff.html#${s.id}`, "aria-label": `${s.name}さんの紹介を見る` },
        h("img", { src: s.photo, alt: "", width: 480, height: 480, decoding: "async" })),
      h("div", { class: "staff__body" },
        h("h3", { class: "staff__name" }, s.name, h("span", { class: "staff__san" }, "さん")),
        h("dl", { class: "staff__facts" },
          h("dt", {}, "得意なこと"), h("dd", {}, s.skills.join("、")),
          h("dt", {}, "お伺いする日"), h("dd", {}, h("span", { class: "staff__days" }, s.days), h("span", { class: "staff__hours" }, s.hours))),
        // 担当を指定した入口は無いので、呼び名はほかの予約ボタンと同じ（担当は予約の画面で選ぶ）
        h("a", { class: "btn btn--secondary staff__btn", "data-book": s.id }, "予約する")));
  }));
}

/* ================= カード払いのお試し ================= */
// テスト用の支払いリンク（config の payment.testLink）が空の間は、行き止まりになるので出さない
function hidePayTestWhileEmpty() {
  if (CONFIG.payment.testLink) return;
  document.querySelectorAll("[data-pay-test-link]").forEach((n) => n.remove());
}

/* ================= 画面遷移：スタッフの写真がスタッフ紹介の同じ人の写真へ ================= */
// 押した1人の写真だけに名前を付ける。動きを減らす設定では top.css の @view-transition が無効になり、ここも呼ばれない。
// 受け側（staff.html）にも同じ名前を付ける処理が要る（[data-staff-card="sX"] img か #sX img）。
const PERSON_KEY = `${CONFIG.storagePrefix}person`;
const photoOf = (id) => document.querySelector(`[data-staff-card="${id}"] img, #${id} img`);
const personIn = (url) => /staff\.html#(s\d)$/.exec(url || "")?.[1] ?? null;

function namePhoto(id, transition) {
  const img = id && photoOf(id);
  if (!img) return;
  img.style.viewTransitionName = `photo-${id}`;
  transition.finished.finally(() => { img.style.viewTransitionName = ""; });
}

// 出ていく時：staff.html#sX へ行くならその人
window.addEventListener("pageswap", (e) => {
  if (!e.viewTransition || !e.activation) return;
  const id = personIn(e.activation.entry?.url);
  if (!id) return;
  try { sessionStorage.setItem(PERSON_KEY, id); } catch { /* 保存できなくても遷移はする */ }
  namePhoto(id, e.viewTransition);
});

// 戻ってきた時：スタッフ紹介から戻るなら、行った時の人
window.addEventListener("pagereveal", (e) => {
  if (!e.viewTransition) return;
  const act = window.navigation?.activation;
  if (act?.navigationType !== "traverse" || !/staff\.html/.test(act.from?.url || "")) return;
  let id = null;
  try { id = sessionStorage.getItem(PERSON_KEY); } catch { /* 無ければ動かさない */ }
  namePhoto(id, e.viewTransition);
});

/* ================= 読み込み時 ================= */
mountChrome({ current: "index.html" });
renderServices();
renderPrice();
renderStaff();
hidePayTestWhileEmpty();
document.querySelectorAll("[data-booking-note-slot]").forEach((n) => n.replaceWith(bookingNote()));
wireBookingButtons(document);
