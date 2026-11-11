# 食中毒よぼう

冷蔵庫は何℃？肉の加熱は何℃で何分？アニサキスは酢で死ぬ？家庭でできる食中毒予防の3原則（つけない・増やさない・やっつける）、家庭での6つのポイント、温度と時間のめやす、カンピロバクター・ノロウイルス・アニサキス・ジャガイモの芽などの特徴を、4つから選んで当てる1日5問のゲーム。知らなくても遊べます。押すだけ、時間制限なし。

- 遊ぶ: https://satou-aaaaa.github.io/shokuchudoku-yobo/
- 今日の5問（やさしい2・ふつう2・むずかしい1）はだれでも同じで1日1回。上級（むずかしい3問・ヒントなし）、練習（何度でも）、とことん（まちがえても続く・一発で何問当てられるか）、解いた種類が集まる「よぼう帳」があります。
- 問題は「3原則」「温度のめやす」「正しい説明」「食べ物と原因」「原因の特徴」「まちがい探し」「6つのポイント」「次の場面」「細かい数」「気をつけ方」「流れの順」「正しい組み合わせ」。正解すると「なぜ」ともとのページへのリンク、原因の札（読み・起きやすい食べ物・特徴）が出ます。
- 問題は357問（12種類）。チケット・回数制限はありません。
- 文字の大きさは3段から選べます。見やすさの設定（読みやすい文字・色の見分け・動きを減らす・読み上げ）もあります。
- 機種を変えるときは「引き継ぎ」で、記録をコードと QR にして移せます。

このゲームは、食中毒を防ぐきまりを知るためのものです。医療の助言には使えません。お腹をこわした、具合が悪いときは、医療機関に相談してください。温度や時間は資料の「めやす」で、守っても食中毒がまったく起きないとは言えません。

## 中身の出どころ

- [厚生労働省「食中毒」](https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/kenkou_iryou/shokuhin/syokuchu/index.html)
- [厚生労働省「家庭での食中毒予防」](https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/kenkou_iryou/shokuhin/syokuchu/01_00008.html)
- [厚生労働省「食中毒の原因（細菌以外）」](https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/kenkou_iryou/shokuhin/syokuchu/03.html)
- [農林水産省「食中毒から身を守るには」](https://www.maff.go.jp/j/syouan/seisaku/foodpoisoning/)
- [農林水産省「これで解決！食中毒予防のポイント」](https://www.maff.go.jp/j/syouan/seisaku/foodpoisoning/point.html)
- [厚生労働省「カンピロバクター食中毒予防について（Q&A）」](https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/kenkou_iryou/shokuhin/syokuchu/campylobacterqa.html)
- [厚生労働省「ノロウイルスに関するQ&A」](https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/kenkou_iryou/shokuhin/syokuchu/kanren/yobou/040204-1.html)
- [厚生労働省「腸管出血性大腸菌Q&A」](https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/0000177609.html)
- [厚生労働省「アニサキスによる食中毒を予防しましょう」](https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/0000042953.html)
- [厚生労働省「ハチミツを与えるのは1歳を過ぎてから」](https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/0000161461.html)
- [厚生労働省「自然毒のリスクプロファイル：フグ毒」](https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/kenkou_iryou/shokuhin/syokuchu/poison/animal_01.html)
- [厚生労働省「自然毒のリスクプロファイル：ジャガイモ」](https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/0000082069.html)
- [厚生労働省「自然毒のリスクプロファイル：イヌサフラン」](https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/kenkou_iryou/shokuhin/syokuchu/poison/higher_02.html)

資料が自動では読めなかった原因（ウエルシュ菌・セレウス菌・サルモネラ・腸炎ビブリオなど）や、資料によって書き方が分かれることは、問題の答えにしていません。期限表示の読み方は [食品表示よみ](https://satou-aaaaa.github.io/shokuhin-hyoji/) で遊べます。

## 記録と通信

記録は遊ぶ人のブラウザにだけ残り、ゲームから自動で外へ送ることはありません。例外は2つ：画面を開くと文字（Google Fonts）のために Google へつなぐので、文字が端末に保存済みでも Google に IP アドレスが届くことがあります。「Xで投稿」「LINEで送る」「結果をシェア」を押したときだけ、結果の文が選んだ先に渡ります（問題と答えは入りません）。

## 開発

```bash
bash scripts/setup.sh   # 最初に一度（最後に何かするよう出たら、それをしてから次へ）
node qa/run.mjs         # 検査（CI と同じ）
```

問題は `gen.js`（決まりは AGENTS.md）。

感想は [Issue のフォーム](https://github.com/satou-aaaaa/shokuchudoku-yobo/issues/new?template=feedback.yml) からどうぞ。
