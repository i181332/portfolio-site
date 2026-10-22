# STATE（上書き式・5KB以内）

引き継ぎはこの1枚。計画は `PLAN.md`（承認済みの全文は `~/.claude/plans/iridescent-mapping-platypus.md`）、決定は `docs/decisions.md`、仕様は `docs/spec-site.md`。

## 済み（最新 commit は下の commit を参照）
- 立て直しの前の状態を 78b0858 に記録（自作の予約・管理画面、共通 CSS の直し：最小文字16px・上部の1行・誤りの赤枠）
- 予約システムの調査 notes/booking-systems.md（第一候補 Square 予約プラス）
- 新しい仕様 docs/spec-site.md、PLAN.md の書き直し

## 今動いている物
- Square 予約の確認と設定手順書（notes/square-check.md・square-setup.md）

## 停止点
- 次：e2e の試験を先に（tests/e2e/site.spec.mjs）→ 実装 a（入口：ui.js・pages.css・index・top・staff）→ b（ほか5ページ）と c（自作エンジンの削除）を並列 → 批評ループ → レビュー2本 → README → 送る文面
- 利用者の操作待ち：Square のアカウント作成と店の登録（手順書ができ次第）
- 戻し方：作業前 `366199c`、立て直し前 `78b0858`

## 触らない物
- ポートフォリオ本体：ルートの `index.html`・`src/`・`vite.config.ts`・ルートの `package.json`・`tsconfig*`

## 書込みの所有
- notes/square-*.md＝Square の確認担当。ほかは親（子に割り当てる時に書く）

## 判断待ち
- 決済のテストができない時の見せ方（Square の確認の結果しだい）
- push・Cloudflare Pages の公開・クライアントへの送信（それぞれ承認が要る）
