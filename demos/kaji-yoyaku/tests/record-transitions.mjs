// 試作案の画面遷移を動画に撮る：node record-transitions.mjs a b c（サーバー 127.0.0.1:8766 が要る）
// トップ → スタッフ（押した人）→ 戻る の動きを、スマホ幅で1本ずつ撮る
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const BASE = "http://127.0.0.1:8766/proposals";
const OUT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1")), "../notes/shots/proposals/video");
const SIZE = { width: 390, height: 844 };

function findChromium() {
  const dir = path.join(process.env.LOCALAPPDATA || "", "ms-playwright");
  if (!fs.existsSync(dir)) return undefined;
  for (const d of fs.readdirSync(dir).filter((n) => /^chromium-\d+$/.test(n)).sort().reverse()) {
    const exe = path.join(dir, d, "chrome-win64", "chrome.exe");
    if (fs.existsSync(exe)) return exe;
  }
  return undefined;
}

fs.mkdirSync(OUT, { recursive: true });
let browser;
try { browser = await chromium.launch(); } catch { browser = await chromium.launch({ executablePath: findChromium() }); }
for (const p of process.argv.slice(2)) {
  const context = await browser.newContext({ viewport: SIZE, reducedMotion: "no-preference", recordVideo: { dir: OUT, size: SIZE } });
  const page = await context.newPage();
  await page.goto(`${BASE}/${p}/index.html`, { waitUntil: "networkidle" });
  // スタッフ頁の2人目へのリンクまで下ろしてから押す
  const link = page.locator('a[href*="staff.html#s2"]').first();
  await link.scrollIntoViewIfNeeded();
  await page.waitForTimeout(800);
  await link.click();
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1500);
  await page.goBack();
  await page.waitForTimeout(1500);
  const video = page.video();
  await context.close();
  const dest = path.join(OUT, `${p}-transition.webm`);
  fs.renameSync(await video.path(), dest);
  console.log(`${p}: ${dest}`);
}
await browser.close();
