# サイトの見本の仕様（2026-10-23 の立て直し後）

方針：予約は **Square 予約の実物**へつなぐ（主役）。サイトは本番の WordPress の見本。トップとスタッフ紹介だけ丁寧に作り、ほかの5ページはある程度の完成度でよい。ビルドなし、ES Modules、外部依存は Google Fonts（Noto Sans JP 400・500・700）だけ。

## ファイル
```
index.html  service.html  flow.html  area.html  faq.html  contact.html  staff.html
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

## ページ
- 全ページ共通：noindex、`<title>` は「◯◯｜高尾の家事手伝い みどり（デモ）」、`<meta name="description">`（本番の SEO の見本として、地域名を入れた1文）、見出しは h1 が1つ。
- `index.html`（丁寧に）
  - 最初の画面：見出し「掃除機がけと台所の片づけ。2時間からお伺いします。」、副文「八王子・高尾のご自宅へ。1時間3,500円。」、家族向けの1行（「ご家族が代わりに予約でき、報告も届きます」→ faq か flow の該当箇所へ）、主ボタン「空き状況を見て予約する」（`data-book="any"`）＋ `bookingNote()`、写真 `tatami-light.webp`（PC は右、スマホは見出しの下に低く）
  - 担当の顔：3名の丸い写真・姓・ひとこと、各「この人で予約する」（`data-book="s1"` など）、「スタッフ紹介を見る」
  - 続けて：できること、料金（2・3・4時間。税・交通費は「本制作時に確認」）、流れ（3手順）、家族向け、よくある質問の抜粋3問、対応エリア、お問い合わせへの導線
  - 自作の空き表は置かない
- `staff.html`（丁寧に）：3名を、大きめの写真・名前・ひとこと・得意なこと・勤務の曜日と時間の行で並べる。各「この人で予約する」。写真に「写真は素材です（本番はご本人）」
- `service.html`：できること3つ（写真・説明）、お受けできない作業の例、料金表、税・交通費・用具の注記
- `flow.html`：番号つきの手順（予約 → Square でカードの事前払い → 当日 → 作業後の報告）、取り消しの決まり（「本制作時に正式な規定を掲載」）、ご家族が代わりに予約する時
- `area.html`：対応エリアの説明と地区の一覧（八王子市の高尾町・東浅川町・初沢町・館町・散田町・狭間町・椚田町・長房町・元八王子町・横山町・明神町など、駅名 高尾・狭間・めじろ台・西八王子・八王子）。「エリア外もご相談ください」
- `faq.html`：10問前後（初めての利用、家にいる必要、鍵、同じ担当、家族が予約、支払い方法、取り消し、保険・身分証「本制作時に確認」、作業時間の延長、お受けできない作業）。`<details>` で開閉
- `contact.html`：名前・電話かメール・内容の見本フォーム。送信すると「デモのため送信しません。本番は無料のフォームサービスで届きます」のモーダル。電話番号の欄は「デモのため非掲載」

## data 属性（e2e 用）
- `header[data-chrome]`・`footer[data-chrome]`・`nav [data-nav-current]`
- `[data-book="any|s1|s2|s3"]`、`[data-booking-note]`
- `[data-staff-card="s1".."s3"]`（トップとスタッフ紹介）
- `html[data-font-scale]`
- `[data-demo-band]`

## 守ること
- 制作者の名前・連絡先を出さない。中黒・「→」・英大文字ラベル・影・グラデーションは使わない。最小の文字は 16px（`--fs-small`）。押せる高さ 44px 以上。390・375・1440 で横スクロールなし。主ボタンはトップの最初の画面（390×844・375×667）に入る
