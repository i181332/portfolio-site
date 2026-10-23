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
1. サイト内の予約 book.html：公開済み（2026-10-23）。公開サイトで予約→完了、手元から Stripe テスト決済→公開の /book?paid=1 へ戻りを確認済み（notes/shots/live/）。残りは利用者の iPhone での確認と、文面の送信
2. Stripe（テスト）：2/3/4時間のリンク（config.js の payment.links）。戻り先は3本とも https://kaji-yoyaku-demo.pages.dev/book?paid=1（2026-10-23 設定）。
3. Square：予約サイト公開済み（config.js の booking.square）。デモの主の流れではなく、book.html の下のリンクで実物を見せる
4. 公開 https://kaji-yoyaku-demo.pages.dev/ （再公開：`sh scripts/build-dist.sh && npx wrangler@3 pages deploy dist --project-name kaji-yoyaku-demo --branch main --commit-dirty=true`）。再公開の後、公開サイトで予約→支払い→完了を1回通す
5. 送る文面 notes/message-draft.md：新しい流れに直した。費用の内訳は記入済み（22,000/8,800/2,200）。送信は利用者
- 手元のサーバー：127.0.0.1:8765（dist）、:8766（作業場所）、0.0.0.0:8770（スマホ確認用）
- 戻し方：予約ページ前 `efaa786`、仕様 `ab1b325`

## 触らない物
- ポートフォリオ本体：ルートの `index.html`・`src/`・`vite.config.ts`・ルートの `package.json`・`tsconfig*`

## 書込みの所有
- いま走っている子はいない。ファイルは親が次の子に割り当てる

## 判断待ち
- push・Cloudflare Pages の公開・クライアントへの送信（それぞれ承認が要る）
