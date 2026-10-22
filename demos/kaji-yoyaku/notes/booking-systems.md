# 予約システムのデザイン自由度 調査（下書き：booking-systems.md に入れる予定の中身）

注：プランモード中のため、指定先 `C:\Users\Yuta_Matsuo\demo\demos\kaji-yoyaku\notes\booking-systems.md` には書けていない。承認後に、この中身をそのまま書き込む。
調査日：2026-10-22。【事実】は出典の記述。【推測】は出典が無く判断したもの。

## 1. 比較表

| 対象 | デザイン自由度 | 組み込み方 | 指名と写真 | 事前決済 | 5名の月額＋手数料 | データの置き場所 | 保守の負担 |
|---|---|---|---|---|---|---|---|
| Square 予約 | 中：レイアウト・書体・色・ロゴ・サービス画像・お知らせバナー・並び。CSS の記述は案内なし | URL／予約ボタン（色・文言・形・書体を変更可）／埋め込みコード／高度なウィジェット（スタッフ・サービスを絞る）。予約は別タブ・別ウィンドウで進む | 写真と経歴の登録可。複数スタッフの予約はプラス以上 | あり 3.6%（前払い） | プラス 3,000円/店舗（スタッフ数による加算の記載なし）＋3.6% | Square | 低 |
| STORES 予約 | 低〜中：スモール以上でロゴ・広告の非表示・予約者向けカレンダーの色 | 予約ページの URL・「予約する」ボタン | 指名は第三者の記述のみ。写真は未確認 | あり 3.3%〜（スタンダード）／5.2%〜（フリー） | 登録スタッフ3名まではチーム、5名はビジネス 28,600円（年契約）／31,790円（複数月） | STORES | 低 |
| Airリザーブ | 低〜中：ロゴ（縦80px）とテーマカラー | 予約ページへのリンク・予約ボタン | 未確認 | あり 3.24%（全プラン・審査あり） | フリー0円〜ベーシック5,500円・スタンダード11,000円。スタッフ数の上限は未確認 | リクルート | 低 |
| RESERVA | 中：メニュー詳細を HTML エディタで編集。全体の CSS は未確認 | iframe 埋め込み（エンタープライズ以上と検索要約にあり）・リンク | 「スタッフ指名タイプ」あり。写真は未確認 | あり 4.9%（第三者） | 公式料金ページは 403 で読めず。ブルー 3,850円（年）〜（第三者） | RESERVA | 低 |
| SELECTTYPE | 中〜高：文字色・背景・ボタン部品ごとに編集。CSS の記述なし | iframe（幅100%可）・「予約する」ボタン。WordPress はカスタム HTML ブロックに貼る | スタッフ指名あり。写真は未確認 | あり Stripe 経由 4.6%（プロ以上） | プロ 3,300円／プレミアム 11,000円（複数スタッフ向け） | SelectType＋Stripe | 低 |
| Amelia | 高：Customize で全体の色・ボタン・書体、手順ごとの色。CSS も可 | ショートコード・Gutenberg ブロック（サイト内に直接） | 従業員の写真は未確認 | Starter は Square のみ、Standard 以上は複数の決済 | 年額 Pro $149〜199 等（自分のサーバー代は別）＋決済会社の手数料 | 自分のサーバー | 高 |
| Bookly | 高：新しい形式の予約フォームではスタッフの写真と説明を表示。CSS 可（推測） | ショートコード・フォーム | 写真つきスタッフカードあり | Stripe・PayPal | Pro $39/年 or $99 買切（追加機能は別）＋決済手数料 | 自分のサーバー | 高 |
| LatePoint | 高：色は CSS（公式の CSS 例あり）、独自の書体の設定、ボタン | ショートコード・ボタン・Elementor/Gutenberg・即時予約ページ | 担当者を選ぶ手順あり。写真は未確認 | Stripe・PayPal・Square | Starter $69〜99/年＋決済手数料 | 自分のサーバー | 高 |
| Booking Package | 中〜高：カレンダーの CSS を自由に変更 | ショートコード | スタッフの機能の記述なし | Stripe・PayPal（有料の Standard プランのみ） | 価格は未確認 | 自分のサーバー | 高 |
| Square Bookings API で独自の画面 | 最高：画面は自作。カード入力は Web Payments SDK | 自作 | 自作 | Square。日本では3Dセキュアを自動で有効化 | 書込みにはプラス以上（3,000円）＋開発費 | Square（＋自分のサーバー） | 最高 |

## 2. 各対象の要点と出典

### Square 予約
- 【事実】料金：フリー0円、プラス3,000円、プレミアム8,000円（いずれも店舗ごとの月額）。複数スタッフの予約はプラス以上。オンラインの前払いは3.6%、保存済みカードは3.75%。https://squareup.com/jp/ja/appointments/pricing
- 【事実】ロゴとブランドカラーを設定すると、予約サイト・レシート・SNS の見た目が揃う。ロゴは200×200px 以上。スタッフのプロフィール写真と経歴を登録できる。サービスに画像を付けられ、並び順も変えられる。https://squareup.com/help/jp/ja/article/8425-promote-your-brand-and-services-on-your-booking-site
- 【事実】予約サイトでは、レイアウト・書体・色・ページを選べる。サービスの並べ替えと、お知らせバナーの追加もできる。https://squareup.com/help/jp/ja/article/7243-customize-your-square-online-booking-site
- 【事実】他のサイトへの組み込み方は4つ。URL、予約ボタン（色・文言・形・書体を変更可）、予約フローの埋め込み、高度なウィジェット（スタッフとサービスを指定）。埋め込んだフローは「別のタブまたはウィンドウ」で開く。https://squareup.com/help/jp/ja/article/5399-invite-customers-to-book-online
- 【事実】日本の全加盟店で、2025-03-31から3Dセキュアを自動で有効化（加盟店側の手続きは不要）。https://community.squareup.com/t5/Square%E3%83%97%E3%83%AD%E3%83%80%E3%82%AF%E3%83%88%E3%81%AE%E6%9C%80%E6%96%B0%E6%83%85%E5%A0%B1/zhong-yao-3Dsekyua-dao-runo-yi-wu-huaheno-dui-yingni-guanshimashite/td-p/772857（Square の公式告知。コミュニティ上に掲載）
- 【推測】カード入力の画面は Square 側の予約フローの中にある。CSS を自由に書く機能はない（どのヘルプにも記述がない）。

### STORES 予約
- 【事実】月額（年契約／複数月契約）。フリー0円、スモール9,790円／12,980円、チーム19,690円／22,880円、ビジネス28,600円／31,790円、エンタープライズ66,000円／77,000円。登録スタッフ数は、チームが3、ビジネスが20。https://stores.fun/reserve/pricing
- 【事実】スモール以上で、予約受付ページのロゴのカスタマイズ、広告の非表示、予約者向けカレンダーの色の変更ができる。事前決済は全プランで使え、手数料はフリーが5.2%〜、スタンダードが3.3%〜（中小特別料率の適用時）。同上
- 【未確定】スタッフの写真つき指名の可否と、埋め込みコードの有無。

### Airリザーブ
- 【事実】料金はフリー0円、ベーシック5,500円、スタンダード11,000円、プレミアムは問い合わせ。オンライン決済は3.24%で全プランで使える（カード会社の審査あり）。ホームページには予約ボタンのリンクを置く。https://airregi.jp/reserve/
- 【事実】デザイン設定は、ロゴ画像（500KB 以下。縦80px、スマートフォンでは縦40px に縮小）とテーマカラー。https://faq.airreserve.net/hc/ja/articles/201767439
- 【未確定】スタッフの写真・指名、スタッフ数の上限。

### RESERVA
- 【事実（検索の要約による）】iframe でホームページに埋め込める。使えるのはエンタープライズ以上。https://support.reserva.be/hc/ja/articles/235660068 （WebFetch は 403。本文は直接読めていない）
- 【事実】HTML エディタで、メニュー詳細の文字の色・大きさ・リンクを変更できる。https://digital.reserva.be/function-introduction-html-editing/
- 【第三者】決済手数料4.9%、ブルー3,850円（年契約）。https://atsoho.com/blog/compare-reserva
- 【未確定】公式の料金と、5名の場合のプラン。

### SELECTTYPE
- 【事実】料金はフリー、ベーシック1,650円、プロフェッショナル3,300円（3か月先まで受付）、プレミアム11,000円（1年先まで受付）。カード決済は Stripe 3.6%に SelectType 側の手数料が加わり、合計はフリー5.6%、ベーシック4.9%、プロ以上4.6%。https://select-type.com/price.php
- 【事実】iframe と「予約する」ボタンで組み込める。iframe の幅は100%にできる。スタッフ指名予約に対応。https://select-type.com/reserve.php ／ https://blog.select-type.com/yoyakuform-tukurikata/wordpress-yoyakuform-embed-setting/
- 【事実】文字色・背景・ボタンの部品ごとにデザインを編集できる。https://select-type.com/about.php
- 【未確定】スタッフの写真。5名ならプロとプレミアムのどちらが必要か。

### WordPress のプラグイン
- Amelia【事実】Amelia → Customize で、全体の色・ボタン・書体を設定し、手順ごとの色も変えられる。CSS は最後の手段とされている。https://wpamelia.com/documentation/customize/ 。料金と決済：Starter は Square の決済だけ、Standard 以上は複数の決済方法。https://wpamelia.com/pricing/
- Bookly【事実】新しい形式のフォームでは、スタッフのカードに写真と説明が出る。https://www.booking-wp-plugin.com/docs/configuring-bookly/getting-started/modern-booking-forms/ 。Pro は $39/年 または $99 の買切。Stripe と PayPal に対応。https://www.booking-wp-plugin.com/pricing/
- LatePoint【事実】色は CSS で変える（公式の CSS 例あり）。https://latepoint.com/docs/custom-css-for-changing-colors/ 。料金は Starter $69（初年度）／$99。Stripe・PayPal・Square に対応。https://www.latepoint.com/pricing/
- Booking Package【事実】カレンダーの CSS を変えられる。オンライン決済（Stripe・PayPal）は有料の Standard プランのみ。有効インストールは10,000以上。https://wordpress.org/plugins/booking-package/
- 共通【推測】顧客の個人情報は WordPress の DB に入る。本体・プラグイン・PHP の更新、バックアップ、改ざん対策は自分の負担になる。カード番号は Stripe・Square の部品が扱うが、決済の部品の見た目はプラグインの範囲に限られる。

### Square Bookings API（参考）
- 【事実】seller-level の予約の作成・変更・取消には、プラス以上の契約が要る。フリーでは buyer-level だけ。https://developer.squareup.com/docs/bookings-api/what-it-is
- 【推測】画面は自由に作れるが、開発と保守の費用が33,000円の予算を大きく超える。

## 3. 推奨（上位2つ）
1. **Square 予約（プラス）**。月3,000円で、店舗ごとの定額（スタッフの人数による加算はページに記載なし）。写真と経歴つきのスタッフを登録でき、スタッフ別の予約はプラス以上。スタッフを指定した予約ボタン・ウィジェットを WordPress に貼れる。3Dセキュアは自動。データは Square が持ち、保守は軽い。デザインは色・ロゴ・書体・レイアウトまで。
2. **SELECTTYPE（プロ 3,300円、複数スタッフはプレミアム 11,000円）**。部品ごとに色を変えられ、iframe を幅100%で WordPress に埋め込める。サイトに一番馴染む。ただし手数料4.6%は Square の3.6%より高く、スタッフの写真は未確認。
- 外したもの：STORES は5名でビジネス28,600円/月と高い。Airリザーブはスタッフの写真が未確認でデザインの幅が狭い。RESERVA は埋め込みにエンタープライズ以上が必要で手数料4.9%。WordPress のプラグインはデザインの自由度は高いが、個人情報と更新の保守が依頼主の負担になり、専門知識なしの運用に合わない。

## 4. WordPress 側と揃えるために現実的にできること
1. 予約システムのブランドカラー・ロゴ・書体を、サイトの配色・ロゴ・書体に合わせる（Square：ロゴとブランドカラー、レイアウト、書体）。
2. スタッフ紹介（大きな写真・大きな文字）と「予約の流れ」の案内は WordPress 側に作る。各スタッフの欄に、そのスタッフを指定した予約ボタン（Square の高度なウィジェット、または色と文言を変えたボタン）を置く。
3. 予約と決済の画面そのものは触らない。その手前の WordPress の案内で、文字を大きくし、手順を図で示し、電話での予約の窓口も書く。
