// サイト内の予約ページ book.html の e2e（docs/spec-booking.md が根拠。Playwright を node:test から直接使う）。
// 実行：tests で `node --test e2e/book.spec.mjs`（`npm run e2e` は site.spec.mjs と両方）。
// 起動の仕方は site.spec.mjs と同じ。BASE_URL・PW_CHROMIUM が使える。
// 時刻は context の clock で 2026-11-02（月）09:00 JST に固定し、タイムゾーンも Asia/Tokyo にする。
// Stripe（buy.stripe.com）へは出さない。context で横取りして 204 を返す（204 は画面が移らないので、移ろうとした後の sessionStorage を読める）。
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

/* ---- 仕様の値 ---- */
const NOW = "2026-11-02T09:00:00+09:00"; // 月曜
const TODAY = "2026-11-02";
const STAFF = {
  s1: { name: "山本", work: [1, 2, 3, 5], start: 9 * 60, end: 17 * 60 }, // 木・土・日がお休み
  s2: { name: "小林", work: [0, 2, 4, 6], start: 9 * 60, end: 15 * 60 },
  s3: { name: "森田", work: [1, 3, 4, 5, 6], start: 10 * 60, end: 17 * 60 },
};
const STAFF_IDS = Object.keys(STAFF);
const LINKS = {
  2: "https://buy.stripe.com/test_9B67sK0u2cEA5HV3Yd2go00",
  3: "https://buy.stripe.com/test_aFa00igt0cEAdan8et2go01",
  4: "https://buy.stripe.com/test_4gM8wOfoW1ZW7Q3fGV2go02",
};
const INPUT = { phone: "090-0000-1234", lastName: "見本", firstName: "太郎", email: "sample@example.com", zip: "100-8111", city: "千代田区", address1: "千代田1-1" };
const REQUIRED = ["phone", "lastName", "firstName", "email", "zip", "city", "address1"]; // pref は初期値（東京都）がある
const WEEKDAY = ["日", "月", "火", "水", "木", "金", "土"];
const VIEWS = [{ width: 390, height: 844 }, { width: 1440, height: 900 }];

const fmt = (min) => `${Math.floor(min / 60)}:${String(min % 60).padStart(2, "0")}`; // 「9:00」「13:30」
const toMin = (hhmm) => { const [h, m] = hhmm.split(":").map(Number); return h * 60 + m; };
const dow = (ymd) => new Date(ymd + "T00:00:00Z").getUTCDay();
const jpDate = (ymd) => { const [, m, d] = ymd.split("-").map(Number); return `${m}月${d}日${WEEKDAY[dow(ymd)]}曜日`; };
const jpDateShort = (ymd) => { const [, m, d] = ymd.split("-").map(Number); return `${m}月${d}日`; };
const squash = (s) => s.replace(/\s+/g, " ").trim();

/* ---- 配信とブラウザ（site.spec.mjs と同じ） ---- */
let server, BASE, browser;

const freePort = (port) => new Promise((res) => {
  const s = net.createServer();
  s.once("error", () => res(false));
  s.listen(port, "127.0.0.1", () => s.close(() => res(true)));
});

async function waitUp(url) {
  for (let i = 0; i < 100; i++) {
    try { const r = await fetch(url); if (r.status < 500) return; } catch { /* まだ */ }
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error("配信が起きない: " + url);
}

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

before(async () => {
  if (process.env.BASE_URL) {
    BASE = process.env.BASE_URL.replace(/\/?$/, "/");
  } else {
    let port = 0;
    for (let p = 8810; p < 8900 && !port; p++) if (await freePort(p)) port = p;
    assert.ok(port, "8810 番台に空きポートがない");
    server = spawn("python", ["-m", "http.server", String(port), "--bind", "127.0.0.1"], { cwd: ROOT, stdio: "ignore" });
    BASE = `http://127.0.0.1:${port}/`;
  }
  await waitUp(BASE);
  try { browser = await chromium.launch(); } catch { browser = await chromium.launch({ executablePath: findChromium() }); }
});
after(async () => {
  await browser?.close();
  if (server) server.kill();
});

// 新しい端末（localStorage・sessionStorage が空）として、固定の時刻で book.html を開く。
// stripe：Stripe へ移ろうとした要求の URL。errors：コンソールのエラーなど（Google Fonts は数えない）。
async function openBook(t, query = "", { width = 390, height = 844, now = NOW } = {}) {
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1, locale: "ja-JP", timezoneId: "Asia/Tokyo" });
  await ctx.clock.setFixedTime(new Date(now));
  const stripe = [];
  await ctx.route("https://buy.stripe.com/**", (route) => { stripe.push(route.request().url()); return route.fulfill({ status: 204 }); });
  const page = await ctx.newPage();
  const errors = [];
  const isFont = (u) => /fonts\.(googleapis|gstatic)\.com/.test(u);
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
  page.on("console", (m) => {
    if (m.type() !== "error") return;
    const loc = m.location()?.url || "";
    if (!isFont(loc) && !isFont(m.text())) errors.push("console: " + m.text());
  });
  page.on("response", (r) => { if (r.status() >= 400 && !isFont(r.url())) errors.push(`HTTP ${r.status()}: ${r.url()}`); });
  page.setDefaultTimeout(4000); // 実装が無い時に30秒待たない
  t.after(() => ctx.close());
  await page.goto(BASE + "book.html" + query);
  return { page, ctx, errors, stripe };
}

/* ---- 段・欄・日付の読み取り ---- */
const stepParam = (page) => new URL(page.url()).searchParams.get("step");
const visibleSteps = (page) => page.locator("[data-step]:visible").evaluateAll((els) => els.map((e) => e.dataset.step));
async function expectStep(page, name) {
  await page.locator(`[data-step="${name}"]`).waitFor({ state: "visible" });
  assert.deepEqual(await visibleSteps(page), [name], "見えている段は1つだけ");
}
const stepText = (page, name) => page.locator(`[data-step="${name}"]`).innerText();
const selectedStaff = (page) => page.locator("[data-staff-option]").evaluateAll((els) => els.filter((el) => {
  const r = el.matches("input[type=radio]") ? el : el.querySelector("input[type=radio]");
  return r ? r.checked : el.getAttribute("aria-checked") === "true";
}).map((el) => el.dataset.staffOption));
const dateInfo = (page) => page.locator("[data-date]:visible").evaluateAll((els) => els.map((e) => ({ date: e.dataset.date, disabled: e.getAttribute("aria-disabled") === "true" })));
const readTimes = (page) => page.locator("[data-time]:visible").evaluateAll((els) => els.map((e) => ({ time: e.dataset.time, text: e.innerText.trim() })));
const timeValues = async (page) => (await readTimes(page)).map((x) => x.time);
// data-field は欄そのものでも、欄を包む要素でもよい（仕様に書かれていない）。入力の本体を取る。
const fieldInput = (page, name) => page.locator(`[data-field="${name}"]`).locator("xpath=(self::*[self::input or self::select or self::textarea] | .//input | .//select | .//textarea)[1]");

async function selectDate(page, ymd) {
  const target = page.locator(`[data-date="${ymd}"]:visible`);
  if ((await target.count()) === 0) await page.locator("[data-expand-month]:visible").first().click();
  await target.first().click();
}
// 11月の月表示にして、日付の情報を返す
async function novDates(page) {
  if ((await page.locator('[data-date="2026-11-30"]:visible').count()) === 0) await page.locator("[data-expand-month]:visible").first().click();
  return (await dateInfo(page)).filter((d) => d.date.startsWith("2026-11"));
}

/* ---- 流れ ---- */
async function toStaff(page, minutes = 2) {
  await page.locator(`[data-service-option="${minutes}"]`).click();
  await expectStep(page, "staff");
}
async function toTime(page, { minutes = 2, staff = "any" } = {}) {
  await toStaff(page, minutes);
  if (staff !== "any") await page.locator(`[data-staff-option="${staff}"]`).click();
  await page.locator("[data-next]:visible").click();
  await expectStep(page, "time");
}
async function toCheckout(page, { minutes = 2, staff = "any" } = {}) {
  await toTime(page, { minutes, staff });
  const ymd = (await dateInfo(page)).find((d) => !d.disabled)?.date; // 初期は選べる最初の日が選ばれている
  assert.ok(ymd, "選べる日がない");
  const btn = page.locator("[data-time]:visible").first();
  const hhmm = await btn.getAttribute("data-time");
  await btn.click();
  await expectStep(page, "checkout");
  return { ymd, hhmm, start: toMin(hhmm), minutes };
}
async function fillCheckout(page, skip = []) {
  for (const k of REQUIRED) if (!skip.includes(k)) await fieldInput(page, k).fill(INPUT[k]);
}
async function payAndCatch(page, stripe) {
  const req = page.waitForRequest((r) => /buy\.stripe\.com/.test(r.url()));
  await page.locator("[data-pay]:visible").first().click();
  return (await req).url();
}
const store = (page, area, key) => page.evaluate(([a, k]) => window[a].getItem(k), [area, key]);

/* ---- service ---- */
test("service：初期は service の段だけが見え、URL に step が無い（か service）", async (t) => {
  const { page } = await openBook(t);
  await expectStep(page, "service");
  assert.ok([null, "service"].includes(stepParam(page)), `step=${stepParam(page)}`);
});

test("service：[data-service-option] が 2・3・4 の3つ、それぞれ金額と時間の文言がある", async (t) => {
  const { page } = await openBook(t);
  assert.equal(await page.locator("[data-service-option]").count(), 3);
  const text = (m) => page.locator(`[data-service-option="${m}"]`).innerText().then(squash);
  assert.ok((await text(2)).includes("家事代行 2時間"), await text(2));
  assert.ok((await text(2)).includes("￥7,000 ・ 2時間"), await text(2));
  assert.match(await text(3), /家事代行 3時間[\s\S]*￥[\d,]+ ・ 3時間/);
  assert.match(await text(4), /家事代行 4時間[\s\S]*￥[\d,]+ ・ 4時間/);
});

for (const m of [2, 3, 4]) {
  test(`service：${m}時間の行を押すと ?step=staff で staff の段`, async (t) => {
    const { page } = await openBook(t);
    await page.locator(`[data-service-option="${m}"]`).click();
    await expectStep(page, "staff");
    assert.equal(stepParam(page), "staff");
    assert.ok((await stepText(page, "staff")).includes(`${m}時間`));
  });
}

/* ---- staff ---- */
test("staff：パンくず「すべてのサービス / 家事代行 2時間」、見出し・価格・「スタッフ」、選択肢は指名なし＋3名", async (t) => {
  const { page } = await openBook(t);
  await toStaff(page, 2);
  const text = squash(await stepText(page, "staff"));
  assert.ok(text.includes("すべてのサービス"), text);
  assert.ok(text.includes("家事代行 2時間"));
  assert.ok(text.includes("￥7,000 ・ 2時間"));
  assert.ok(text.includes("スタッフ"));
  assert.deepEqual(await page.locator("[data-staff-option]").evaluateAll((els) => els.map((e) => e.dataset.staffOption)), ["any", "s1", "s2", "s3"]);
  for (const id of STAFF_IDS) assert.ok((await page.locator(`[data-staff-option="${id}"]`).innerText()).includes(STAFF[id].name), id);
  assert.ok((await page.locator('[data-staff-option="any"]').innerText()).includes("指名なし"));
});

test("staff：パンくずの戻るリンク [data-breadcrumb-back] で service の段に戻る", async (t) => {
  const { page } = await openBook(t);
  await toStaff(page, 2);
  await page.locator("[data-breadcrumb-back]").click();
  await expectStep(page, "service");
});

test("staff：初期は「指名なし」だけが選ばれている", async (t) => {
  const { page } = await openBook(t);
  await toStaff(page, 2);
  assert.deepEqual(await selectedStaff(page), ["any"]);
});

for (const id of STAFF_IDS) {
  test(`staff：?staff=${id} で入ると ${id} のラジオが選ばれている`, async (t) => {
    const { page } = await openBook(t, `?staff=${id}`);
    await expectStep(page, "service"); // 入口は service から（担当を選んだ状態で始める）
    await toStaff(page, 2);
    assert.deepEqual(await selectedStaff(page), [id]);
  });
}

for (const bad of ["zz", "S1", "", "s4"]) {
  test(`staff：不正な ?staff=${bad || "(空)"} は無視され、指名なしが選ばれている`, async (t) => {
    const { page } = await openBook(t, `?staff=${bad}`);
    await toStaff(page, 2);
    assert.deepEqual(await selectedStaff(page), ["any"]);
  });
}

test("staff：ラジオを選び直すと1人だけが選ばれる", async (t) => {
  const { page } = await openBook(t);
  await toStaff(page, 2);
  await page.locator('[data-staff-option="s3"]').click();
  assert.deepEqual(await selectedStaff(page), ["s3"]);
  await page.locator('[data-staff-option="s1"]').click();
  assert.deepEqual(await selectedStaff(page), ["s1"]);
});

test("staff：[data-next] で ?step=time。ブラウザの戻る（goBack）で staff に戻り、選択が残る。さらに戻ると service", async (t) => {
  const { page } = await openBook(t);
  await toStaff(page, 3);
  await page.locator('[data-staff-option="s3"]').click();
  await page.locator("[data-next]:visible").click();
  await expectStep(page, "time");
  assert.equal(stepParam(page), "time");
  await page.goBack();
  await expectStep(page, "staff");
  assert.equal(stepParam(page), "staff");
  assert.deepEqual(await selectedStaff(page), ["s3"], "担当の選択が残る");
  assert.ok((await stepText(page, "staff")).includes("3時間"), "コースの選択が残る");
  await page.goBack();
  await expectStep(page, "service");
});

/* ---- time ---- */
test("time：[data-date] の帯は7日（日〜土）で、今日（2026-11-02）と過去は aria-disabled=true、最初は選べる最初の日が選ばれている", async (t) => {
  const { page } = await openBook(t);
  await toTime(page);
  const dates = await dateInfo(page);
  assert.equal(dates.length, 7);
  assert.deepEqual(dates.map((d) => d.date), ["2026-11-01", "2026-11-02", "2026-11-03", "2026-11-04", "2026-11-05", "2026-11-06", "2026-11-07"]);
  assert.equal(dow(dates[0].date), 0, "帯は日曜から");
  assert.ok(dates[0].disabled, "11-01（過去）");
  assert.ok(dates[1].disabled, "11-02（今日は選べない）");
  assert.ok(dates.slice(2).some((d) => !d.disabled), "明日以降に選べる日がある");
  for (const d of await page.locator("[data-date]:visible").all()) {
    const d1 = await d.getAttribute("data-date");
    const ad = await d.getAttribute("aria-disabled");
    if (d1 <= TODAY) assert.equal(ad, "true", d1);
    else assert.ok(ad === null || ad === "false", `${d1} aria-disabled=${ad}`);
  }
  const first = dates.find((d) => !d.disabled).date;
  assert.ok(squash(await stepText(page, "time")).includes(jpDate(first)), `日付の見出し ${jpDate(first)}`);
});

test("time：月の見出しと、[data-week-next]・[data-week-prev] で週が前後する", async (t) => {
  const { page } = await openBook(t);
  await toTime(page);
  assert.ok((await stepText(page, "time")).includes("2026年11月") || (await stepText(page, "time")).includes("11月"), "月の見出し");
  await page.locator("[data-week-next]").click();
  const next = (await dateInfo(page)).map((d) => d.date);
  assert.deepEqual(next, ["2026-11-08", "2026-11-09", "2026-11-10", "2026-11-11", "2026-11-12", "2026-11-13", "2026-11-14"]);
  await page.locator("[data-week-prev]").click();
  assert.equal((await dateInfo(page))[0].date, "2026-11-01");
});

test("time：[data-expand-month] で月表示（11月の全日が見える）、今日までは選べない", async (t) => {
  const { page } = await openBook(t);
  await toTime(page);
  await page.locator("[data-expand-month]").click();
  const dates = await novDates(page);
  assert.equal(dates.length, 30, "11月は30日");
  assert.deepEqual(dates.filter((d) => d.date <= TODAY).map((d) => d.disabled), [true, true]);
});

test("time：日付を押すと日付の見出し「2026年11月N日○曜日」と時刻が切り替わる", async (t) => {
  const { page } = await openBook(t);
  await toTime(page);
  await page.locator("[data-week-next]").click();
  const enabled = (await dateInfo(page)).find((d) => !d.disabled).date;
  await selectDate(page, enabled);
  assert.ok(squash(await stepText(page, "time")).includes(`2026年${jpDate(enabled)}`), jpDate(enabled));
  assert.ok((await readTimes(page)).length >= 1);
});

test("time：時刻ボタン [data-time] は「9:00」の形（先頭の0なし）で、30分刻み・昇順", async (t) => {
  const { page } = await openBook(t);
  await toTime(page);
  const times = await readTimes(page);
  assert.ok(times.length >= 1);
  for (const x of times) {
    assert.match(x.time, /^\d{2}:(00|30)$/);
    assert.equal(x.text, fmt(toMin(x.time)), `${x.time} の表示`);
    assert.doesNotMatch(x.text, /^0\d/);
  }
  const mins = times.map((x) => toMin(x.time));
  assert.deepEqual(mins, [...mins].sort((a, b) => a - b));
  for (let i = 1; i < mins.length; i++) assert.equal(mins[i] - mins[i - 1] > 0 && (mins[i] - mins[i - 1]) % 30, 0, "30分の倍数の間隔");
});

test("time：区分の見出し 午前／午後／夜間 が順に出て、空きの無い区分（夜間）は「予約可能な時間がありません」", async (t) => {
  const { page } = await openBook(t);
  await toTime(page, { staff: "s2" }); // 小林は15時まで。夜間（18:00〜）は必ず空き無し
  const text = await stepText(page, "time");
  const i1 = text.indexOf("午前"), i2 = text.indexOf("午後"), i3 = text.indexOf("夜間");
  assert.ok(i1 >= 0 && i2 > i1 && i3 > i2, `見出しの順: ${i1} ${i2} ${i3}`);
  assert.ok(text.slice(i3).includes("予約可能な時間がありません"));
  for (const x of await readTimes(page)) assert.ok(toMin(x.time) < 18 * 60, `夜間の時刻 ${x.time}`);
});

// 担当ごとの勤務の曜日。日付は11月の月表示で全部見る（選べない＝aria-disabled）。
for (const id of STAFF_IDS) {
  test(`time：${STAFF[id].name}（${id}）を選んだ時、勤務の曜日の外の日は選べず、勤務の日は1日以上選べる（11月）`, async (t) => {
    const { page } = await openBook(t);
    await toTime(page, { staff: id });
    const dates = await novDates(page);
    const off = dates.filter((d) => !STAFF[id].work.includes(dow(d.date)));
    const on = dates.filter((d) => STAFF[id].work.includes(dow(d.date)) && d.date > TODAY);
    assert.ok(off.length > 0);
    for (const d of off) assert.ok(d.disabled, `${d.date}（${WEEKDAY[dow(d.date)]}）は休み`);
    assert.ok(on.some((d) => !d.disabled), "勤務の日に選べる日がある");
  });
}

test("time：山本 s1 は木・土・日がお休み（2026-11-05 木、11-07 土、11-08 日 は選べない）", async (t) => {
  const { page } = await openBook(t);
  await toTime(page, { staff: "s1" });
  await page.locator("[data-week-next]").click(); // 11-08〜11-14
  const next = Object.fromEntries((await dateInfo(page)).map((d) => [d.date, d.disabled]));
  assert.equal(next["2026-11-08"], true, "日");
  assert.equal(next["2026-11-12"], true, "木");
  assert.equal(next["2026-11-14"], true, "土");
  await page.locator("[data-week-prev]").click();
  const cur = Object.fromEntries((await dateInfo(page)).map((d) => [d.date, d.disabled]));
  assert.equal(cur["2026-11-05"], true, "木");
  assert.equal(cur["2026-11-07"], true, "土");
});

test("time：指名なしでは、今日と過去は選べず、明日以降の週の帯に選べる日がある", async (t) => {
  const { page } = await openBook(t);
  await toTime(page, { staff: "any" });
  const dates = await novDates(page);
  assert.ok(dates.filter((d) => d.date <= TODAY).every((d) => d.disabled));
  assert.ok(dates.filter((d) => d.date > TODAY && d.date <= "2026-11-08").some((d) => !d.disabled), "明日からの1週間に選べる日");
});

// 開始時刻：勤務の始まり以上、開始＋コースの時間が勤務の終わり以下。11月の選べる日の時刻を全部集める。
for (const id of STAFF_IDS) {
  for (const minutes of [2, 3, 4]) {
    test(`time：${STAFF[id].name}（${id}）・${minutes}時間：開始は勤務の中で、終わりが勤務の終わりを超える開始は出ない`, async (t) => {
      const { page } = await openBook(t);
      await toTime(page, { minutes, staff: id });
      const { start, end } = STAFF[id];
      const last = end - minutes * 60; // 最後の開始時刻
      const seen = new Set();
      for (const d of (await novDates(page)).filter((x) => !x.disabled)) {
        await selectDate(page, d.date);
        for (const x of await readTimes(page)) {
          const m = toMin(x.time);
          assert.ok(m >= start, `${d.date} ${x.time} は勤務の始まり前`);
          assert.ok(m <= last, `${d.date} ${x.time} は終わり（${m + minutes * 60}）が勤務の終わり ${end} を超える`);
          assert.equal(m % 30, 0);
          seen.add(m);
        }
      }
      assert.ok(seen.size > 0, "時刻が1つも出ない");
      assert.ok(seen.has(last), `最後の開始 ${fmt(last)}（ちょうど終わりが勤務の終わり）が選べる日がある`);
      assert.ok(!seen.has(last + 30), `${fmt(last + 30)} は出てはいけない（1つ先）`);
      assert.ok(Math.min(...seen) === start || seen.has(start), `勤務の始め ${fmt(start)} が選べる日がある`);
    });
  }
}

test("time：時刻を押すと ?step=checkout で checkout の段", async (t) => {
  const { page } = await openBook(t);
  await toCheckout(page);
  assert.equal(stepParam(page), "checkout");
});

test("time：同じ日・同じ担当は、いつ開いても（時刻を変えて3回）同じ選べる日と時刻が出る（11-04〜11-14）", async (t) => {
  const maps = {};
  for (const now of [NOW, "2026-11-02T20:00:00+09:00", "2026-11-03T09:00:00+09:00"]) {
    for (const staff of ["s2", "any"]) {
      const { page } = await openBook(t, "", { now });
      await toTime(page, { minutes: 3, staff });
      const m = {};
      for (const d of (await novDates(page)).filter((x) => x.date >= "2026-11-04" && x.date <= "2026-11-14")) {
        if (d.disabled) { m[d.date] = null; continue; }
        await selectDate(page, d.date);
        m[d.date] = await timeValues(page);
      }
      (maps[staff] ??= []).push(JSON.stringify(m));
    }
  }
  for (const staff of ["s2", "any"]) {
    assert.equal(new Set(maps[staff]).size, 1, `${staff}: ${maps[staff].join(" / ")}`);
    assert.ok(Object.values(JSON.parse(maps[staff][0])).some((v) => v && v.length), `${staff}: 時刻が1つも無い`);
  }
});

test("time：[data-summary] に 家事代行 2時間・担当：すべてのスタッフ・￥7,000、[data-edit] で service の段に戻る", async (t) => {
  const { page } = await openBook(t);
  await toTime(page);
  const text = squash(await page.locator("[data-summary]:visible").first().innerText());
  assert.ok(text.includes("家事代行 2時間"), text);
  assert.ok(text.includes("担当：すべてのスタッフ"), text);
  assert.ok(text.includes("￥7,000"), text);
  await page.locator("[data-edit]:visible").first().click();
  await expectStep(page, "service");
});

test("time：担当を選ぶと [data-summary] に「担当：山本 さち子」", async (t) => {
  const { page } = await openBook(t);
  await toTime(page, { staff: "s1" });
  assert.ok(squash(await page.locator("[data-summary]:visible").first().innerText()).includes("担当：山本 さち子"));
});

/* ---- 前の段が済んでいない ---- */
// ?step=done は含めない（予約が無い時の done の扱いは仕様に無い。?paid=1 の節を見る）
for (const step of ["staff", "time", "checkout"]) {
  test(`直接開く：?step=${step} は、最初の済んでいない段（service）を出す`, async (t) => {
    const { page } = await openBook(t, `?step=${step}`);
    await expectStep(page, "service");
  });
}

test("直接開く：?step=service は service。不正な ?step=zz も service", async (t) => {
  for (const q of ["?step=service", "?step=zz"]) {
    const { page } = await openBook(t, q);
    await expectStep(page, "service");
  }
});

/* ---- checkout ---- */
test("checkout：見出し「お会計」と、予約カード（日付・時間帯・サービスと担当・金額）", async (t) => {
  const { page } = await openBook(t);
  const c = await toCheckout(page, { minutes: 2, staff: "s1" });
  const text = squash(await stepText(page, "checkout"));
  assert.ok(text.includes("お会計"));
  assert.ok(text.includes(jpDate(c.ymd)), `日付 ${jpDate(c.ymd)}`);
  assert.ok(text.includes(`${fmt(c.start)} – ${fmt(c.start + 120)}`), `時間帯 ${fmt(c.start)} – ${fmt(c.start + 120)}`);
  assert.ok(text.includes("家事代行 2時間"));
  assert.ok(text.includes("担当：山本 さち子"));
  assert.ok(text.includes("￥7,000"));
});

test("checkout：指名なしなら予約カードに「担当：すべてのスタッフ」", async (t) => {
  const { page } = await openBook(t);
  await toCheckout(page);
  assert.ok(squash(await stepText(page, "checkout")).includes("担当：すべてのスタッフ"));
});

test("checkout：[data-field] が phone・lastName・firstName・email・zip・pref・city・address1・address2・note の10個ある", async (t) => {
  const { page } = await openBook(t);
  await toCheckout(page);
  for (const k of ["phone", "lastName", "firstName", "email", "zip", "pref", "city", "address1", "address2", "note"]) {
    assert.equal(await page.locator(`[data-field="${k}"]`).count(), 1, `data-field=${k}`);
  }
  assert.ok((await page.locator("[data-field]").count()) === 10, "仕様に無い欄が増えていない");
});

test("checkout：見出しと注記（連絡先情報・JP +81・場所・メモ・キャンセルポリシー・テスト用カード・主ボタン）", async (t) => {
  const { page } = await openBook(t);
  await toCheckout(page);
  const text = squash(await stepText(page, "checkout"));
  for (const s of ["連絡先情報", "JP +81", "電話番号", "メール", "この予約はどこで実施されますか？", "住所をご入力いただければ、スタッフがご指定の場所に伺います。",
    "郵便番号", "都道府県", "市区町村", "住所1", "予約に関するメモ", "キャンセルポリシー", "見本の内容で構いません", "4242 4242 4242 4242", "実際の請求はありません"]) {
    // 「住所１」は全角の１。どちらでも通す
    if (s === "住所1") assert.ok(/住所[1１]/.test(text), "住所１");
    else assert.ok(text.includes(s), s);
  }
  assert.ok(text.includes("姓") && text.includes("名"));
  assert.ok((await page.locator("[data-pay]:visible").first().innerText()).includes("お支払いへ進む（テスト）"));
  assert.ok(!text.includes("ログイン") && !/SMS/.test(text), "Square 固有の文（ログイン・SMS）は出さない");
});

test("checkout：郵便番号の例（000-0000）が出ていて、都道府県は初期が東京都、ラベルが欄の上に出ている", async (t) => {
  const { page } = await openBook(t);
  await toCheckout(page);
  const zipHint = (await fieldInput(page, "zip").getAttribute("placeholder")) ?? "";
  assert.ok(zipHint.includes("000-0000") || (await stepText(page, "checkout")).includes("000-0000"), "000-0000 の例");
  const prefLabel = await fieldInput(page, "pref").evaluate((el) => el.tagName === "SELECT" ? el.selectedOptions[0].textContent.trim() : el.value);
  assert.equal(prefLabel, "東京都");
  // ラベルは placeholder ではなく、欄に結び付いた label の文字（欄の上）として出る
  const label = await fieldInput(page, "phone").evaluate((el) => (el.id && document.querySelector(`label[for="${el.id}"]`)?.innerText) || el.closest("label")?.innerText || "");
  assert.ok(label.includes("電話番号"), `電話番号の label: ${label}`);
});

test("checkout：空のまま [data-pay] を押すと [data-error] が出て、ページは移らず Stripe にも行かない。最初の誤りの欄（電話番号）にフォーカス", async (t) => {
  const { page, stripe } = await openBook(t);
  await toCheckout(page);
  await page.locator("[data-pay]:visible").first().click();
  await page.locator("[data-error]:visible").first().waitFor();
  assert.ok((await page.locator("[data-error]:visible").count()) >= 1);
  assert.ok((await stepText(page, "checkout")).includes("電話番号を入力してください"));
  await expectStep(page, "checkout");
  assert.equal(stepParam(page), "checkout");
  assert.ok(new URL(page.url()).pathname.endsWith("book.html"));
  const focused = await page.evaluate(() => { const f = document.querySelector('[data-field="phone"]'); return f === document.activeElement || f.contains(document.activeElement); });
  assert.ok(focused, "電話番号の欄にフォーカス");
  assert.deepEqual(stripe, []);
});

for (const k of REQUIRED) {
  test(`checkout：必須の ${k} だけ空だと、誤りが出てその欄にフォーカスし、Stripe へ行かない`, async (t) => {
    const { page, stripe } = await openBook(t);
    await toCheckout(page);
    await fillCheckout(page, [k]);
    await page.locator("[data-pay]:visible").first().click();
    await page.locator("[data-error]:visible").first().waitFor();
    await expectStep(page, "checkout");
    const focused = await page.evaluate((name) => { const f = document.querySelector(`[data-field="${name}"]`); return f === document.activeElement || f.contains(document.activeElement); }, k);
    assert.ok(focused, `${k} にフォーカス`);
    assert.deepEqual(stripe, []);
    assert.equal(await store(page, "sessionStorage", "kajiDemo.pending"), null, "pending を置かない");
  });
}

for (const minutes of [2, 3, 4]) {
  test(`checkout：正しく入れて押すと ${minutes}時間のリンク（${LINKS[minutes].slice(8, 40)}…）へ移ろうとし、URL に個人の情報が無く、pending に内容が入る`, async (t) => {
    const { page, stripe } = await openBook(t);
    const c = await toCheckout(page, { minutes, staff: "s2" });
    await fillCheckout(page);
    const url = await payAndCatch(page, stripe);
    assert.ok(url.startsWith(LINKS[minutes]), `行き先 ${url}`);
    const rest = decodeURIComponent(url.slice(LINKS[minutes].length));
    assert.ok(!/0000.?1234|見本|太郎|sample|example\.com|千代田/.test(rest), `URL に個人の情報: ${url}`);
    const pending = await store(page, "sessionStorage", "kajiDemo.pending");
    assert.ok(pending, "kajiDemo.pending が空");
    for (const v of [INPUT.lastName, INPUT.firstName, INPUT.email, INPUT.city, INPUT.address1, INPUT.zip, c.ymd]) assert.ok(pending.includes(v), `pending に ${v}`);
    assert.match(pending, /090.?0000.?1234/);
    assert.ok(pending.includes("s2"), "担当 s2");
    assert.equal(await store(page, "localStorage", "kajiDemo.bookings"), null, "支払い前は bookings に足さない");
  });
}

/* ---- done ---- */
test("done：Stripe の続き ?paid=1 で「予約が確定しました」と内容、URL は ?step=done、pending が消え bookings に1件", async (t) => {
  const { page, stripe, errors } = await openBook(t);
  const c = await toCheckout(page, { minutes: 2, staff: "s2" });
  await fillCheckout(page);
  await payAndCatch(page, stripe);
  await page.goto(BASE + "book.html?paid=1");
  await expectStep(page, "done");
  const text = squash(await stepText(page, "done"));
  assert.ok(text.includes("予約が確定しました"), text);
  const sum = squash(await page.locator("[data-done-summary]").innerText());
  assert.ok(sum.includes(jpDateShort(c.ymd)), `日付 ${sum}`);
  assert.ok(sum.includes(fmt(c.start)), `開始 ${sum}`);
  assert.ok(sum.includes("小林"), `担当 ${sum}`);
  assert.ok(sum.includes("￥7,000"), `金額 ${sum}`);
  assert.ok(text.includes("千代田区"), "お伺い先");
  assert.ok(text.includes("本番では、予約の内容を書いたメールが届きます"));
  assert.ok(text.includes("トップへ戻る"));
  const u = new URL(page.url());
  assert.equal(u.searchParams.get("step"), "done");
  assert.equal(u.searchParams.get("paid"), null, "paid が残っている");
  assert.equal(await store(page, "sessionStorage", "kajiDemo.pending"), null, "pending が残っている");
  const bookings = JSON.parse(await store(page, "localStorage", "kajiDemo.bookings"));
  assert.equal(bookings.length, 1);
  const b = JSON.stringify(bookings[0]);
  assert.ok(b.includes(c.ymd) && b.includes("s2"), b);
  assert.deepEqual(errors, [], "ここまででコンソールのエラーなし");
});

test("done：確定した時間は、同じ日・同じ担当の time から消える（重なる開始時刻も）", async (t) => {
  const { page, stripe } = await openBook(t);
  const c = await toCheckout(page, { minutes: 2, staff: "s2" });
  await fillCheckout(page);
  await payAndCatch(page, stripe);
  await page.goto(BASE + "book.html?paid=1");
  await expectStep(page, "done");
  await page.goto(BASE + "book.html"); // 同じ端末（localStorage は残る）
  await toTime(page, { minutes: 2, staff: "s2" });
  await selectDate(page, c.ymd);
  const times = (await timeValues(page)).map(toMin);
  assert.ok(!times.includes(c.start), `${fmt(c.start)} がまだ出ている`);
  // 2時間のコースで [start, start+120) と重なる開始時刻は、start-90 〜 start+90
  for (const m of times) assert.ok(m + 120 <= c.start || m >= c.start + 120, `${fmt(m)} は確定した ${fmt(c.start)}–${fmt(c.start + 120)} と重なる`);
});

test("done：指名なしで、勤務しているのが小林だけの日曜に予約すると、担当は小林、bookings の担当は s2", async (t) => {
  const { page, stripe } = await openBook(t);
  await toTime(page, { minutes: 2, staff: "any" });
  const sundays = (await novDates(page)).filter((d) => dow(d.date) === 0 && !d.disabled);
  assert.ok(sundays.length > 0, "11月に選べる日曜がない");
  const ymd = sundays[0].date;
  await selectDate(page, ymd);
  const btn = page.locator("[data-time]:visible").first();
  const hhmm = await btn.getAttribute("data-time");
  await btn.click();
  await expectStep(page, "checkout");
  assert.ok(squash(await stepText(page, "checkout")).includes("担当：すべてのスタッフ"));
  await fillCheckout(page);
  await payAndCatch(page, stripe);
  await page.goto(BASE + "book.html?paid=1");
  await expectStep(page, "done");
  const sum = squash(await page.locator("[data-done-summary]").innerText());
  assert.ok(sum.includes("小林"), sum);
  assert.ok(sum.includes(jpDateShort(ymd)) && sum.includes(fmt(toMin(hhmm))), sum);
  assert.ok((await store(page, "localStorage", "kajiDemo.bookings")).includes("s2"));
});

test("done：確定の後にもう一度 ?paid=1（pending なし）を開くと、最後に確定した予約が出る（見つかりませんではない）", async (t) => {
  const { page, stripe } = await openBook(t);
  const c = await toCheckout(page, { minutes: 3, staff: "s3" });
  await fillCheckout(page);
  await payAndCatch(page, stripe);
  await page.goto(BASE + "book.html?paid=1");
  await expectStep(page, "done");
  await page.goto(BASE + "book.html?paid=1");
  await expectStep(page, "done");
  const text = squash(await stepText(page, "done"));
  assert.ok(!text.includes("予約の情報が見つかりません"), text);
  assert.ok(text.includes(jpDateShort(c.ymd)) && text.includes("森田"), text);
  assert.equal(JSON.parse(await store(page, "localStorage", "kajiDemo.bookings")).length, 1, "二重に足さない");
});

test("done：pending も bookings も無い状態で ?paid=1 を開くと「予約の情報が見つかりません」と「最初から予約する」", async (t) => {
  const { page } = await openBook(t, "?paid=1");
  await page.locator("[data-step]:visible").first().waitFor();
  const text = squash(await page.locator("main, body").first().innerText());
  assert.ok(text.includes("予約の情報が見つかりません"), text);
  assert.ok(text.includes("最初から予約する"));
  assert.ok(!text.includes("予約が確定しました"));
  assert.equal(await store(page, "localStorage", "kajiDemo.bookings"), null, "bookings に足さない");
});

test("done：「最初から予約する」を押すと service の段に戻る", async (t) => {
  const { page } = await openBook(t, "?paid=1");
  await page.getByText("最初から予約する").first().click();
  await expectStep(page, "service");
});

/* ---- 画面の大きさ ---- */
for (const v of VIEWS) {
  test(`${v.width}x${v.height}：各段で横スクロールなし、[data-next]・[data-time]・[data-pay] の高さが 44px 以上`, async (t) => {
    const { page } = await openBook(t, "", v);
    const noScroll = async (label) => {
      const m = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
      assert.ok(m.sw <= m.cw, `${label}: scrollWidth ${m.sw} > clientWidth ${m.cw}`);
    };
    const tall = async (sel, label) => {
      const hs = await page.locator(`${sel}:visible`).evaluateAll((els) => els.map((e) => e.getBoundingClientRect().height));
      assert.ok(hs.length >= 1, `${label}: 見えている ${sel} がない`);
      for (const h of hs) assert.ok(h >= 43.99, `${label}: ${sel} の高さ ${h}`);
    };
    await noScroll("service");
    await toStaff(page, 2);
    await noScroll("staff");
    await tall("[data-next]", "staff");
    await page.locator("[data-next]:visible").click();
    await expectStep(page, "time");
    await noScroll("time");
    await tall("[data-time]", "time");
    await page.locator("[data-expand-month]").click();
    await noScroll("time（月表示）");
    await page.locator("[data-time]:visible").first().click();
    await expectStep(page, "checkout");
    await noScroll("checkout");
    await tall("[data-pay]", "checkout");
    await page.locator("[data-pay]:visible").first().click(); // 誤りの表示でも横にはみ出さない
    await page.locator("[data-error]:visible").first().waitFor();
    await noScroll("checkout（誤り）");
  });
}

test("390x844：time の段で [data-summary]（下の固定のカート）が画面の下側に見える", async (t) => {
  const { page } = await openBook(t, "", VIEWS[0]);
  await toTime(page);
  const el = page.locator("[data-summary]:visible").first();
  const b = await el.boundingBox();
  assert.ok(b, "見えない");
  assert.ok(b.y >= 844 / 2 && b.y + b.height <= 844 + 1, `画面の下側にない: y ${b.y} h ${b.height}`);
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  const b2 = await el.boundingBox();
  assert.ok(b2 && b2.y >= 844 / 2 && b2.y + b2.height <= 844 + 1, "スクロールの後も画面の下に出ている");
});

test("1440x900：time の段で [data-summary]が右の列にあり、見出し「予約のサマリー」がページ上に見える", async (t) => {
  const { page } = await openBook(t, "", VIEWS[1]);
  await toTime(page);
  const b = await page.locator("[data-summary]:visible").first().boundingBox();
  assert.ok(b, "見えない");
  assert.ok(b.x >= 800 && b.x + b.width <= 1440, `右の列にない: x ${b.x} w ${b.width}`);
  assert.ok(await page.getByText("予約のサマリー").first().isVisible(), "見出し「予約のサマリー」がページ上に見える");
});

test("段を切り替えると、ページの上へ戻る（スクロールの位置が0）", async (t) => {
  const { page } = await openBook(t, "", VIEWS[0]);
  await toStaff(page, 2);
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.locator("[data-next]:visible").click();
  await expectStep(page, "time");
  assert.equal(await page.evaluate(() => Math.round(window.scrollY)), 0);
});

/* ---- Square の表示 ---- */
test("見えている文字に「Square 提供」が無い（各段）", async (t) => {
  const { page } = await openBook(t);
  const body = () => page.evaluate(() => document.body.innerText);
  assert.ok(!(await body()).includes("Square 提供"), "service");
  await toStaff(page, 2);
  assert.ok(!(await body()).includes("Square 提供"), "staff");
  await page.locator("[data-next]:visible").click();
  assert.ok(!(await body()).includes("Square 提供"), "time");
  await page.locator("[data-time]:visible").first().click();
  assert.ok(!(await body()).includes("Square 提供"), "checkout");
});

test("[data-square-link] の href が config の booking.square（https://book.squareup.com/ で始まる）で、文言は「Square 予約の画面（架空の店）を見る」", async (t) => {
  const { page } = await openBook(t);
  const links = page.locator("[data-square-link]");
  assert.equal(await links.count(), 1);
  const href = await links.first().getAttribute("href");
  assert.ok(href.startsWith("https://book.squareup.com/"), href);
  assert.ok(squash(await links.first().innerText()).includes("Square 予約の画面（架空の店）を見る"));
  assert.ok((await page.evaluate(() => document.body.innerText)).includes("本番の予約は Square 予約で受け付けます。"));
});

test("スタッフ紹介（staff.html）の [data-book=s2] から入ると、staff の段で s2 が選択済み", async (t) => {
  const { page } = await openBook(t);
  await page.goto(BASE + "staff.html");
  await page.locator('[data-book="s2"]').first().click();
  await page.waitForURL(/book\.html\?staff=s2/);
  await toStaff(page, 2);
  assert.deepEqual(await selectedStaff(page), ["s2"]);
});
