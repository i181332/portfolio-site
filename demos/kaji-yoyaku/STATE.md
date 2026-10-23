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
1. 作り直し：仕様 `docs/spec-site.md`「ホームページに要る物の一覧」（済）→ 写真の取得（子、assets/work-*.webp）と e2e の書き直し（子、tests/e2e）を並列中 → 実装（implementer）→ 文章と見た目の審査（reviewer）→ 親がスマホ幅で確認
2. Square：予約サイト公開済み `https://book.squareup.com/appointments/yty8z30rub8b6y/location/L54G6PFCMRTWP`（config.js に反映済み）。テスト予約1件で実名が出ないか確認（未）。スタッフ写真・ロゴは利用者が手で上げる
3. Cloudflare Pages：利用者の `npx wrangler@3 login` 待ち → `sh scripts/build-dist.sh` → `npx wrangler@3 pages deploy dist --project-name kaji-yoyaku-demo`
4. 送る文面 `notes/message-draft.md` に URL と費用の内訳を入れる
- 試作3案 `proposals/a〜c`（不採用、参考）。手元のサーバー：127.0.0.1:8765（dist）、:8766（作業場所）、0.0.0.0:8770（スマホ確認用 scratchpad/preview）
- 利用者の Windows はアニメーション効果がオフ（遷移は動画で見せる：tests/record-transitions.mjs）
- 戻し方：作業前 `366199c`、試作 `d981eaf`

## 触らない物
- ポートフォリオ本体：ルートの `index.html`・`src/`・`vite.config.ts`・ルートの `package.json`・`tsconfig*`

## 書込みの所有
- いま走っている子はいない。ファイルは親が次の子に割り当てる

## 判断待ち
- push・Cloudflare Pages の公開・クライアントへの送信（それぞれ承認が要る）
