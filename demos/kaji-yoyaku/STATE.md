# STATE（上書き式・5KB以内）

引き継ぎはこの1枚。計画は `PLAN.md`（承認済みの全文は `~/.claude/plans/iridescent-mapping-platypus.md`）、決定は `docs/decisions.md`、仕様は `docs/spec-site.md`。

## 済み
- サイトの見本8ページ（index・staff・payment・service・flow・area・faq・contact）、共通部品（js/ui.js・site.js・content.js・config.js、css/pages.css・site.css・top.css）。自作の予約エンジンは削除済み。e2e `tests/e2e/site.spec.mjs` 131件全合格（`cd tests && npm run e2e`）
- Square 予約（デモ用アカウント「高尾の家事手伝い みどり」、Chrome の "demo" ブラウザでログイン済み）を親がブラウザ操作で設定：
  - 前払いなし（もとから）。取り消し規定の追加欄に「ご提案用のデモ…実際の受付や請求はありません」
  - 予約の場所＝顧客の所在地
  - サービス3つ：家事代行 2/3/4時間（7,000/10,500/14,000円、予約後の延長30分、オンライン予約可）
  - スタッフ3名（招待は利用者の Gmail の別名 +s1〜s3）。表示名・略歴あり。勤務：山本 月火水金9-17、小林 火木土日9-15、森田 月水木金土10-17
  - オーナーはオンライン予約を off

## 停止点（次にやること）
1. Square の残り：見本のサービス「コンサルティング（サービス例）」をオンライン予約 off／スタッフ写真3枚は利用者が手で上げる（`notes/square-photos/staff-s*.jpg`。画面の file input が shadow DOM で自動では上げられない）／店の営業時間が土日を塞いでいないか予約サイトで確認／予約 > オンライン予約 > チャネル で予約サイトの色（#1E4A3A）・ロゴ・公開、URL を取得／高度なウィジェットで担当ごとの入口
2. URL を `js/config.js` の `booking.shop`・`booking.staff` に入れる
3. テスト予約1件で、メールや予約サイトに実名が出ないか確認（**オーナーのログイン用メールは実名入りの Gmail**。公開側に出ないか特に確認）
4. 批評ループ2回 → 独立レビュー2本（高齢者・家族。サイト→Square で予約し終えるまで）→ README → 送る文面（税込33,000円への訂正を含む）
5. Stripe のテスト用 Payment Link（利用者の操作。公開 URL が決まってから）→ `CONFIG.payment.testLink`
- 戻し方：作業前 `366199c`、立て直し前 `78b0858`

## 触らない物
- ポートフォリオ本体：ルートの `index.html`・`src/`・`vite.config.ts`・ルートの `package.json`・`tsconfig*`

## 書込みの所有
- いま走っている子はいない。ファイルは親が次の子に割り当てる

## 判断待ち
- push・Cloudflare Pages の公開・クライアントへの送信（それぞれ承認が要る）
