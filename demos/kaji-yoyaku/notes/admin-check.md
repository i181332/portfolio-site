# 管理画面の確認（admin.html）
スクリプト：scratchpad の admin-check.mjs（Playwright、8772番）。結果は16項目すべて OK、コンソールエラー0件。
- 予約を入れる→管理画面に「支払い済み」→取り消す→予約画面で枠が ○ に戻る
- 休みを入れる→予約画面で DAY_OFF。勤務日でない日は押しても変わらない
- 期限切れ pending、重複（sessionId 末尾6文字）、代理予約、残り分数の表示
- 初期化で予約・休みがシードに戻る
- 横スクロール無し：390（標準・大きく）、1440
- 写真：notes/shots/admin-390-*.png、admin-1440-*.png
