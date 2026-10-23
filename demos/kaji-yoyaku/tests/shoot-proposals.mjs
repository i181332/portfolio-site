// 試作案の画面を撮る：node shoot-proposals.mjs a b c（サーバー 127.0.0.1:8766 が要る）
import { chromium } from "playwright";
import fs, { mkdirSync } from "node:fs";
import path from "node:path";

const BASE = "http://127.0.0.1:8766/proposals";
const OUT = new URL("../notes/shots/proposals/", import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1");
const SIZES = [{ w: 390, h: 844 }, { w: 1440, h: 900 }];
const PAGES = ["index", "staff"];

mkdirSync(OUT, { recursive: true });
// e2e と同じく、入っている chromium を探す
function findChromium() {
  const dir = path.join(process.env.LOCALAPPDATA || "", "ms-playwright");
  if (!fs.existsSync(dir)) return undefined;
  for (const d of fs.readdirSync(dir).filter((n) => /^chromium-\d+$/.test(n)).sort().reverse()) {
    const exe = path.join(dir, d, "chrome-win64", "chrome.exe");
    if (fs.existsSync(exe)) return exe;
  }
  return undefined;
}
let browser;
try { browser = await chromium.launch(); } catch { browser = await chromium.launch({ executablePath: findChromium() }); }
for (const p of process.argv.slice(2)) {
  for (const { w, h } of SIZES) {
    const page = await browser.newPage({ viewport: { width: w, height: h } });
    for (const name of PAGES) {
      await page.goto(`${BASE}/${p}/${name}.html`, { waitUntil: "networkidle" });
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
      await page.screenshot({ path: `${OUT}${p}-${name}-${w}-first.png` });
      // 遅延読み込みの画像を先に読ませてから全体を撮る
      await page.evaluate(() => Promise.all([...document.images].map((img) => {
        img.loading = "eager";
        return img.complete ? null : new Promise((r) => { img.onload = img.onerror = r; });
      })));
      await page.screenshot({ path: `${OUT}${p}-${name}-${w}-full.png`, fullPage: true });
      console.log(`${p} ${name} ${w}: 横はみ出し=${overflow}`);
    }
    await page.close();
  }
}
await browser.close();
