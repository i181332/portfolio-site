# STATE（上書き式・5KB以内）

引き継ぎはこの1枚（dev-flow の handoff.md は作らず、ここで兼ねる）。計画は `PLAN.md`、決定は `docs/decisions.md`、中核 JS の仕様は `docs/spec-core.md`、デザインの控えは `notes/design-notes.md`。

## 済み（未 commit を含む）
- 写真5枚（assets/、Pexels、442KB。一覧 notes/photos.md。撮影者名は README 前に元ページで要確認）
- CSS 基盤（css/tokens.css・base.css・styleguide.html、部品一覧 notes/css.md）。黄土色は残す
- 中核 JS（js/config・format・availability・store）。単体テスト tests/unit/。レビュー1回目の指摘は spec の「補足2」に反映済み

## 今動いている物
- 中核 JS の補足2対応（js/availability.js・store.js）
- 予約フロー（booking.html・js/ui.js・js/booking.js・css/pages.css）

## 停止点
- 次：両方の結果を確認 → 全テスト → commit → 中核 JS の再レビュー → index.html → admin.html → 批評ループ2回 → README → 検証
- 戻し方：基準 commit `366199c`（作業前）、`c7b05bd`（仕様のみ）
- 控え：`notes/`

## 触らない物
- ポートフォリオ本体：ルートの `index.html`・`src/`・`vite.config.ts`・ルートの `package.json`・`tsconfig*`

## 書込みの所有
- 中核 JS 4ファイル＝中核の実装担当、booking.html・ui.js・booking.js・pages.css＝予約フロー担当、tests/＝テスト担当

## 判断待ち
- push（承認が別に要る）。Cloudflare Pages・Stripe は利用者の操作
