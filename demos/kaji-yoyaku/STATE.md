# STATE（上書き式・5KB以内）

引き継ぎはこの1枚（dev-flow の handoff.md は作らず、ここで兼ねる）。計画は `PLAN.md`、決定は `docs/decisions.md`、中核 JS の仕様は `docs/spec-core.md`。

## 今動いている物
- 第1陣（並列）：写真の候補（assets/）・CSS 部品（css/）・中核 JS のテスト（tests/）

## 停止点
- 次：テストができたら、実装担当に js/format.js・availability.js・store.js・config.js を書かせる → booking.html → index.html → admin.html → 決済 → 批評ループ
- 戻し方：基準 commit `366199c`（作業前のきれいな状態）
- 控え：子の控えは `demos/kaji-yoyaku/notes/`

## 触らない物
- ポートフォリオ本体：ルートの `index.html`・`src/`・`vite.config.ts`・ルートの `package.json`・`tsconfig*`

## 書込みの所有
- `assets/`＝写真担当、`css/`＝CSS 担当、`tests/`＝テスト担当、`js/`＝実装担当（テストの後）

## 判断待ち
- push（承認が別に要る）。Cloudflare Pages・Stripe は利用者の操作
