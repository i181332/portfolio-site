// サイトの全ページの e2e（docs/spec-site.md が根拠。Playwright を node:test から直接使う）。
// 実行：tests で `npm run e2e`。試験の中で `python -m http.server`（8810 番台の空きポート）を demos/kaji-yoyaku で起こし、終わったら止める。
// BASE_URL を付けると配信は起こさず、そこを見る。PW_CHROMIUM で chrome.exe を指定できる。
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

// 仕様の NAV（js/content.js）。href と表示名
const NAV = [
  { href: "index.html", label: "トップ" },
  { href: "service.html", label: "サービス内容" },
  { href: "price.html", label: "料金" },
  { href: "flow.html", label: "ご利用の流れ" },
  { href: "staff.html", label: "スタッフ紹介" },
  { href: "area.html", label: "対応エリア" },
  { href: "faq.html", label: "よくある質問" },
  { href: "contact.html", label: "お問い合わせ" },
];
const NAV_PAGES = NAV.map((n) => n.href); // メニューに入る8ページ
const NEW_PAGES = ["company.html", "law.html", "privacy.html", "404.html"]; // 新しい頁（price.html は NAV 側）。会社概要などはフッターから
const PAGES = [...NAV_PAGES, ...NEW_PAGES]; // header/footer/メニューを持つ頁。共通の検査は新しい頁（メニュー外）も対象
const BOOK = "book.html"; // 予約ページ。ヘッダーは店名だけで、header[data-chrome]・footer[data-chrome]・メニューを持たない（docs/spec-booking.md の見た目）
const COMMON_PAGES = [...PAGES, BOOK]; // header/footer/メニューを除く共通の検査の対象
const STAFF_IDS = ["s1", "s2", "s3"];

/* ---- 配信とブラウザ ---- */
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

// 新しい端末（localStorage が空）として開く。コンソールのエラーと読み込みの失敗は errors に貯める。
// Google Fonts（仕様が許す唯一の外部依存）の失敗は、回線の都合なので数えない。
async function open(t, file, { width = 390, height = 844 } = {}) {
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errors = [];
  const isFont = (u) => /fonts\.(googleapis|gstatic)\.com/.test(u);
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
  page.on("console", (m) => {
    if (m.type() !== "error") return;
    const loc = m.location()?.url || "";
    if (!isFont(loc) && !isFont(m.text())) errors.push("console: " + m.text());
  });
  page.on("requestfailed", (r) => { if (!isFont(r.url())) errors.push("requestfailed: " + r.url()); });
  page.on("response", (r) => { if (r.status() >= 400 && !isFont(r.url())) errors.push(`HTTP ${r.status()}: ${r.url()}`); });
  page.setDefaultTimeout(4000); // 実装が無い時に30秒待たない
  t.after(() => ctx.close());
  if (file) await page.goto(BASE + file);
  return { page, ctx, errors };
}

/* ---- 全ページ共通 ---- */
for (const file of COMMON_PAGES) {
  test(`${file}：コンソールのエラーと読み込みの失敗が0件`, async (t) => {
    const { page, errors } = await open(t, file);
    await page.waitForLoadState("load");
    assert.deepEqual(errors, []);
  });

  test(`${file}：${file === BOOK ? "" : "header[data-chrome]・footer[data-chrome]・"}[data-demo-band] がある`, async (t) => {
    const { page } = await open(t, file);
    if (file !== BOOK) {
      assert.equal(await page.locator("header[data-chrome]").count(), 1, "header[data-chrome]");
      assert.equal(await page.locator("footer[data-chrome]").count(), 1, "footer[data-chrome]");
    }
    assert.ok((await page.locator("[data-demo-band]").count()) >= 1, "[data-demo-band]");
  });

  test(`${file}：meta robots に noindex`, async (t) => {
    const { page } = await open(t, file);
    const c = await page.locator('meta[name="robots"]').first().getAttribute("content");
    assert.match(c ?? "", /noindex/);
  });

  test(`${file}：h1 がちょうど1つ`, async (t) => {
    const { page } = await open(t, file);
    assert.equal(await page.locator("h1").count(), 1);
  });

  test(`${file}：title に「（デモ）」`, async (t) => {
    const { page } = await open(t, file);
    assert.ok((await page.title()).includes("（デモ）"), await page.title());
    if (file !== BOOK) assert.ok((await page.title()).includes("高尾の家事手伝い みどり"), "屋号も入る");
  });

  test(`${file}：meta description がある`, async (t) => {
    const { page } = await open(t, file);
    const c = await page.locator('meta[name="description"]').first().getAttribute("content");
    assert.ok((c ?? "").trim().length > 0, "description が空");
  });
}

/* ---- メニュー ---- */
// 新しい頁などはメニューに入れないので、「今のページ」の検査は NAV の8ページだけ
for (const file of NAV_PAGES) {
  test(`${file}：メニューに NAV の8つのリンクが仕様の順にあり、今のページに [data-nav-current]`, async (t) => {
    const { page } = await open(t, file);
    // 表示の有無ではなく DOM の存在を見る（スマホのメニューは閉じていてよい）
    const links = await page.$$eval("header[data-chrome] nav a", (as) => as.map((a) => ({ href: a.getAttribute("href"), text: a.textContent.trim() })));
    for (const n of NAV) {
      assert.ok(links.some((l) => l.href === n.href && l.text.includes(n.label)), `メニューに「${n.label}」(${n.href})`);
    }
    const order = links.map((l) => l.href).filter((h) => NAV_PAGES.includes(h)).filter((h, i, a) => a.indexOf(h) === i);
    assert.deepEqual(order, NAV_PAGES, "メニューの並び");
    assert.ok(!links.some((l) => l.href === "company.html"), "会社概要はフッター（メニューに入れない）");
    const cur = await page.$$eval("nav [data-nav-current]", (els) => els.map((e) => e.getAttribute("href") ?? e.querySelector("a")?.getAttribute("href")));
    assert.ok(cur.length >= 1, "[data-nav-current] がない");
    assert.ok(cur.every((h) => h === file), `今のページ以外に付いている: ${cur}`);
  });
}

test("メニューのリンク先がすべて 200 で開く（リンク切れなし）", async (t) => {
  const { ctx } = await open(t, null);
  for (const file of PAGES) {
    const { page } = await open(t, file);
    const hrefs = await page.$$eval("nav a[href]", (as) => as.map((a) => a.href));
    assert.ok(hrefs.length >= NAV.length);
    for (const h of new Set(hrefs)) {
      const r = await ctx.request.get(h);
      assert.equal(r.status(), 200, `${file} のリンク ${h}`);
    }
  }
});

/* ---- 予約のボタン ---- */
test("トップに [data-book=any] と s1〜s3が1つ以上", async (t) => {
  const { page } = await open(t, "index.html");
  for (const id of ["any", ...STAFF_IDS]) assert.ok((await page.locator(`[data-book="${id}"]`).count()) >= 1, `data-book=${id}`);
});

test("スタッフ紹介に [data-book=s1]〜s3", async (t) => {
  const { page } = await open(t, "staff.html");
  for (const id of STAFF_IDS) assert.ok((await page.locator(`[data-book="${id}"]`).count()) >= 1, `data-book=${id}`);
});

// モーダルの作りは仕様に無いので、dialog[open] か role=dialog のどちらかが見えればよい（お問い合わせの試験で使う）
const MODAL = 'dialog[open], [role="dialog"]';

// 予約のボタンの行き先はサイト内の book.html（docs/spec-booking.md の「サイト側の変更」）。担当別は ?staff=
for (const [file, ids] of [["index.html", ["any", ...STAFF_IDS]], ["staff.html", STAFF_IDS]]) {
  for (const id of ids) {
    const want = id === "any" ? "book.html" : `book.html?staff=${id}`;
    test(`${file}：[data-book=${id}] の href が ${want}`, async (t) => {
      const { page } = await open(t, file);
      const hrefs = await page.locator(`[data-book="${id}"]`).evaluateAll((els) => els.map((e) => e.getAttribute("href")));
      assert.ok(hrefs.length >= 1, `data-book=${id}`);
      for (const h of hrefs) assert.equal(h, want);
    });
  }
}

/* ---- スタッフ ---- */
for (const file of ["index.html", "staff.html"]) {
  test(`${file}：[data-staff-card] s1〜s3 があり、各カードの写真が読み込まれている`, async (t) => {
    const { page } = await open(t, file);
    for (const id of STAFF_IDS) {
      const card = page.locator(`[data-staff-card="${id}"]`);
      assert.ok((await card.count()) >= 1, `data-staff-card=${id}`);
      const img = card.first().locator("img").first();
      assert.equal(await img.count(), 1, `${id} の写真`);
      await img.evaluate((el) => (el.loading = "eager"));
      await page.waitForFunction((el) => el.complete, await img.elementHandle(), { timeout: 5000 });
      assert.ok(await img.evaluate((el) => el.naturalWidth) > 0, `${id} の写真の naturalWidth`);
    }
  });
}

/* ---- ヘッダーの予約ボタンとスマホの下の固定ボタン ---- */
// 見えている（CSS で隠れていず、不透明で、画面に少しでも重なる）要素の数・判定は、ブラウザの中で行う
const shownInViewport = (el) => {
  if (!el.checkVisibility({ checkVisibilityCSS: true, opacityProperty: true })) return false;
  if (el.closest('[aria-hidden="true"]')) return false;
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth;
};
const stickyShown = (page) => page.evaluate(`(${((f) => { const el = document.querySelector("[data-sticky-book]"); return !!el && f(el); }).toString()})(${shownInViewport.toString()})`);
const waitSticky = async (page, want, ms = 3000) => {
  const end = Date.now() + ms;
  let v;
  while (Date.now() < end) { v = await stickyShown(page); if (v === want) return true; await new Promise((r) => setTimeout(r, 100)); }
  return false;
};

for (const file of PAGES) {
  test(`${file}：header [data-book=any] が 1440px で見え、390px では header の中の [data-book] が見えない`, async (t) => {
    const wide = await open(t, file, { width: 1440, height: 900 });
    const btn = wide.page.locator('header [data-book="any"]').first();
    assert.ok((await btn.count()) >= 1, "header [data-book=any]");
    assert.ok(await btn.isVisible(), "見えない 1440px");
    const { page } = await open(t, file, { width: 390, height: 844 });
    const n = await page.locator("header [data-book]").evaluateAll((els, f) => els.filter((e) => new Function("return " + f)()(e) && e.checkVisibility({ checkVisibilityCSS: true })).length, shownInViewport.toString());
    assert.equal(n, 0, "390px で header の中に見える [data-book] がある");
  });
}

for (const file of PAGES.filter((f) => f !== "index.html")) {
  test(`${file}：[data-sticky-book] が 390px で最初から見え、画面の下の側にある`, async (t) => {
    const { page } = await open(t, file, { width: 390, height: 844 });
    const el = page.locator("[data-sticky-book]").first();
    assert.ok((await el.count()) >= 1, "[data-sticky-book]");
    assert.ok(await waitSticky(page, true), "見えない");
    const b = await el.boundingBox();
    assert.ok(b.y + b.height <= 844 + 1 && b.y >= 844 / 2, `画面の下にない: y ${b.y} h ${b.height}`);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    const b2 = await el.boundingBox();
    assert.ok(b2 && b2.y + b2.height <= 844 + 1 && b2.y >= 844 / 2, "スクロールの後も画面の下に出ている");
  });
}

test("index.html：[data-sticky-book] は 390px で読み込み直後は見えず、最初の画面の主ボタンを過ぎると画面の下に見える", async (t) => {
  const { page } = await open(t, "index.html", { width: 390, height: 664 });
  await page.waitForLoadState("load");
  assert.ok((await page.locator("[data-sticky-book]").count()) >= 1, "[data-sticky-book]");
  assert.equal(await stickyShown(page), false, "読み込み直後に見えている");
  await page.evaluate(() => window.scrollTo(0, 1200));
  assert.ok(await waitSticky(page, true), "1200px 送っても見えない");
  const b = await page.locator("[data-sticky-book]").first().boundingBox();
  assert.ok(b.y + b.height <= 664 + 1 && b.y >= 664 / 2, `画面の下にない: y ${b.y} h ${b.height}`);
});

/* ---- スマホ（≤720px）の最初の画面（390x664） ---- */
test("index.html 390x664：見えている「予約する」[data-book] がちょうど1つ", async (t) => {
  const { page } = await open(t, "index.html", { width: 390, height: 664 });
  await page.waitForLoadState("load");
  const shown = await page.$$eval("[data-book]", (els, f) => els.filter((e) => new Function("return " + f)()(e)).map((e) => `${e.tagName.toLowerCase()}[${e.getAttribute("data-book")}] ${(e.textContent || "").trim().slice(0, 20)}`), shownInViewport.toString());
  assert.equal(shown.length, 1, `見えている [data-book]: ${JSON.stringify(shown)}`);
});

test("index.html 390x664：header の高さが 64px 以下で、中に「標準」「大きく」が見えない", async (t) => {
  const { page } = await open(t, "index.html", { width: 390, height: 664 });
  await page.waitForLoadState("load");
  const b = await page.locator("header[data-chrome]").boundingBox();
  assert.ok(b.height <= 64, `header の高さ ${b.height}px`);
  const seen = await page.$$eval("header *", (els) => els.filter((e) => /^\s*(標準|大きく)\s*$/.test(e.textContent || "") && e.checkVisibility({ checkVisibilityCSS: true })).map((e) => e.textContent.trim()));
  assert.deepEqual(seen, [], "header の中に見える文字サイズの切り替え");
});

test("index.html 390x664：[data-hero] の写真・h1・「3,500」・主ボタンがすべて画面の中（固定の段より上）に入り、写真の幅が画面の95%以上", async (t) => {
  const H = 664;
  const { page } = await open(t, "index.html", { width: 390, height: H });
  await page.waitForLoadState("load");
  const r = await page.evaluate((H) => {
    let limit = H;
    for (const d of document.querySelectorAll(".dock")) {
      if (d.checkVisibility({ checkVisibilityCSS: true })) limit = Math.min(limit, d.getBoundingClientRect().top);
    }
    const hero = document.querySelector("[data-hero]");
    const deepest = [...hero.querySelectorAll("*")].filter((e) => (e.textContent || "").includes("3,500") && ![...e.children].some((c) => (c.textContent || "").includes("3,500")));
    const rect = (e) => { const b = e.getBoundingClientRect(); return { top: b.top, bottom: b.bottom, width: b.width }; };
    return {
      limit,
      img: hero.querySelector("img") && rect(hero.querySelector("img")),
      h1: hero.querySelector("h1") && rect(hero.querySelector("h1")),
      price: deepest.map(rect),
      btn: hero.querySelector("[data-book]") && rect(hero.querySelector("[data-book]")),
    };
  }, H);
  assert.ok(r.img, "[data-hero] img");
  assert.ok(r.h1, "[data-hero] h1");
  assert.ok(r.price.length >= 1, "「3,500」を含む要素");
  assert.ok(r.btn, "[data-hero] [data-book]");
  const inside = (name, b) => assert.ok(b.top >= 0 && b.bottom <= r.limit + 0.5, `${name} が画面の外: top ${b.top} bottom ${b.bottom} / 上限 ${r.limit}`);
  inside("[data-hero] img", r.img);
  inside("h1", r.h1);
  r.price.forEach((b) => inside("「3,500」の要素", b));
  inside("[data-hero] [data-book]", r.btn);
  assert.ok(r.img.width >= 390 * 0.95, `写真の幅 ${r.img.width}px（390 の 95% 以上）`);
});

test("index.html 1440x900：header の中に「標準」「大きく」が見える", async (t) => {
  const { page } = await open(t, "index.html", { width: 1440, height: 900 });
  for (const name of ["標準", "大きく"]) {
    const n = await page.locator("header").getByRole("button", { name }).evaluateAll((els) => els.filter((e) => e.checkVisibility({ checkVisibilityCSS: true })).length);
    assert.ok(n >= 1, `header の中に「${name}」が見えない`);
  }
});

/* ---- トップの中身（data 属性の節） ---- */
test("トップ [data-hero]：h1 に「家事代行」「八王子」、「3,500円」「2時間から」、写真 img", async (t) => {
  const { page } = await open(t, "index.html");
  const hero = page.locator("[data-hero]");
  assert.equal(await hero.count(), 1, "[data-hero]");
  const h1 = await hero.locator("h1").innerText();
  assert.ok(h1.includes("家事代行") && h1.includes("八王子"), `h1: ${h1}`);
  const text = await hero.innerText();
  assert.ok(text.includes("3,500円"), "3,500円");
  assert.ok(text.includes("2時間から"), "2時間から");
  assert.ok((await hero.locator("img").count()) >= 1, "写真 img");
});

test("トップ：旧い見出しと旧いメニューの名が残っていない", async (t) => {
  const { page } = await open(t, "index.html");
  const text = await page.evaluate(() => document.body.innerText);
  assert.ok(!text.includes("掃除機がけと台所の片づけ。"), "旧見出し");
  assert.ok(!text.includes("サービスと料金"), "旧メニュー名");
});

test("トップ [data-service-item] が4つ、各 img と作業名があり、写真が読み込まれる", async (t) => {
  const { page } = await open(t, "index.html");
  const items = page.locator("[data-service-item]");
  assert.equal(await items.count(), 4);
  for (let i = 0; i < 4; i++) {
    const it = items.nth(i);
    const img = it.locator("img").first();
    assert.equal(await it.locator("img").count() >= 1, true, `${i + 1} 番目の img`);
    assert.ok((await it.innerText()).trim().length > 0, `${i + 1} 番目の作業名`);
    await img.evaluate((el) => (el.loading = "eager"));
    await page.waitForFunction((el) => el.complete, await img.elementHandle(), { timeout: 5000 });
    assert.ok(await img.evaluate((el) => el.naturalWidth) > 0, `${i + 1} 番目の写真の naturalWidth`);
  }
});

for (const [sel, n] of [["[data-flow-step]", 3], ["[data-faq-item]", 3], ["[data-news-item]", 2]]) {
  test(`トップ ${sel} がちょうど ${n} つで、中身がある`, async (t) => {
    const { page } = await open(t, "index.html");
    const els = page.locator(sel);
    assert.equal(await els.count(), n);
    for (let i = 0; i < n; i++) assert.ok(((await els.nth(i).textContent()) || "").trim().length > 0, `${i + 1} 番目が空`);
  });
}

for (const sel of ["[data-assurance]", "[data-price]", "[data-area]"]) {
  test(`トップ ${sel} がある（1つ以上で、中身がある）`, async (t) => {
    const { page } = await open(t, "index.html");
    const els = page.locator(sel);
    assert.ok((await els.count()) >= 1, sel);
    assert.ok(((await els.first().textContent()) || "").trim().length > 0, `${sel} が空`);
  });
}

test("トップ [data-price] に「3,500円」がある", async (t) => {
  const { page } = await open(t, "index.html");
  assert.ok((await page.locator("[data-price]").first().innerText()).includes("3,500円"));
});

/* ---- スタッフの写真の大きさ（3枚で揃う） ---- */
for (const file of ["index.html", "staff.html"]) {
  for (const v of [{ width: 390, height: 844 }, { width: 1440, height: 900 }]) {
    test(`${file}：[data-staff-card] img の表示の幅と高さが3枚で揃う（差 1px 以内） ${v.width}px`, async (t) => {
      const { page } = await open(t, file, v);
      const imgs = page.locator("[data-staff-card] img");
      assert.equal(await imgs.count(), 3, "写真は3枚");
      const sizes = await imgs.evaluateAll((els) => els.map((e) => { const r = e.getBoundingClientRect(); return { w: r.width, h: r.height }; }));
      for (const s of sizes) assert.ok(s.w > 0 && s.h > 0, `大きさが0: ${JSON.stringify(sizes)}`);
      const spread = (k) => Math.max(...sizes.map((s) => s[k])) - Math.min(...sizes.map((s) => s[k]));
      assert.ok(spread("w") <= 1, `幅の差 ${spread("w")}px ${JSON.stringify(sizes)}`);
      assert.ok(spread("h") <= 1, `高さの差 ${spread("h")}px ${JSON.stringify(sizes)}`);
    });
  }
}

/* ---- フッターの3リンクと新しい頁 ---- */
for (const file of PAGES) {
  test(`${file}：フッターに company.html・law.html・privacy.html へのリンク`, async (t) => {
    const { page } = await open(t, file);
    for (const h of ["company.html", "law.html", "privacy.html"]) {
      assert.ok((await page.locator(`footer[data-chrome] a[href="${h}"]`).count()) >= 1, `フッターに ${h}`);
    }
  });
}

test("フッターの3リンク先と新しい頁が 200 で開く", async (t) => {
  const { ctx } = await open(t, null);
  for (const f of ["price.html", ...NEW_PAGES]) assert.equal((await ctx.request.get(BASE + f)).status(), 200, f);
});

test("404.html：トップへのリンクがある（ヘッダーとフッターの外）", async (t) => {
  const { page } = await open(t, "404.html");
  const n = await page.locator('a[href="index.html"]').evaluateAll((as) => as.filter((a) => !a.closest("header[data-chrome], footer[data-chrome]")).length);
  assert.ok(n >= 1, "トップへのリンク");
});

/* ---- 文字サイズ ---- */
test("「大きく」で html[data-font-scale=large]、再読み込みと別ページの後も残る", async (t) => {
  const { page } = await open(t, "index.html", { width: 1440, height: 900 }); // 390 では「大きく」はメニューの中
  await page.getByRole("button", { name: /大きく/ }).first().click();
  assert.equal(await page.locator("html").getAttribute("data-font-scale"), "large");
  await page.reload();
  assert.equal(await page.locator("html").getAttribute("data-font-scale"), "large", "再読み込みの後");
  await page.goto(BASE + "staff.html");
  assert.equal(await page.locator("html").getAttribute("data-font-scale"), "large", "別ページの後");
});

/* ---- 画面の大きさ ---- */
const VIEWS = [{ width: 390, height: 844 }, { width: 375, height: 667 }, { width: 1440, height: 900 }];
for (const v of VIEWS) {
  for (const file of COMMON_PAGES) {
    test(`横スクロールなし ${file} ${v.width}x${v.height}`, async (t) => {
      const { page } = await open(t, file, v);
      await page.waitForLoadState("load");
      const m = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
      assert.ok(m.sw <= m.cw, `scrollWidth ${m.sw} > clientWidth ${m.cw}`);
    });
  }
}

for (const v of VIEWS.slice(0, 2)) {
  test(`トップの主ボタン [data-book=any] が最初の画面に入り、デモ帯に隠れない ${v.width}x${v.height}`, async (t) => {
    const { page } = await open(t, "index.html", v);
    const btn = page.locator('[data-book="any"]').first();
    const r = await btn.evaluate((el, vh) => {
      const b = el.getBoundingClientRect();
      // 中心と四隅に近い点で、最前面が自分（か中身）であること。固定のデモ帯などが重なっていればここで外れる
      const pts = [[0.5, 0.5], [0.1, 0.1], [0.9, 0.1], [0.1, 0.9], [0.9, 0.9]].map(([x, y]) => [b.left + b.width * x, b.top + b.height * y]);
      const covered = pts.filter(([x, y]) => { const top = document.elementFromPoint(x, y); return !(top && (el === top || el.contains(top))); }).length;
      return { top: b.top, bottom: b.bottom, left: b.left, right: b.right, vh, covered };
    }, v.height);
    assert.ok(r.top >= 0 && r.bottom <= v.height, `最初の画面の外: top ${r.top} bottom ${r.bottom} / 画面 ${v.height}`);
    assert.ok(r.left >= 0 && r.right <= v.width, "横にはみ出し");
    assert.equal(r.covered, 0, "他の要素（デモ帯など）が重なっている点の数");
  });
}

/* ---- 文字の大きさ（390×844） ---- */
for (const file of PAGES) {
  test(`見えている文字の font-size が 16px 以上 ${file} 390x844`, async (t) => {
    const { page } = await open(t, file);
    const small = await page.evaluate(() => {
      const out = [];
      const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      for (let n; (n = w.nextNode()); ) {
        if (!n.nodeValue.trim()) continue;
        const el = n.parentElement;
        if (!el || !el.checkVisibility({ checkVisibilityCSS: true })) continue;
        const fs = parseFloat(getComputedStyle(el).fontSize);
        if (fs < 16) out.push(`${fs}px <${el.tagName.toLowerCase()}> ${n.nodeValue.trim().slice(0, 20)}`);
      }
      return out;
    });
    assert.deepEqual(small, []);
  });
}

/* ---- 押せる高さ（390×844） ---- */
// 除外の規則：文中のリンク（p の中の a）は行の流れの中にあり、高さを 44px にできないので対象外。
// それ以外の、見えているリンク・ボタン（メニュー、フッター、ボタン、カード全体のリンクなど）は 44px 以上。
// 1px 四方以下の見えない要素（スキップリンクの隠し方など）も数えない。
for (const file of PAGES) {
  test(`見えているリンクとボタンの高さが 44px 以上（p の中のリンクは除く） ${file} 390x844`, async (t) => {
    const { page } = await open(t, file);
    const short = await page.evaluate(() => {
      const out = [];
      for (const el of document.querySelectorAll("a[href], button, [role=button], input[type=submit], input[type=button]")) {
        if (el.closest("p")) continue;
        if (!el.checkVisibility({ checkVisibilityCSS: true })) continue;
        const r = el.getBoundingClientRect();
        if (r.width <= 1 || r.height <= 1) continue;
        if (r.height < 44) out.push(`${Math.round(r.height * 10) / 10}px <${el.tagName.toLowerCase()}> ${(el.textContent || el.value || "").trim().slice(0, 20)}`);
      }
      return out;
    });
    assert.deepEqual(short, []);
  });
}

/* ---- 制作者の情報・禁止の記号 ---- */
const FORBIDDEN_STRINGS = ["i181332", "Yuta", "Matsuo", "松尾", "HHLL", "@gmail", "税抜"];
for (const file of PAGES) {
  test(`制作者の情報と「税抜」が HTML にない ${file}`, async (t) => {
    const { page, ctx } = await open(t, file);
    const source = await (await ctx.request.get(BASE + file)).text();
    const rendered = await page.evaluate(() => document.documentElement.outerHTML); // JS が組んだ後の HTML
    for (const s of FORBIDDEN_STRINGS) {
      assert.ok(!source.includes(s), `ソースに「${s}」`);
      assert.ok(!rendered.includes(s), `組み上がった HTML に「${s}」`);
    }
  });

  test(`見えている文字に「→」と中黒「・」がない ${file}`, async (t) => {
    const { page } = await open(t, file);
    await page.evaluate(() => document.querySelectorAll("details").forEach((d) => (d.open = true))); // 閉じた質問の中も見る
    const text = await page.evaluate(() => document.body.innerText);
    const hits = [...text.matchAll(/.{0,6}[→・].{0,6}/g)].map((m) => m[0]);
    assert.deepEqual(hits, []);
  });
}

/* ---- お問い合わせ ---- */
test("お問い合わせ：送信するとモーダルが開き、ページは移動しない", async (t) => {
  const { page } = await open(t, "contact.html");
  const before = page.url();
  const form = page.locator("main form").first();
  for (const el of await form.locator("input:not([type=hidden]):not([type=submit]):not([type=checkbox]):not([type=radio]), textarea").all()) {
    const type = (await el.getAttribute("type")) || "text";
    await el.fill(type === "email" ? "sample@example.com" : type === "tel" ? "090-0000-1234" : "見本の入力");
  }
  for (const c of await form.locator("input[type=checkbox]").all()) await c.check();
  await form.locator('[type="submit"], button:not([type])').first().click();
  await page.locator(MODAL).first().waitFor({ state: "visible", timeout: 3000 });
  assert.match(await page.locator(MODAL).first().innerText(), /デモのため送信しません/);
  assert.equal(page.url(), before, "URL が変わった");
});
