# CSS 部品の一覧（tokens.css / base.css）

読み込み順：Google Fonts → `css/tokens.css` → `css/base.css` →（後で）`pages.css`。見本は `css/styleguide.html`。

## 約束
- **選択中は `role="radio"` ＋ `aria-checked="true"` に統一**（担当・利用時間・日付・時刻・文字サイズ切替）。親に `role="radiogroup"`。
- 予約できない時刻は `aria-disabled="true"`（`disabled` だと読み上げで飛ばされるため）。
- 状態は spec-core の data 属性で決まる：`data-status="open|closed"`、`data-open="true|false"`、`data-state="paid|pending|expired|cancelled"`、`html[data-font-scale="normal|large"]`。
- 隠す時は `hidden` 属性（エラー文・手順）。
- 色を足した：`--wakaba-text` #28704A（空きの文字。`--wakaba` は薄緑の面で 4.4:1 となり不足するため）、`--alert` #A3352B（入力の誤り）、`--line` / `--line-strong`（罫・枠）。

## クラス
| 部品 | クラス・構造 |
|---|---|
| 見出し | `h1`/`.title-display`、`h2`/`.title-step`、`.title-name`（スタッフ名）。いずれも明朝 |
| 文 | `.lead`、`.note`（補足・灰） |
| 数字と単位 | `<span class="figure [figure--price]">3,500<span class="unit">円</span></span>`。数字の前の「午前」は `.unit--pre` |
| 面 | `.band`（＋`.band--mist`／`.band--sugi`）、`.container`（最大1120）、`.flow`（最大520）、`.surface`（角丸20）、`hr.rule` |
| ボタン | `.btn.btn--primary`／`.btn--secondary`、`.btn--block`（横いっぱい）、`.btn--small`（管理画面）。無効は `disabled` |
| 文字リンク | `.link`、単独で置く時は `.link--action`（高さ56px） |
| 固定ヘッダー | `.flowbar > .flowbar__inner > button.back ＋ p.flowbar__step`（`手順 <b>3</b> / 5`）。sticky のため本文側の余白調整は不要 |
| 選んだ内容 | `dl.carry > dt（読み上げのみ）+ dd` |
| 文字サイズ切替 | `.scale-switch > .scale-switch__group[role=radiogroup] > button.scale-switch__option[role=radio]` |
| 入力欄 | `.field > label.field__label(+ .field__req) / p.field__hint / .input / p.field__error`。誤りは入力欄に `aria-invalid="true"`、エラー文の `hidden` を外し、`aria-describedby` で結ぶ |
| 切替 | `label.switch > span + input.switch__input[type=checkbox][role=switch]` |
| ○×の印 | `span.mark[aria-hidden]` ＋ `span.mark-label`（文字）。形は祖先の `data-status`／`data-open`／`aria-checked` で自動。×は CSS で描くので中身は空 |
| 時刻の1行 | `.slots[role=radiogroup] > button.slot[data-slot][data-status][data-reason]` の中に `.slot__time`（`.unit--pre`＋`.num`＋`.unit`）、`.slot__state`（`.mark`＋`.mark-label`）、`.slot__staff`（どなたでもよい時の担当） |
| 日付の帯 | `.datestrip[role=radiogroup] > button.day[data-date][data-open]` の中に `.day__date`、`.day__num`、`.day__wd`、`.mark`、`.visually-hidden`（空きの有無） |
| 選択の行 | `.choices > button.choice[role=radio]` の中に `.choice__body`（`.choice__title`＋`.choice__desc`）、`.choice__aside`（金額など） |
| 表 | `table.table.table--price`（料金）、`.table-wrap > table.table.table--admin`（管理）。金額のセルは `.num-cell`。状態は `tr[data-state] .state` |
| モーダル | `dialog.modal > .modal__body(.modal__title) + form.modal__actions[method=dialog]`。開く時は `showModal()` |
| 手順の切替 | 手順の親に `data-dir="forward|back"` を JS が付け、子の `[data-step]` の `hidden` を切り替えると横スライドする。読込時は動かない |
| デモ注記 | `body` の最後の子に `div.demo-band[role=note] > p`。sticky で画面下に残る |
| 補助 | `.visually-hidden`、`.stack`（子の間に16px） |

## 確かめたこと（notes/shots/）
- `sg-390.png`、`sg-1440.png`、`sg-390-large.png`、`sg-195-large-zoom200.png`（390px でブラウザ200%に相当）、`crop-*.png`（○×の拡大）。4つとも `scrollWidth == innerWidth`。全画面の撮影ではデモ帯が途中に写るが、sticky のためで実際は画面の下に残る。
- コントラスト（白地／薄緑）：ink 15.9/14.2、sugi 10.0/8.9、wakaba-text 6.0/5.3、ochre-text 5.7/5.1、mute 5.5/4.9、alert 6.8/6.0。黄土の塗りは非テキスト（白地で 3.4:1、基準は 3:1）。
