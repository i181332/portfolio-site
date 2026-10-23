// Square 予約サイトの各画面を撮り、構造と computed style を書き出す。入力・送信・予約確定はしない。
import { createRequire } from "module";
const require = createRequire("C:/Users/Yuta_Matsuo/demo/demos/kaji-yoyaku/tests/");
const { chromium } = require("playwright");
import fs from "fs"; import path from "path";
const OUT = "C:/Users/Yuta_Matsuo/demo/demos/kaji-yoyaku/notes/square-ux/";
const URL0 = "https://book.squareup.com/appointments/yty8z30rub8b6y/location/L54G6PFCMRTWP";
const VPS = process.argv[2] ? [process.argv[2]] : ["390", "1440"];
function findChromium() { const dir = path.join(process.env.LOCALAPPDATA || "", "ms-playwright"); if (!fs.existsSync(dir)) return; for (const d of fs.readdirSync(dir).filter((n) => /^chromium-\d+$/.test(n)).sort().reverse()) { const e = path.join(dir, d, "chrome-win64", "chrome.exe"); if (fs.existsSync(e)) return e; } }
let browser; try { browser = await chromium.launch(); } catch { browser = await chromium.launch({ executablePath: findChromium() }); }

const DAY = process.env.DAY || "10";
const PROPS = ["color","backgroundColor","fontFamily","fontSize","fontWeight","lineHeight","borderRadius","padding","margin","border","width","height","boxShadow","textDecorationLine","opacity","position"];
for (const vp of VPS) {
  const mobile = vp === "390";
  const ctx = await browser.newContext(mobile
    ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: "ja-JP" }
    : { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, locale: "ja-JP" });
  const p = await ctx.newPage();
  const log = []; const styles = {}; const reqs = new Set();
  p.on("request", (r) => reqs.add(new URL(r.url()).host));
  const sleep = (ms) => p.waitForTimeout(ms);
  async function settle() { await sleep(2500); }
  async function shot(name, opt = {}) {
    await p.screenshot({ path: `${OUT}${name}-${vp}.png` });
    // ページ本体は内側の要素でスクロールするため、内容の高さまでウィンドウを伸ばして全体を撮る
    const h = await p.evaluate(async () => { for (let y = 0; y < 3000; y += 400) { document.querySelectorAll("*").forEach((e) => { if (e.scrollHeight > e.clientHeight + 20) e.scrollTop = y; }); scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)); }
      document.querySelectorAll("*").forEach((e) => { e.scrollTop = 0; }); scrollTo(0, 0);
      let m = document.documentElement.scrollHeight; document.querySelectorAll("*").forEach((e) => { const o = getComputedStyle(e).overflowY; if ((o === "auto" || o === "scroll") && e.scrollHeight > m) m = e.scrollHeight; }); return m; });
    const W = mobile ? 390 : 1440, H0 = mobile ? 844 : 900;
    await p.setViewportSize({ width: W, height: Math.min(Math.max(h, H0), 7000) }); await sleep(900);
    await p.screenshot({ path: `${OUT}${name}-${vp}-full.png` });
    await p.setViewportSize({ width: W, height: H0 }); await sleep(500);
    if (opt.bottom) { await p.evaluate(() => { document.querySelectorAll("*").forEach((e) => { if (e.scrollHeight > e.clientHeight + 20) e.scrollTop = 99999; }); scrollTo(0, 99999); }); await sleep(600); await p.screenshot({ path: `${OUT}${name}-${vp}-bottom.png` }); await p.evaluate(() => { document.querySelectorAll("*").forEach((e) => { e.scrollTop = 0; }); scrollTo(0, 0); }); }
  }
  async function dump(name) {
    const t = await p.evaluate(() => {
      const vis = (e) => !!(e.offsetWidth || e.offsetHeight);
      return { url: location.href, text: document.body.innerText, scrollH: document.documentElement.scrollHeight,
        ctrls: [...document.querySelectorAll("button,a,market-button,market-link,input,select,textarea,[role=button],[role=radio],[role=option]")].filter(vis).map((e) => `${e.tagName}|${e.dataset.testid||""}|${e.type||""}|${e.getAttribute("aria-label")||""}|${(e.innerText||e.placeholder||e.value||"").replace(/\n/g," / ").trim().slice(0,60)}`) };
    });
    fs.writeFileSync(`${OUT}dump-${name}-${vp}.txt`, `${t.url}\nscrollHeight=${t.scrollH}\n\n--- text\n${t.text}\n\n--- controls\n${t.ctrls.join("\n")}\n`);
  }
  async function sty(label, loc) {
    try { const l = loc.first(); await l.waitFor({ timeout: 4000 });
      styles[label] = await l.evaluate((e, props) => { const c = getComputedStyle(e); const r = e.getBoundingClientRect(); const o = { rect: [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)] }; for (const k of props) o[k] = c[k]; const i = e.shadowRoot && e.shadowRoot.querySelector('button,input,textarea,.inner-tag,div'); if (i) { const ci = getComputedStyle(i); o.inner = { tag: i.tagName }; for (const k of props) o.inner[k] = ci[k]; } return o; }, PROPS);
    } catch (e) { styles[label] = "取得失敗: " + String(e).split("\n")[0]; }
  }
  async function step(name, fn) { try { await fn(); log.push("OK " + name); } catch (e) { log.push("NG " + name + ": " + String(e).split("\n").slice(0, 10).join(" ~ ")); } }

  await step("open", async () => { await p.goto(URL0, { waitUntil: "domcontentloaded" }); await p.getByText("家事代行 2時間").first().waitFor({ timeout: 20000 }); await sleep(2000);
    const rej = p.getByRole("button", { name: "すべて拒否する" }); if (await rej.isVisible().catch(() => false)) { await rej.click(); log.push("cookie: すべて拒否する を押した"); await sleep(800); } });
  await step("01 services", async () => { await dump("01-services"); await sty("services/店名", p.getByText("高尾の家事手伝い みどり")); await sty("services/見出し サービス", p.getByText("サービス", { exact: true })); await sty("services/カード名", p.getByText("家事代行 2時間", { exact: true })); await sty("services/価格行", p.getByText("￥7,000 ・ 2時間")); await sty("services/説明", p.getByText("掃除機がけ、台所と水まわり").first()); await shot("01-services"); });
  await step("02 service detail", async () => { await p.getByText("家事代行 2時間", { exact: true }).first().click(); await p.getByText("指名なし").first().waitFor(); await settle(); await dump("02-staff"); await sty("staff/指名なし", p.getByText("指名なし")); await sty("staff/名前", p.getByText("小林 和美", { exact: true })); await sty("staff/紹介", p.getByText("台所と水まわりのこびりつき")); await sty("staff/その他", p.getByText("その他").first()); await sty("staff/追加ボタン", p.getByRole("button", { name: "追加" })); await sty("staff/見出しスタッフ", p.getByText("スタッフ", { exact: true })); await shot("02-staff"); });
  await step("03 pick 指名なし", async () => { await p.getByText("指名なし").first().click(); await sleep(800); await dump("03-staff-picked"); await shot("03-staff-picked"); await p.getByRole("button", { name: "追加" }).click(); await settle(); await dump("04-addmore"); await sty("addmore/次へ", p.getByRole("button", { name: "次へ" })); await sty("addmore/追加済み", p.getByText("追加済み")); await shot("04-addmore"); });
  await step("05 availability", async () => { await p.getByRole("button", { name: "次へ" }).click(); await p.getByText("時刻はJST").waitFor({ timeout: 20000 }); await settle(); await dump("05-calendar-week");
    await sty("cal/月見出し", p.getByText("2026年10月")); await sty("cal/週 選択中(今日)", p.getByText("23", { exact: true })); await sty("cal/週 利用不可日", p.getByText("22", { exact: true })); await sty("cal/週 空き日", p.getByText("24", { exact: true })); await sty("cal/曜日", p.getByText("木", { exact: true })); await sty("cal/タイムゾーン注記", p.getByText("時刻はJST")); await sty("cal/日付見出し", p.getByText("今日、2026年10月23日金曜日")); await sty("cal/案内文", p.getByText("次に予約可能な日は")); await sty("cal/主ボタン", p.getByRole("button", { name: "利用可能な予約日時へ" })); await sty("cal/前へ(無効)", p.locator("market-button[aria-label='先週']")); await sty("cal/次へ", p.locator("market-button[aria-label='来週']")); await sty("cal/展開ボタン", p.locator("market-button[aria-label='展開して月表示を表示']")); await sty("cart/下部カート", p.locator("[data-testid=mobile-cart]")); await sty("cart/サービス名", p.locator("[data-testid=mobile-cart]").getByText("家事代行 2時間")); await sty("cart/担当", p.locator("[data-testid=mobile-cart]").getByText("担当：すべてのスタッフ")); await shot("05-calendar-week"); });
  await step("06 month view", async () => { await p.locator("market-button[aria-label=\"展開して月表示を表示\"]").click(); await sleep(1200); await dump("06-calendar-month"); await sty("cal/月 利用不可日(10/22)", p.locator("market-date-picker market-date-picker-date[day='22']")); await sty("cal/月 選択中(今日10/23)", p.locator("market-date-picker market-date-picker-date[day='23']")); await sty("cal/月 空き日(10/26)", p.locator("market-date-picker market-date-picker-date[day='26']")); await sty("cal/月 曜日ヘッダー", p.locator("market-date-picker market-date-picker-date.weekday-header").first()); await shot("06-calendar-month"); });
  await step("07 next month + weekday", async () => { await p.locator("market-date-picker market-button[aria-label='Next month']").click(); await sleep(1500); await dump("07-calendar-nov"); await shot("07-calendar-nov");
    const d = p.locator(`market-date-picker market-date-picker-date[day='${DAY}']`); await d.first().click(); await settle(); await dump("08-times");
    await sty("cal/月 選択中(11/10)", d); await sty("cal/月 空き日(11/12)", p.locator("market-date-picker market-date-picker-date[day='12']")); await sty("time/選択日見出し", p.getByText(`2026年11月${DAY}日`)); await sty("time/午前ラベル", p.getByText("午前", { exact: true })); await sty("time/スロット", p.locator("market-button[data-testid=time-slot]").first()); await sty("time/夜間ラベル", p.getByText("夜間", { exact: true })); await sty("time/夜間 空き無し文言", p.getByText("予約可能な時間がありません")); await shot("08-times", { bottom: true }); });
  await step("09 pick time -> checkout", async () => { await p.locator("market-button[data-testid=time-slot]").first().click(); await p.getByText("連絡先情報").waitFor({ timeout: 20000 }); await settle(); await dump("09-checkout");
    await sty("co/お会計", p.getByText("お会計").first()); await sty("co/確保注記", p.getByText("予約が10分間確保されます")); await sty("co/予約カード", p.locator("[data-testid=checkout-summary], [data-testid*=summary]").first()); await sty("co/カード日付", p.getByText(`11月${DAY}日`)); await sty("co/カード時間", p.getByText(/d+:d+ – d+:d+/)); await sty("co/連絡先見出し", p.getByText("連絡先情報")); await sty("co/ログイン", p.getByText("ログイン", { exact: true })); await sty("co/電話番号欄", p.locator("input").nth(0)); await sty("co/姓欄", p.locator("input").nth(1)); await sty("co/メール欄", p.locator("input").nth(3)); await sty("co/SMS注記", p.getByText("このビジネスオーナーから")); await sty("co/住所見出し", p.getByText("この予約はどこで実施されますか？")); await sty("co/キャンセルポリシー見出し", p.getByText("キャンセルポリシー", { exact: true })); await sty("co/ポリシー本文", p.getByText("予約開始前にキャンセル")); await sty("co/予約する(押さない)", p.locator("market-button[data-testid=book-appointment-button-mobile], market-button[data-testid*=book-appointment]").first()); styles["co/フォーム要素(deep)"] = await p.evaluate((props) => { const out = []; const walk = (root) => { for (const e of root.querySelectorAll("*")) { if (e.shadowRoot) walk(e.shadowRoot); if (/^(input|select|textarea)$/i.test(e.tagName) || /input|select/i.test(e.tagName) || (e.childElementCount === 0 && ["お会計", "予約が10分間確保されます"].includes((e.textContent || "").trim()))) { const c = getComputedStyle(e), r = e.getBoundingClientRect(); const o = { tag: e.tagName, label: (e.getAttribute("placeholder") || e.getAttribute("label") || e.getAttribute("aria-label") || e.textContent || "").trim().slice(0, 20), rect: [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)] }; for (const k of props) o[k] = c[k]; out.push(o); } } }; walk(document); return out; }, PROPS);
    await shot("09-checkout", { bottom: true }); });
  fs.writeFileSync(`${OUT}log-${vp}.txt`, log.join("\n") + "\n\nhosts:\n" + [...reqs].join("\n"));
  fs.writeFileSync(`${OUT}styles-${vp}.json`, JSON.stringify(styles, null, 1));
  if (process.env.STOP) { await ctx.close(); continue; }
  await ctx.close();
}
await browser.close();
