// トップ以外のページの起動。ヘッダーとフッター、予約ボタン、ページごとの小さな処理（要素がある時だけ動く）。
import { CONFIG } from "./config.js";
import { STAFF, SERVICES, HOURS } from "./content.js";
import { h, mountChrome, wireBookingButtons, bookingNote, openModal, wirePaymentLinks, currentPage } from "./ui.js";

const $ = (sel, root = document) => root.querySelector(sel);

/* ---------- スタッフ紹介（staff.html の #staff-list） ---------- */
// 担当を指定した入口は無いので、ボタンは全員「予約する」（担当は予約の画面で選ぶ。ページに1回書く）
function renderStaffList(list) {
  list.replaceChildren(...STAFF.map((s) => h("li", { class: "member", id: s.id, "data-staff-card": s.id },
    h("img", { class: "member__photo", src: s.photo, alt: `${s.name}さんの写真（素材）`, width: 480, height: 480, decoding: "async" }),
    h("div", { class: "member__body" },
      h("h2", { class: "member__name" }, s.name),
      h("dl", { class: "member__facts" },
        h("div", {}, h("dt", {}, "得意なこと"), h("dd", {}, s.skills.join("、"))),
        h("div", {}, h("dt", {}, "お伺いする曜日"), h("dd", {}, s.days)),
        h("div", {}, h("dt", {}, "お伺いする時間"), h("dd", {}, s.hours))),
      h("a", { class: "btn btn--primary member__btn", "data-book": s.id }, "予約する")))));
}

/* ---------- できること（service.html の #service-list） ---------- */
function renderServiceList(list) {
  list.replaceChildren(...SERVICES.map((s) => h("li", { class: "s-task", "data-service": s.id },
    h("img", { class: "s-task__img", src: s.photo, alt: "", width: 1600, height: 1067, loading: "lazy", decoding: "async" }),
    h("div", {},
      h("h3", {}, s.name),
      h("ul", { class: "s-task__examples", role: "list" }, s.examples.map((e) => h("li", {}, e)))))));
}

/* ---------- カード払いのお試し（payment.html） ---------- */
function mountPayment() {
  const done = $("[data-pay-done]");
  if (done && new URLSearchParams(location.search).get("paid") === "1") {
    done.hidden = false;
    history.replaceState(null, "", location.pathname); // 再読み込みで完了の表示を繰り返さない
  }
  const btn = $("[data-pay-test]");
  if (!btn) return;
  const url = CONFIG.payment.testLink;
  if (url) { btn.href = url; return; }
  btn.setAttribute("href", "#");
  btn.setAttribute("aria-haspopup", "dialog");
  btn.addEventListener("click", (e) => {
    e.preventDefault();
    openModal({
      title: "テスト用の支払い画面を準備中です",
      body: ["このボタンから、テスト用の支払い画面（Stripe）を開きます。実際の請求はありません。", "デモの準備が整うまで、もうしばらくお待ちください。"],
    });
  });
}

/* ---------- お問い合わせ（contact.html）：送信せず、見本のモーダルを出す ---------- */
function mountContact() {
  const form = $("main form");
  if (!form) return;
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    openModal({ title: "デモのため送信しません", body: "本番は無料のフォームサービスで届きます。" });
  });
}

/* ---------- 読み込み時 ---------- */
mountChrome({ current: currentPage() });
const staffList = $("#staff-list");
if (staffList) renderStaffList(staffList);
const serviceList = $("#service-list");
if (serviceList) renderServiceList(serviceList);
document.querySelectorAll("[data-booking-note-slot]").forEach((n) => n.replaceWith(bookingNote()));
document.querySelectorAll("[data-hours]").forEach((n) => (n.textContent = HOURS)); // 営業時間は content.js の1か所から
wirePaymentLinks(document); // テスト用のリンクがある時だけ導線を出す
wireBookingButtons(document);
mountPayment();
mountContact();
