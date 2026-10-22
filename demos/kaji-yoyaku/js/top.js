// トップページ（index.html）の起動。
// ヘッダーとフッター、担当3名の顔（この人で予約する）、料金表、予約ボタン。
import { CONFIG } from "./config.js";
import { STAFF } from "./content.js";
import { yenParts } from "./format.js";
import { h, familyName, mountChrome, wireBookingButtons, bookingNote } from "./ui.js";

const $ = (sel, root = document) => root.querySelector(sel);

/* ================= 担当の顔 ================= */
function renderFaces() {
  $("#faces").replaceChildren(...STAFF.map((s) => {
    const name = familyName(s.name);
    return h("li", { class: "face", "data-staff-card": s.id },
      h("img", { class: "face__photo", src: s.photo, alt: `${name}さんの写真（素材）`, width: 480, height: 480, decoding: "async" }),
      h("div", { class: "face__body" },
        h("h3", { class: "face__name" }, name, h("span", { class: "face__san" }, "さん")),
        h("p", { class: "face__intro" }, s.intro)),
      h("a", { class: "btn btn--primary face__btn", "data-book": s.id, "aria-label": `${name}さんで予約する` }, "この人で予約する"));
  }));
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

/* ================= 読み込み時 ================= */
mountChrome({ current: "index.html" });
renderFaces();
renderPrice();
document.querySelectorAll("[data-booking-note-slot]").forEach((n) => n.replaceWith(bookingNote()));
wireBookingButtons(document);
