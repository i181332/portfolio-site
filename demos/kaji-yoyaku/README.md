# 高尾の家事手伝い みどり（デモ）

八王子市・高尾周辺の家事代行サイトの見本です。本番は WordPress と Square 予約で作ります。予約は Square 予約の実物（架空の店のアカウント）につなぎ、サイトは本番の見本として8ページを静的ファイルで作っています。

- 計画：`PLAN.md`、仕様：`docs/spec-site.md`、決定：`docs/decisions.md`、引き継ぎ：`STATE.md`
- ビルドなし。ES Modules。外部依存は Google Fonts（Noto Sans JP）だけ
- 全ページ noindex。デモ注記を常時表示します

## 1. 公開の手順（Cloudflare Pages に静的ファイルを置く想定）

以下は手順の説明です。push と公開は、それぞれ別に承認を取ってから行います。

1. 公開する物：このフォルダの `*.html`、`css/`、`js/`、`assets/`。`tests/`、`notes/`、`docs/` は置かない
2. Cloudflare Pages で新しいプロジェクトを作る。ビルドコマンドは空、出力ディレクトリはこのフォルダ（リポジトリのサブフォルダなら、ルートディレクトリにそのパスを指定）
3. 公開 URL が決まったら、Stripe のテスト用 Payment Link の「決済後の移動先」を `（公開 URL）/payment.html?paid=1` にする
4. `js/config.js` に Square 予約の URL と Payment Link を入れる（2章）。入れ直したら再公開する
5. 公開後、スマホで通しで確かめる：サイト → スタッフを選ぶ → 空き時間 → 予約。`robots` の noindex が効いていることも見る
6. デモの確認が終わったら、Square のオンライン予約を止め、Cloudflare Pages の公開も閉じる

## 2. js/config.js の入れ方

`js/config.js` の `CONFIG` を書き換えます。空のままの項目は、ボタンを押すと「準備中」のモーダルが出ます。

| 項目 | 入れる物 |
|---|---|
| `booking.shop` | Square 予約の店全体の URL（予約サイトの URL。担当を選ぶ所から始まる） |
| `booking.staff.s1`・`s2`・`s3` | 担当を指定した入口の URL（山本・小林・森田）。作れなければ空のまま。空なら店全体の URL に行く |
| `payment.testLink` | Stripe のテスト用 Payment Link（2時間 7,000円）。決済後の移動先は `payment.html?paid=1` |

```js
booking: {
  shop: "https://…",
  staff: { s1: "https://…", s2: "https://…", s3: "https://…" },
},
payment: { testLink: "https://buy.stripe.com/test_…" },
```

担当ごとの URL は、Square の公式資料に「スタッフを指定したリンク」の作り方が書かれていません。作れない場合は、高度なウィジェット（担当を絞った埋め込み）を使うか、店全体の URL のままにします。

## 3. Square 予約の設定の要点

詳しい手順は `notes/square-setup.md`、調査の根拠は `notes/square-check.md` にあります。要点だけ示します。

- 管理画面はパソコンのブラウザの Square データ。メニュー名はアカウントで少し違う（`square-setup.md` の対応表を優先）
- 店：名前は「高尾の家事手伝い みどり」。予約を受け付ける場所は「お客さまの所在地での対面」。店舗の住所はデモ値の JR高尾駅（八王子市高尾町1201-2）、店舗のメールは `demo@example.com`
- サービス3つ：家事代行 2時間 7,000円・3時間 10,500円・4時間 14,000円。予約後の延長時間 30分（移動用）。オンライン予約をオン
- スタッフ3名：山本 さち子・小林 和美・森田 恵。名前・略歴・写真（`notes/square-photos/` の JPG）・勤務の曜日と時間を登録
- 受付の決まり：前日まで、30日先まで、予約の間隔30分、自動で受け付ける。「オンライン予約サイトからスタッフを削除する」はオフ
- 予約サイト：メインカラー `#1E4A3A`、バナーに「これはデモ用のページです。実際の受付は行いません。」、「時間と場所」のセクションは消す
- 担当ごとの入口：高度なウィジェットで担当を絞って作る
- 前払い（事前決済）はデモではオフ。カードの決済には審査の承認が要り、予約サイト側で請求なしに試す方法がありません。デモのカード払いの体験は `payment.html`（Stripe のテスト用）で行います。本番は承認の後で「全額前払いを求める」にします
- 公開前の確認：予約サイトと、テスト予約で届くメール・SMS に、制作者の個人情報が出ていないこと
- デモの確認が終わったら、「オンライン予約を有効にする」をオフにする

## 4. WordPress への対応表

本番は WordPress（固定ページ）で作ります。見本の各ページは次のように移します。

| 見本のページ | WordPress での形 | ブロック・プラグイン |
|---|---|---|
| `index.html` トップ | 固定ページ（フロントページに設定） | カバー、画像、カラム、ボタン。担当の顔はカラム＋円形の画像。予約ボタンは Square の URL へのリンク |
| `staff.html` スタッフ紹介 | 固定ページ | メディアとテキスト（3名分）。各「この人で予約する」は担当別の URL か、ウィジェットを貼ったカスタム HTML |
| `service.html` サービスと料金 | 固定ページ | 見出し、段落、テーブル（料金表）、画像 |
| `flow.html` ご利用の流れ | 固定ページ | リスト（番号つき）、グループ |
| `area.html` 対応エリア | 固定ページ | 見出し、リスト。地図を載せるなら埋め込み |
| `faq.html` よくある質問 | 固定ページ | 詳細（折りたたみ）ブロック。FAQ の構造化データは SEO プラグインで付ける |
| `contact.html` お問い合わせ | 固定ページ | フォームのプラグイン（Contact Form 7 など。本番の選定時に決める） |
| `payment.html` カード払いのお試し | 作らない（デモ用） | 本番は Square 予約の予約画面でカード払い |
| ヘッダー・フッター・メニュー | テーマのヘッダー・フッター、ナビゲーションメニュー | テーマの設定。屋号・対応エリア・特商法とプライバシーのページへのリンクはフッターに置く |
| 予約（Square 予約） | 各ページのボタン、または予約ページにカスタム HTML で埋め込み | Square 予約の埋め込みコード。埋め込んだ予約は別タブで開く（Square の仕様） |
| 文字サイズ切替 | テーマの小さなスクリプト、または対応プラグイン | 本番で実装方法を決める |
| `noindex` | デモのみ。本番は外す | 検索エンジンへの表示設定（本番で外す） |
| 設定値（店名・料金・URL） | テーマのカスタマイズ項目、または固定ページの本文 | `js/config.js` の値の置き場所 |

## 5. 写真の出典

すべて Pexels License（商用利用可、帰属表示は任意）。表示名は元ページで確認してください（`notes/photos.md`）。スタッフの写真は素材で、サイトにも「写真は素材です（本番はご本人）」と明記しています。

| ファイル | 撮影者（Pexels 表記） | 元ページ |
|---|---|---|
| `assets/tatami-light.webp` | Paolo Sanchez | https://www.pexels.com/photo/sunlight-on-traditional-japanese-interior-scene-32911574/ |
| `assets/kettle-window.webp` | nida-kurt-5079840 | https://www.pexels.com/photo/cozy-indoor-scene-with-teapot-and-flowers-28571994/ |
| `assets/window-green.webp` | leticia-alvares-1805702 | https://www.pexels.com/photo/cup-and-moka-pot-on-window-25542629/ |
| `assets/cloth-hand.webp` | Towfiqu Barbhuiya | https://www.pexels.com/photo/person-holding-gray-and-black-towel-11370616/ |
| `assets/kitchen-wood.webp` | Skylar Kang | https://www.pexels.com/photo/kitchen-counter-with-utensils-under-hanging-cupboard-6370035/ |
| `assets/staff-s1.webp`（山本） | Marcus Aurelius | https://www.pexels.com/photo/woman-smiling-at-the-camera-6787568/ |
| `assets/staff-s2.webp`（小林） | Nguyễn Tiến Thịnh | https://www.pexels.com/photo/smiling-woman-relaxing-indoors-with-books-33496099/ |
| `assets/staff-s3.webp`（森田） | ShotPot | https://www.pexels.com/photo/7705670/ |

書体は Noto Sans JP（Google Fonts、SIL Open Font License）。

## 6. テストの回し方

```
cd tests
npm install      # 初回のみ（Playwright を入れる）
npm run e2e
```

`tests/e2e/site.spec.mjs` が、8ページの表示、予約ボタン、メニュー、文字サイズ切替、カード払いのお試しなどを確かめます。Playwright のブラウザが無い時は、`npx playwright install chromium` を先に行います。
