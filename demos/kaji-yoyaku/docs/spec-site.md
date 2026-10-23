# サイトの見本の仕様（2026-10-23 の立て直し後）

方針：予約は **Square 予約の実物**へつなぐ（主役）。サイトは本番の WordPress の見本。トップとスタッフ紹介だけ丁寧に作り、ほかの5ページはある程度の完成度でよい。ビルドなし、ES Modules、外部依存は Google Fonts（Noto Sans JP 400・500・700）だけ。

## ファイル
```
index.html  service.html  flow.html  area.html  faq.html  contact.html  staff.html
payment.html（カード払いのお試し。WordPress の見本ではなく、デモ用）
css/tokens.css  base.css（そのまま）  pages.css（全ページ共通：ヘッダー・メニュー・フッター・デモ帯・上部の1行）
css/top.css（トップ固有）  css/site.css（ほかの6ページの共通のレイアウト）
js/config.js（設定）  js/content.js（スタッフなどの中身）  js/ui.js（共通部品）  js/top.js  js/site.js（ほか6ページの起動）
```
消す：booking.html・admin.html・js/booking.js・admin.js・store.js・availability.js・css/admin.css・tests/unit/・tests/e2e/booking.spec.mjs。format.js は yenParts・formatYen だけ使うなら残す。

## js/config.js
```js
export const CONFIG = {
  shopName: "高尾の家事手伝い みどり",
  area: "東京都八王子市・高尾周辺",
  hourlyRate: 3500,
  hoursOptions: [2, 3, 4],
  booking: {            // Square 予約の URL。空なら「準備中」のモーダル
    shop: "",            // 店全体（担当を選ぶ所から）
    staff: { s1: "", s2: "", s3: "" }, // 担当を指定した入口。作れなければ空のまま（店全体へ）
  },
  payment: {            // Stripe のテスト用 Payment Link（2時間 7,000円）。空なら「準備中」のモーダル
    testLink: "",
  },
  storagePrefix: "kajiDemo.",
};
```

## js/content.js
- `STAFF`：`{ id, name, photo: "assets/staff-s1.webp", intro, skills[], days: "月・火・水・金", hours: "午前9時〜午後5時" }` の3名。値は旧 store.js の SEED_STAFF と同じ（山本 さち子 / 小林 和美 / 森田 恵）。曜日と時刻は表示用の文字列で持つ。曜日の区切りは読点「、」を使う（中黒は使わない）
- `NAV`：メニューの並び `[{ href: "index.html", label: "トップ" }, service「サービスと料金」, flow「ご利用の流れ」, staff「スタッフ紹介」, area「対応エリア」, faq「よくある質問」, contact「お問い合わせ」]`

## js/ui.js（共通部品。各ページはこれを呼ぶだけ）
- 残す：`h`、`openModal`、`mountDemoBand`、`aboutDemoButton`、`familyName`、`applyFontScale`
- `mountFontScale(mount)`：store を使わず、`localStorage` の `kajiDemo.prefs`（`{"fontScale":"normal|large"}`、旧形式と互換）を try/catch で読み書き
- `mountChrome({ current })`：ヘッダー（店名・文字サイズ切替・メニュー）とフッター（屋号・対応エリア・メニュー・特商法とプライバシーのモーダル）とデモ帯を、`<header data-chrome>`・`<footer data-chrome>` に組む。`current` はメニューの今のページ。スマホのメニューは「メニュー」ボタンで開く（`<details>` か `aria-expanded`）
- `bookingHref(staffId?)`：config の URL を返す。担当の URL が空なら店全体、店全体も空なら `null`
- `wireBookingButtons(root)`：`[data-book]`（値は `any` か `s1`〜`s3`）の付いたリンク・ボタンに URL を付ける。`null` の時は押すと「予約システム（Square 予約）を準備中です」のモーダル
- 予約ボタンの直前か直後に、小さく「ここから先は予約システム（Square 予約）の画面です。本番も同じ画面です」を置く部品 `bookingNote()`
- REASON_TEXT・reasonText は消す

## ホームページに要る物の一覧（2026-10-23 洗い出し。利用者の批評「何の会社か、何をしてくれるか分からない」を受けて）
調べた型：`notes/research-top.md`（大手4社＋小〜中規模3店）。架空の店なので、未確認の事実（保険・実績の数字・お客様の声）は作らない。本番で入れる物は「本番で掲載」と置く。

### 全ページに共通
| 物 | 中身 | デモでの扱い |
|---|---|---|
| ヘッダー | 屋号、予約ボタン（常に見える）、電話番号、メニュー、文字の大きさ切替 | 電話番号は「本番で掲載」（架空の番号は他人につながるので出さない） |
| スマホの下の固定ボタン | 「予約する」を画面下に常に出す | 作る |
| フッター | 屋号、対応エリア、営業時間、メニュー、会社概要・特定商取引法の表記・プライバシーポリシーへのリンク、著作権 | 作る |
| デモ注記の帯 | 「ご提案用のデモです。実際の請求はありません」 | 残す |
| 検索と共有 | title、description（地域名入り）、OGP、favicon、noindex | 作る（noindex は残す） |
| 見つからない頁 | 404.html | 作る |

### ページ
| ページ | 中身 | 完成度 |
|---|---|---|
| トップ `index.html` | ①最初の画面：見出しに「八王子・高尾の家事代行」とできること、料金「1時間3,500円（2時間から）」、予約ボタン、人が作業している写真（文字と写真は分ける）②できること4項目（写真＋作業名）③安心の材料（同じ担当が伺う、家族が代わりに予約できる、作業後の報告、地元のスタッフ。事実として言える物だけ）④料金の要点 ⑤スタッフ3人（写真は同じ大きさ）⑥ご利用の流れ3段 ⑦よくある質問3問 ⑧対応エリア ⑨お知らせ2件 ⑩締めの予約 | 丁寧に |
| サービス内容 `service.html` | できること4項目の詳細（写真・具体例）、お受けできない作業、用具（ご自宅の物を使う等は本番で確認） | ある程度 |
| 料金 `price.html`（新規） | 料金表（2・3・4時間）、延長、交通費、取り消し料、支払い方法（カード、Square） | ある程度。決まっていない値は「本番で確認」 |
| ご利用の流れ `flow.html` | 予約→確認の連絡→当日→作業後の報告。家族が代わりに予約する時 | ある程度 |
| スタッフ紹介 `staff.html` | 3人：同じ大きさの写真、名前、得意なこと、出勤日と時間、その人で予約 | 丁寧に |
| 対応エリア `area.html` | 地区と駅の一覧、エリア外の相談 | ある程度 |
| よくある質問 `faq.html` | 10問前後、開閉式 | ある程度 |
| お問い合わせ `contact.html` | 見本フォーム（送らない）、電話は「本番で掲載」 | ある程度 |
| 会社概要 `company.html`（新規） | 屋号、代表者、所在地、開業、事業内容、営業時間、連絡先 | 項目だけ作り、値は「本番で記入」 |
| 特定商取引法の表記 `law.html`（新規、今はモーダル） | 事業者名、所在地、連絡先、料金、支払い方法と時期、取り消し | 項目だけ、値は「本番で記入」 |
| プライバシーポリシー `privacy.html`（新規、今はモーダル） | 集める情報、使い道、第三者への提供、問い合わせ先 | 雛形 |
| カード払いのお試し `payment.html` | 今のまま（デモ専用） | 今のまま |
| 本番で検討（今は作らない） | スタッフ募集、お客様の声、お知らせの一覧（WordPress の投稿で更新） | README に書く |

### 見た目の方向（試作3案の後の決定）
- 奇抜さより、清潔で頼めそうに見えることを優先。白地、杉緑 #23412F を主の色、薄い緑 #EEF3EC を区切りの面に、墨 #1E2420 を文字に
- 写真は「人が掃除・片づけをしている所」を主に（Pexels、出典は `notes/photos.md`）。部屋だけの写真は脇役
- スタッフの写真は3人とも同じ大きさ・同じ比率
- 文章は画面に出す前にレビュー役に見た目ごと読ませる（`notes/design-notes.md`）
- 画面遷移は View Transitions を1種類だけ（スタッフの写真がスタッフ紹介の写真へ、案Aの方式）。動きを減らす設定では切る

### payment.html の詳細（今のまま）
- `payment.html`（カード払いのお試し）
  - 冒頭：「Square 予約はお客様側で支払いを試せないため、デモではテスト用の支払い画面で、カード払いの操作を体験していただきます。実際の請求はありません」。本番は予約の時に Square のカード入力の画面が出る（見た目は異なるが、入れる物は同じ）
  - テストのカード番号の案内：4242 4242 4242 4242、期限は未来の月年、セキュリティコードは3桁の任意の数字
  - ボタン「テスト用の支払い画面を開く」（`[data-pay-test]`、同じタブ。URL は `CONFIG.payment.testLink`、空ならモーダル）
  - 戻り：`?paid=1` で開かれた時は「テストのお支払いが完了しました。実際の請求はありません」を表示（`[data-pay-done]`）し、`history.replaceState` でクエリを消す
  - トップの予約ボタンの近くと、flow.html の支払いの手順から、このページへのリンク（「カード払いを試す（テスト）」）を置く。メニューには入れない

## data 属性（e2e 用）
- `header[data-chrome]`・`footer[data-chrome]`・`nav [data-nav-current]`
- `[data-book="any|s1|s2|s3"]`、`[data-booking-note]`
- `[data-staff-card="s1".."s3"]`（トップとスタッフ紹介）
- `html[data-font-scale]`
- `[data-demo-band]`
- `[data-pay-test]`、`[data-pay-done]`、トップの `a[href="payment.html"]`
- ヘッダーの予約ボタン `header [data-book="any"]`、スマホの下の固定ボタン `[data-sticky-book]`（390px で見え、1440px では隠れてよい）
- トップ：最初の画面 `[data-hero]`（h1 に「家事代行」と「八王子」を含む、「3,500円」と「2時間から」を含む、写真 `img` を含む）、できること `[data-service-item]` が4つ（各 img と作業名）、安心の材料 `[data-assurance]`、料金 `[data-price]`、流れ `[data-flow-step]` が3つ、よくある質問 `[data-faq-item]` が3つ、エリア `[data-area]`、お知らせ `[data-news-item]` が2つ
- スタッフの写真 `[data-staff-card] img` は、同じページの3枚で表示の幅と高さが揃う（差 1px 以内）
- フッターに `a[href="company.html"]`・`a[href="law.html"]`・`a[href="privacy.html"]`
- 新しいページ：price.html・company.html・law.html・privacy.html・404.html（それぞれ h1 が1つ、header[data-chrome]・footer[data-chrome]・デモ帯がある。404.html にトップへのリンク）
- メニュー NAV：トップ、サービス内容、料金、ご利用の流れ、スタッフ紹介、対応エリア、よくある質問、お問い合わせ（会社概要はフッター）

## 守ること
- 制作者の名前・連絡先を出さない。中黒・「→」・英大文字ラベル・影・グラデーションは使わない。最小の文字は 16px（`--fs-small`）。押せる高さ 44px 以上。390・375・1440 で横スクロールなし。主ボタンはトップの最初の画面（390×844・375×667）に入る
