// サイト7ページの e2e（docs/spec-site.md が根拠。Playwright を node:test から直接使う）。
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
  { href: "service.html", label: "サービスと料金" },
  { href: "flow.html", label: "ご利用の流れ" },
  { href: "staff.html", label: "スタッフ紹介" },
  { href: "area.html", label: "対応エリア" },
  { href: "faq.html", label: "よくある質問" },
  { href: "contact.html", label: "お問い合わせ" },
];
const NAV_PAGES = NAV.map((n) => n.href); // メニューに入る7ページ
const PAGES = [...NAV_PAGES, "payment.html"]; // 共通の検査は payment.html（メニュー外）も対象
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

/* ---- 7ページ共通 ---- */
for (const file of PAGES) {
  test(`${file}：コンソールのエラーと読み込みの失敗が0件`, async (t) => {
    const { page, errors } = await open(t, file);
    await page.waitForLoadState("load");
    assert.deepEqual(errors, []);
  });

  test(`${file}：header[data-chrome]・footer[data-chrome]・[data-demo-band] がある`, async (t) => {
    const { page } = await open(t, file);
    assert.equal(await page.locator("header[data-chrome]").count(), 1, "header[data-chrome]");
    assert.equal(await page.locator("footer[data-chrome]").count(), 1, "footer[data-chrome]");
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
    assert.ok((await page.title()).includes("高尾の家事手伝い みどり"), "屋号も入る");
  });

  test(`${file}：meta description がある`, async (t) => {
    const { page } = await open(t, file);
    const c = await page.locator('meta[name="description"]').first().getAttribute("content");
    assert.ok((c ?? "").trim().length > 0, "description が空");
  });
}

/* ---- メニュー ---- */
// payment.html はメニューに入れないので、「今のページ」の検査は NAV の7ページだけ
for (const file of NAV_PAGES) {
  test(`${file}：メニューに NAV の7つのリンクがあり、今のページに [data-nav-current]`, async (t) => {
    const { page } = await open(t, file);
    // 表示の有無ではなく DOM の存在を見る（スマホのメニューは閉じていてよい）
    const links = await page.$$eval("header[data-chrome] nav a", (as) => as.map((a) => ({ href: a.getAttribute("href"), text: a.textContent.trim() })));
    for (const n of NAV) {
      assert.ok(links.some((l) => l.href === n.href && l.text.includes(n.label)), `メニューに「${n.label}」(${n.href})`);
    }
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
test("トップに [data-book=any] と s1〜s3、[data-booking-note] が1つ以上", async (t) => {
  const { page } = await open(t, "index.html");
  for (const id of ["any", ...STAFF_IDS]) assert.ok((await page.locator(`[data-book="${id}"]`).count()) >= 1, `data-book=${id}`);
  assert.ok((await page.locator("[data-booking-note]").count()) >= 1, "[data-booking-note]");
});

test("スタッフ紹介に [data-book=s1]〜s3", async (t) => {
  const { page } = await open(t, "staff.html");
  for (const id of STAFF_IDS) assert.ok((await page.locator(`[data-book="${id}"]`).count()) >= 1, `data-book=${id}`);
});

// モーダルの作りは仕様に無いので、dialog[open] か role=dialog のどちらかが見えればよい
const MODAL = 'dialog[open], [role="dialog"]';

for (const [file, ids] of [["index.html", ["any", ...STAFF_IDS]], ["staff.html", STAFF_IDS]]) {
  for (const id of ids) {
    test(`${file}：URL が空の時 [data-book=${id}] を押すとモーダルが開き、ページは移動しない`, async (t) => {
      const { page } = await open(t, file);
      const before = page.url();
      await page.locator(`[data-book="${id}"]`).first().click();
      await page.locator(MODAL).first().waitFor({ state: "visible", timeout: 3000 });
      assert.match(await page.locator(MODAL).first().innerText(), /予約システム（Square 予約）を準備中です/);
      assert.equal(page.url(), before, "URL が変わった");
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

/* ---- 文字サイズ ---- */
test("「大きく」で html[data-font-scale=large]、再読み込みと別ページの後も残る", async (t) => {
  const { page } = await open(t, "index.html");
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
  for (const file of PAGES) {
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

/* ---- カード払いのお試し（payment.html） ---- */
test("トップに a[href=payment.html] があり、200 で開く", async (t) => {
  const { page, ctx } = await open(t, "index.html");
  assert.ok((await page.locator('a[href="payment.html"]').count()) >= 1);
  assert.equal((await ctx.request.get(BASE + "payment.html")).status(), 200);
});

test("payment.html：[data-pay-test] がある。リンクが空の今は、押すとモーダルが開き、ページは移動しない", async (t) => {
  const { page } = await open(t, "payment.html");
  assert.ok((await page.locator("[data-pay-test]").count()) >= 1, "[data-pay-test]");
  const before = page.url();
  await page.locator("[data-pay-test]").first().click();
  await page.locator(MODAL).first().waitFor({ state: "visible", timeout: 3000 });
  assert.equal(page.url(), before, "URL が変わった");
});

test("payment.html?paid=1：[data-pay-done] が見え、URL からクエリが消える", async (t) => {
  const { page } = await open(t, "payment.html?paid=1");
  await page.locator("[data-pay-done]").first().waitFor({ state: "visible", timeout: 3000 });
  assert.match(await page.locator("[data-pay-done]").first().innerText(), /テストのお支払いが完了しました/);
  assert.ok(!page.url().includes("?"), "クエリが残っている: " + page.url());
  assert.ok(page.url().endsWith("payment.html"));
});

test("payment.html（?paid=1 なし）では [data-pay-done] が見えない", async (t) => {
  const { page } = await open(t, "payment.html");
  assert.equal(await page.locator("[data-pay-done]:visible").count(), 0);
});
