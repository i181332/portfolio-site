// 予約フローの通し試験（Playwright を node:test から直接使う）。
// 実行：demos/kaji-yoyaku で `python -m http.server 8802` を起こし、tests で `npm install` の後 `npm run e2e`
// （BASE_URL で配信先、PW_CHROMIUM で chrome.exe、SHOTS_DIR を付けると 4 つの画面幅で notes/shots/booking-*.png も撮る）。
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const BASE = (process.env.BASE_URL || "http://127.0.0.1:8802/").replace(/\/?$/, "/");
const SHOTS = process.env.SHOTS_DIR || "";

// 同梱のブラウザが無い時は、手元の ms-playwright にある chromium を探す
function findChromium() {
  if (process.env.PW_CHROMIUM) return process.env.PW_CHROMIUM;
  const dir = path.join(process.env.LOCALAPPDATA || "", "ms-playwright");
  if (!fs.existsSync(dir)) return undefined;
  for (const d of fs.readdirSync(dir).filter((n) => /^chromium-\d+$/.test(n)).sort().reverse()) {
    const exe = path.join(dir, d, "chrome-win64", "chrome.exe");
    if (fs.existsSync(exe)) return exe;
  }
  return undefined;
}

let browser;
before(async () => {
  try { browser = await chromium.launch(); } catch { browser = await chromium.launch({ executablePath: findChromium() }); }
});
after(async () => { await browser?.close(); });

// 新しい端末（localStorage が空）として開く。エラーは errors に貯める
async function open(t, { width = 390, height = 844, scale = "normal" } = {}) {
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  if (scale === "large") await ctx.addInitScript(() => localStorage.setItem("kajiDemo.prefs", JSON.stringify({ fontScale: "large" })));
  t.after(() => ctx.close());
  await page.goto(BASE + "booking.html#step-1");
  await page.waitForSelector('[data-step="1"]:not([hidden]) [data-hours]');
  return { page, errors };
}

const visibleStep = (page) => page.locator("#flow > [data-step]:not([hidden])").getAttribute("data-step");
const noHScroll = (page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);

// 手順1 → 手順2。staff が "named" なら最初のスタッフを指名。○の時刻がある日まで「次の日へ」で進めて、最初の○を選ぶ
async function pickSlot(page, staff) {
  await page.click('[data-next="1"]');
  await page.waitForSelector('[data-step="2"]:not([hidden])');
  if (staff === "named") await page.click('#staff-list [data-staff]:not([data-staff="any"])');
  for (let i = 0; i < 14; i++) {
    const open = page.locator("#slot-list .slot[data-status=open]");
    if (await open.count()) { await open.first().click(); return; }
    await page.click("#day-next");
  }
  throw new Error("14日のうちに○の時刻がない");
}

async function fillCustomer(page, { proxy, notes }) {
  await page.click('[data-next="2"]');
  await page.waitForSelector('[data-step="3"]:not([hidden])');
  if (proxy) {
    await page.click("label.switch");
    await page.fill("#f-proxy-name", "高尾 ゆうこ");
    await page.fill("#f-proxy-phone", "080-0000-5678");
  }
  await page.fill("#f-name", "高尾 はな");
  if (!proxy) await page.fill("#f-phone", "090-0000-1234");
  await page.fill("#f-address", "東京都八王子市高尾町 0-0（見本）");
  await page.fill("#f-notes", notes ? "台所の換気扇まわりを特にお願いします。" : "");
  await page.click('#customer-form [type="submit"]');
  await page.waitForSelector('[data-step="4"]:not([hidden])');
}

const assertClean = (text, where) => {
  assert.ok(!/null|undefined|NaN/.test(text), `${where} に null / undefined / NaN の文字: ${text}`);
};

/* ---- 手順4の読み上げ：担当×ご要望×代理予約 の全ての組み合わせ ---- */
for (const staff of ["any", "named"]) {
  for (const notes of [true, false]) {
    for (const proxy of [false, true]) {
      const name = `手順4に null が出ない：担当=${staff === "any" ? "どなたでも" : "指名"} ご要望=${notes ? "あり" : "なし"} ${proxy ? "代理予約" : "本人"}`;
      test(name, async (t) => {
        const { page, errors } = await open(t);
        await pickSlot(page, staff);
        await fillCustomer(page, { proxy, notes });
        const text = await page.textContent("#readout");
        assertClean(text, "#readout");
        assert.ok(text.includes("高尾 はな様"), "お伺い先の名前");
        assert.equal(text.includes("ご要望は"), notes, "ご要望の行");
        assert.equal(text.includes("ご家族の高尾 ゆうこ様"), proxy, "ご家族への連絡の行");
        assert.equal((await page.textContent('[data-step="4"]')).includes("どなたでも"), staff === "any");
        await page.waitForTimeout(500); // 手順の切替の動き（横へ滑る）が終わってから測る
        assert.ok(await noHScroll(page), "横スクロールなし");
        assert.deepEqual(errors, []);
      });
    }
  }
}

/* ---- 手順3：代理予約の時はご家族の欄が先、autocomplete は section で分かれる ---- */
test("代理予約：ご家族の欄が先に並び、autocomplete が section-booker / section-visit に分かれる", async (t) => {
  const { page } = await open(t);
  await pickSlot(page, "any");
  await page.click('[data-next="2"]');
  await page.click("label.switch");
  const order = await page.$$eval("#customer-form input.input", (els) => els.filter((e) => e.offsetParent).map((e) => `${e.id}:${e.autocomplete}`));
  assert.deepEqual(order.slice(0, 2), ["f-proxy-name:section-booker name", "f-proxy-phone:section-booker tel"]);
  assert.ok(order.includes("f-address:section-visit shipping street-address"));
  assert.match(await page.textContent("#h-phone"), /ご本人に直接かけてよい場合だけ/);
});

/* ---- 手順2：時刻を選ぶまで主ボタンを出さず案内だけ。最初の時刻の行は固定欄に隠れない ---- */
for (const v of [{ width: 390, height: 844 }, { width: 375, height: 667 }, { width: 390, height: 844, scale: "large" }]) {
  test(`手順2の最初の画面：最初の時刻の行が下の固定欄より上に見える ${v.width}x${v.height}${v.scale === "large" ? " 大きく" : ""}`, async (t) => {
    const { page } = await open(t, v);
    await page.click('[data-next="1"]');
    await page.waitForSelector('[data-step="2"]:not([hidden])');
    await page.waitForTimeout(400);
    assert.equal(await page.isVisible('[data-next="2"]'), false, "時刻を選ぶ前の主ボタンは出さない");
    assert.equal(await page.isVisible("#slot-hint"), true, "案内を出す");
    const m = await page.evaluate(() => ({
      slot: document.querySelector("#slot-list .slot").getBoundingClientRect().bottom,
      dock: document.querySelector('[data-step="2"] .dock').getBoundingClientRect().top,
    }));
    assert.ok(m.slot <= m.dock, `最初の時刻の下端 ${m.slot} が固定欄の上端 ${m.dock} より下`);
  });
}

/* ---- 通し：予約 → テスト決済 → 完了 → 同じ時刻が × ---- */
test("通し：予約して完了の画面に要約が出て、同じ担当・日・時刻が × になる", async (t) => {
  const { page, errors } = await open(t);
  await pickSlot(page, "any");
  const picked = await page.evaluate(() => JSON.parse(sessionStorage.getItem("kajiDemo.flowDraft")));
  await fillCustomer(page, { proxy: true, notes: false });
  await page.click("#pay");
  await page.waitForSelector('[data-step="testpay"]:not([hidden])');
  assert.ok(!(await page.textContent('[data-step="testpay"] .testpay__lead')).includes("Stripe"));
  await page.click('[data-action="testpay"]');
  await page.waitForSelector('[data-step="done"]:not([hidden])');
  const done = await page.textContent("#done");
  assertClean(done, "#done");
  for (const s of ["予約番号", "高尾 はな様", "ご家族の高尾 ゆうこ様", "この後の流れ", "取り消し・変更をしたい時", "本制作時に掲載", "この画面を印刷する"]) {
    assert.ok(done.includes(s), `完了の画面に「${s}」`);
  }
  assert.ok(!done.includes("予約できなくなりました"), "お客様向けの画面に×の見本を出さない");
  assert.ok(await page.isVisible('#done a[href="admin.html"]'));
  assert.match(await page.textContent(".done__democheck"), /（デモ）.*（デモ）/);

  await page.click('[data-action="see-slot"]');
  await page.waitForSelector('[data-step="2"]:not([hidden])');
  const slot = page.locator(`#slot-list [data-slot="${picked.start}"]`);
  assert.equal(await slot.getAttribute("data-status"), "closed");
  assert.equal(await slot.getAttribute("data-reason"), "BOOKED");
  assert.deepEqual(errors, []);
});

/* ---- 撮影（SHOTS_DIR を付けた時だけ）：手順1〜4・完了を 4 つの画面幅で ---- */
const SIZES = [
  { tag: "390", width: 390, height: 844 },
  { tag: "375", width: 375, height: 667 },
  { tag: "390L", width: 390, height: 844, scale: "large" },
  { tag: "1440", width: 1440, height: 900 },
];
for (const v of SIZES) {
  test(`撮影 ${v.tag}`, { skip: !SHOTS }, async (t) => {
    const { page, errors } = await open(t, v);
    const shot = async (name, fullPage = false) => {
      await page.waitForTimeout(450);
      await page.screenshot({ path: path.join(SHOTS, `booking-${v.tag}-${name}.png`), fullPage });
      assert.ok(await noHScroll(page), `横スクロールなし ${name}`);
    };
    await shot("1-hours");
    await page.click('[data-next="1"]');
    await shot("2-pick");
    await page.locator("#slot-list .slot[data-status=open]").first().click().catch(async () => { await page.click("#day-next"); await page.locator("#slot-list .slot[data-status=open]").first().click(); });
    await shot("2-picked");
    await page.click('[data-next="2"]');
    await page.click("label.switch");
    await page.click("#fill-sample");
    await page.fill("#f-notes", "");
    await shot("3-customer");
    await page.click('#customer-form [type="submit"]');
    await shot("4-confirm");
    await shot("4-confirm-full", true);
    await page.click("#pay");
    await shot("5-testpay");
    await page.click('[data-action="testpay"]');
    await shot("6-done");
    await shot("6-done-full", true);
    await page.emulateMedia({ media: "print" });
    await shot("6-done-print", true);
    assert.deepEqual(errors, []);
  });
}
