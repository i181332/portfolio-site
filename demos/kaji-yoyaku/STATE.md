# STATE（上書き式・5KB以内）

引き継ぎはこの1枚（dev-flow の handoff.md は作らず、ここで兼ねる）。計画は `PLAN.md`、決定は `docs/decisions.md`、中核 JS の仕様は `docs/spec-core.md`、デザインの控えは `notes/design-notes.md`。

## 済み（commit 済み、最新 f015951）
- 写真（assets/。風景5枚＋スタッフ3枚、Pexels。一覧 notes/photos.md）
- CSS 基盤（css/tokens.css・base.css・styleguide.html、部品一覧 notes/css.md）。黄土色は残す
- 中核 JS と単体テスト164件（全合格、再レビューの指摘まで対応済み）
- 予約フロー4手順（booking.html・js/ui.js・js/booking.js・css/pages.css）。担当と日時は写真つきで1画面

## 今動いている物
- トップ（index.html・js/top.js・css/top.css）
- 管理画面（admin.html・js/admin.js・css/admin.css）

## 停止点
- 次：両方の画面を目で確認 → commit → 予約画面の小さな直し（「どなたでも」の円の中の文字「指名なし」と下の名前が重複）→ 批評ループ2回（390・1440、他サイトとの見分け）→ README → 検証（PLAN の検証方法）
- 戻し方：基準 commit `366199c`（作業前）
- 控え：`notes/`

## 触らない物
- ポートフォリオ本体：ルートの `index.html`・`src/`・`vite.config.ts`・ルートの `package.json`・`tsconfig*`

## 書込みの所有
- index.html・top.js・top.css＝トップ担当、admin.html・admin.js・admin.css＝管理画面担当。ほかのファイルは親（変更は次の子に割り当て）

## 判断待ち
- push（承認が別に要る）。Cloudflare Pages・Stripe は利用者の操作
