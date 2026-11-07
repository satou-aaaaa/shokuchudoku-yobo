// 食中毒よぼう の検査。全部の問題の中身（選び肢・答え・出典・答えを gen.js とは別に持った原因・3原則・説明の正誤・数・6つのポイント・流れの順の表で確かめる）・
// 今日の5問と上級の組み方（3年分）・通しで遊ぶ・まちがい・ヒント・続きから・上級・練習・とことん（何百回作って重ならない）・
// よぼう帳・実績・カレンダー・あとから・文字の大きさ・スマホ幅・正解のあとの札・PWA・引き継ぎコード・見やすさを確かめる。
// 使い方: node qa/run.mjs   失敗があれば終了コード 1。結果は qa-report/report.md。
import { chromium } from "playwright";
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { checkTransfer } from "./transfer-check.mjs";
import { checkSwStall } from "./sw-check.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const results = [];
const check = (name, ok, detail = "") => results.push({ name, ok: !!ok, detail: String(detail).slice(0, 400) });
const G = createRequire(import.meta.url)(path.join(root, "gen.js"));

// ---- 0. gen.js とは別に持つ表（出典メモ /mnt/project-files/games/shokuchudoku-sources.md の要点から写したもの）----
// 原因：[名前, 読み, 特徴, 起きやすい食べ物]
const TT = [["カンピロバクター","かんぴろばくたー","数百個ほどの少ない菌でも発症する細菌。鶏肉で多い","鶏肉の刺身やタタキ"],["ノロウイルス","のろうぃるす","冬に多いウイルス。調理する人の手を通して広がりやすい","生や加熱不足の二枚貝"],["腸管出血性大腸菌（O157など）","ちょうかんしゅっけつせいだいちょうきん","100個ほどでも感染し、血便や重い合併症を起こすことがある","生焼けのハンバーグや牛レバー刺し"],["アニサキス","あにさきす","魚介類にいる寄生虫。食酢やしょうゆ、わさびでは死なない","サバやイカなどの刺身"],["ボツリヌス菌（乳児ボツリヌス症）","ぼつりぬすきん","芽胞は熱に強く、ふつうの加熱では死なない。1歳未満は特に注意","1歳未満の赤ちゃんが食べたはちみつ"],["黄色ブドウ球菌","おうしょくぶどうきゅうきん","手の傷口にいて、さわった食べ物について食中毒を起こすことがある",null],["フグ毒（テトロドトキシン）","ふぐどく","肝臓・卵巣・皮に多い毒。食後20分〜3時間ほどでしびれやまひ","素人が調理したフグ"],["ソラニン類","そらにんるい","芽や、光に当たって緑色になった皮に多い毒","芽や緑色の皮が残ったジャガイモ"],["コルヒチン","こるひちん","イヌサフランの毒。花・葉・球根のどれも強い毒","ギボウシとまちがえて食べたイヌサフランの葉"]];
const TN = Object.fromEntries(TT.map(([n, y, w, f]) => [n, { n, y, w, f }])), TW = Object.fromEntries(TT.map(([n, , w]) => [w, n])), TF = Object.fromEntries(TT.filter((x) => x[3]).map(([n, , , f]) => [f, n]));
const short = (w) => w.split("。")[0];
// 3原則：行いの言葉 → 原則（資料の分け方：洗う・分ける・包む＝つけない、冷やす・早く冷ます・室温に置かない＝増やさない、加熱・熱湯＝やっつける）
const GT = { つけない: /手を洗う|汁が|先に切り|箸を分ける|袋に分けて/, 増やさない: /冷蔵庫|冷凍庫|最後に買う|早く冷やす|室温に長く/, やっつける: /中心部が75|温め直す|熱湯で消毒|十分に加熱|焼く/ };
const genOf = (p) => { const m = Object.keys(GT).filter((k) => GT[k].test(p)); return m.length === 1 ? m[0] : null; };
// 説明の正誤
const TRUTH = { "冷蔵庫は10℃以下に保つのがめやす": 1, "冷蔵庫や冷凍庫に詰めるのは、7割くらいまで": 1, "肉の加熱は、中心部が75℃で1分間以上がめやす": 1, "食酢やわさびをつけても、アニサキスは死なない": 1, "1歳未満の赤ちゃんに、はちみつを与えない": 1, "焼肉では、生の肉をつかむ箸と食べる箸を分ける": 1, "冷凍食品は、冷蔵庫の中か電子レンジで解凍する": 1, "残った食品は、浅い容器に小分けして早く冷やす": 1, "ノロウイルス対策では、アルコールは石けんと流水の手洗いの代わりにならない": 1, "塩素系と酸素系の漂白剤は、混ぜて使わない": 1, "鶏肉の刺身やタタキは、カンピロバクターの原因になりやすい": 1, "まな板では、生野菜を先に切り、生の肉は後で切る": 1, "食べられると確実に分からない野草は、採らない・食べない": 1, "手に傷があるときは、傷口の菌が食べ物につくことがある": 1,
  "冷蔵庫は、20℃以下なら十分に冷えている": 0, "冷蔵庫は、すき間なく詰めたほうがよく冷える": 0, "酢でしめたり、わさびをつけたりすれば、アニサキスは死ぬ": 0, "はちみつは加熱すれば、1歳未満の赤ちゃんにも与えてよい": 0, "焼肉は、生の肉をつかむ箸で、そのまま食べてかまわない": 0, "冷凍の肉は、台所に出しっぱなしにして解凍するのがよい": 0, "残った料理は、大きな鍋のまま室温でゆっくり冷ます": 0, "ノロウイルスは、アルコールで手をふけば石けんの手洗いはいらない": 0, "新鮮な鶏肉なら、生で食べても食中毒の心配はない": 0, "生の肉を切ったまな板で、そのまま生野菜を切ってよい": 0, "肉は、表面に焼き色がつけば中まで火が通っていなくてよい": 0, "ノロウイルスの食中毒は、夏にしか起こらない": 0, "ジャガイモの芽や緑色の皮は、そのまま食べても大丈夫": 0, "フグの毒のある部分は、自分で見分けて調理すれば安全": 0 };
// 数と気をつけ方：問題の始まり → 答え
const FT = [["冷蔵庫の温度","10℃以下"],["冷凍庫の温度","−15℃以下"],["冷蔵庫・冷凍庫に詰める","7割程度"],["肉を加熱する","中心部が75℃で1分間以上"],["残った食品を温め直す","75℃以上"],["はちみつを与えてはいけない","1歳未満"],["ノロウイルスの食中毒が多い","冬（12月〜3月）"],
  ["カンピロバクターの潜伏","1〜7日間"],["ノロウイルスの潜伏","24〜48時間"],["腸管出血性大腸菌（O157など）の潜伏","3〜8日"],["腸管出血性大腸菌は、何個","100個程度"],["カンピロバクターは、どのくらい","数百個程度"],["家庭でアニサキスを冷凍","−20℃で24時間以上"],["アニサキスを加熱","70℃以上（60℃なら1分）"],["ノロウイルスのおそれがある二枚貝","中心部が85〜90℃で90秒以上"],["ボツリヌス菌の芽胞","120℃で4分"],["フグ毒で、しびれ","20分〜3時間"],["腸管出血性大腸菌に感染した人","6〜7%"],["牛の肝臓","2012年"],["ノロウイルス対策で、まな板","85℃以上で1分以上"],["ノロウイルスの吐いた物を処理するときの、塩素","約1,000ppm"],
  ["ジャガイモで、毒","芽と、緑色になった皮"],["ジャガイモの毒（ソラニン類）を減らし","ゆでる・二度ゆでする"],["イヌサフラン","ギボウシやギョウジャニンニク"],["フグ毒が多い","肝臓・卵巣・皮"],["フグを食べる","素人が見分けたり調理したりしない"],["食べられると確実に","採らない・食べない・人にあげない"],["1歳未満の赤ちゃんに、はちみつを与えないのは","乳児ボツリヌス症"],["家庭でアニサキスを防ぐ","目でよく見て取り除き、内臓を生で食べない"],["カンピロバクターの食中毒のあと","ギラン・バレー症候群"],["ノロウイルスの吐いた物の処理に使う","次亜塩素酸ナトリウム（塩素系）"],["黄色ブドウ球菌","手にけがをしているとき"],["腸管出血性大腸菌の対策","100℃で5秒程度湯がく"],["加熱用の二枚貝","よく手を洗い、器具を洗って殺菌する"],["食中毒の原因として","細菌・ウイルス・自然毒・寄生虫など"]];
// 流れの順（厚生労働省の6つのポイント・農林水産省のまな板の使い方）
const SQ = { 家庭での6つのポイント: ["食品の購入","家庭での保存","下準備","調理","食事","残った食品"], まな板と包丁の使い方: ["加熱しない生野菜を切る","生の肉や魚を切る","使い終わったらすぐ洗う","洗ったあとに熱湯をかける"] };
// 6つのポイントの行い：言葉 → ポイント
const PS = [[/袋に分けて|最後に買う|保冷剤/,"食品の購入"],[/すぐ冷蔵庫|7割|容器に入れ/,"家庭での保存"],[/タオル|熱湯をかける|解凍|井戸水/,"下準備"],[/1分間以上になるまで|途中でやめる|かき混ぜる/,"調理"],[/盛りつける|室温に長く/,"食事"],[/小分け|温め直す|捨てる/,"残った食品"]];
const ptOf = (p) => { const m = PS.filter(([re]) => re.test(p)); return m.length === 1 ? m[0][1] : null; };
const quoted = (t) => (t.match(/「(.+?)」/) || [])[1] || "";
const MED = /治る|治せる|治ります|予防できる|予防になる|効果があ|若返る|診断でき|完全に防げ|絶対に防げ/;

// ---- 1. 問題（ブラウザを使わない）----
const FIRST_DAY = '[["gensoku|20","ondo|2-0","ayamari|31","tsugi|manaita-3p","kazu|3-0"],["narabe|21","kumi|3","chui|4-0"]]';
{
  const all = Object.values(G.BANK), bad = [];
  const REAL = /ドラえもん|ポケモン|ジブリ|鬼滅|サンリオ|セーラームーン|はたらく細胞|もやしもん/;
  const SRCOK = /^https:\/\/(www\.mhlw\.go\.jp\/stf\/seisakunitsuite\/bunya\/|www\.maff\.go\.jp\/j\/syouan\/seisaku\/foodpoisoning\/)/;
  check("表：gen.js の原因9つが、別に持った表と名前・読み・特徴・食べ物まで同じ（特徴は40字以内でほかの原因の名前を入れない）", G.TERMS.length === TT.length && G.TERMS.every((x, i) => JSON.stringify([x.n, x.y, x.w, x.f]) === JSON.stringify(TT[i])) && G.TERMS.every((x) => [...x.w].length <= 40 && G.TERMS.every((y) => y === x || !x.w.includes(y.n.split("（")[0]))));
  check("表：3原則の行いが、言葉から決めた原則（つけない・増やさない・やっつける）と合う", G.PEOPLE.length >= 15 && G.PEOPLE.every((x) => genOf(x.p) === G.GEN[x.c]) && new Set(G.PEOPLE.map((x) => x.p)).size === G.PEOPLE.length, G.PEOPLE.filter((x) => genOf(x.p) !== G.GEN[x.c]).map((x) => x.p).join(","));
  check("表：説明の正しい・まちがいが、別に持った表と合う（正しい14・まちがい14）", G.SAYS.length === Object.keys(TRUTH).length && G.SAYS.every((x) => TRUTH[x.t] === x.ok) && G.SAYS.filter((x) => x.ok).length === 14);
  check("表：数・気をつけ方の問題は35で、どれも別に持った表の答えと合う（まちがいの候補に答えが無い）", G.EASY.length + G.HARDF.length + G.BACHI.length === FT.length && [...G.EASY, ...G.HARDF, ...G.BACHI].every((f) => { const m = FT.filter(([k]) => f.t.startsWith(k)); return m.length >= 1 && m[m.length - 1][1] === f.a && !f.d.includes(f.a); }), [...G.EASY, ...G.HARDF, ...G.BACHI].filter((f) => { const m = FT.filter(([k]) => f.t.startsWith(k)); return !m.length || m[m.length - 1][1] !== f.a; }).map((f) => f.t).join(" / "));
  check("表：流れの順は2つで、別に持った表と同じ", G.SEQS.length === 2 && G.SEQS.every((q) => JSON.stringify(SQ[q.t]) === JSON.stringify(q.x)));
  check("表：6つのポイントの行いが、言葉から決めたポイントと合う", G.STEPS.every((x) => ptOf(x.p) === G.PT6[x.a]), G.STEPS.filter((x) => ptOf(x.p) !== G.PT6[x.a]).map((x) => x.p).join(","));
  for (const q of all) {
    const P = G.make(q.key), why = [];
    if (!P) { bad.push(q.key + " 作れない"); continue; }
    const k = q.kind, t = P.scene.text;
    if (P.opts.length !== 4 || new Set(P.opts).size !== 4 || P.opts.filter((o) => o === P.ans).length !== 1) why.push("選び肢");
    if (!P.src.length || P.src.some((x) => !x || !SRCOK.test(x[1]))) why.push("出典");
    if ([...P.why].length > 90) why.push("説明が90字より長い");
    const txt = JSON.stringify([P.scene, P.opts, P.why]);
    if (/undefined|null|NaN/.test(txt)) why.push("中身が空");
    if (REAL.test(txt)) why.push("作品の名前");
    if (MED.test(txt)) why.push("言い切りの言葉");
    if (JSON.stringify(G.make(q.key)) !== JSON.stringify(P)) why.push("同じ key で同じ問題にならない");
    if (k === "genin") { if (TF[quoted(t)] !== P.ans || !P.opts.every((o) => TN[o])) why.push("食べ物の答え"); }
    if (k === "tokucho") { if (TW[quoted(t)] !== P.ans || !P.opts.every((o) => TN[o])) why.push("特徴の答え"); }
    if (k === "gensoku") { const g = quoted(t); if (!P.opts.every((o) => genOf(o)) || P.opts.filter((o) => genOf(o) === g).length !== 1 || genOf(P.ans) !== g) why.push("3原則の答え"); }
    if (k === "seigo" || k === "ayamari") { const want = k === "seigo" ? 1 : 0; if (!P.opts.every((o) => o in TRUTH) || P.opts.filter((o) => TRUTH[o] === want).length !== 1 || TRUTH[P.ans] !== want) why.push("説明の答え"); }
    if (k === "ondo" || k === "kazu" || k === "chui") { const m = FT.filter(([a]) => t.startsWith(a)); if (!m.length || P.ans !== m[m.length - 1][1]) why.push("数の答え"); }
    if (k === "point") { if (P.ans !== ptOf(quoted(t)) || !P.opts.every((o) => SQ.家庭での6つのポイント.includes(o))) why.push("ポイントの答え"); }
    if (k === "tsugi") { const m = t.match(/^(.+)で、「(.+)」の(次|前)は？$/), x = m && SQ[m[1]], j = x ? x.indexOf(m[2]) : -1; if (j < 0 || P.ans !== x[j + (m[3] === "次" ? 1 : -1)]) why.push("次・前の答え"); }
    if (k === "narabe") { const x = SQ[(t.match(/^(.+)で、順に/) || [])[1]] || [], ok = P.opts.filter((o) => { const v = o.split(" → ").map((y) => x.indexOf(y)); return v.length === 3 && v.every((n) => n >= 0) && v[0] < v[1] && v[1] < v[2]; }); if (ok.length !== 1 || ok[0] !== P.ans) why.push(`並びの答え（${ok.join("/")}）`); }
    if (k === "kumi") { const ps = P.opts.map((o) => o.split("：")), good = ps.filter(([n, w]) => TN[n] && short(TN[n].w) === w); if (good.length !== 1 || P.ans !== good[0].join("：")) why.push("組み合わせの答え"); }
    if (["genin", "tokucho", "kumi"].includes(k)) { const a = k === "kumi" ? P.ans.split("：")[0] : P.ans; if (!P.at.some((i) => G.TERMS[i] && G.TERMS[i].n === a)) why.push("札に答えの原因が無い"); }
    if (P.at.some((i) => !G.TERMS[i])) why.push("札の番号");
    if (why.length) bad.push(q.key + "：" + why.join("・"));
  }
  check(`問題：全部の問題（${all.length}問）で、選び肢は4つで答えは1つ・厚生労働省か農林水産省の出典つき・説明90字以内・言い切りの言葉なし・答えを別に持った表で確かめて合う`, bad.length === 0, bad.slice(0, 5).join(" / "));
  check("問題：とことん・練習で出る問題は350問以上（好きなだけ遊んでも、すぐに同じ問題にならない）", all.length >= 350, all.length);
  const per = G.KINDS.map((k) => [k.id, G.keysOf(k.id).length]).filter(([, n]) => n < 11);
  check("問題：どの種類も11問以上ある", per.length === 0, per.join(" "));
  check("問題：種類は12（やさしい4・ふつう4・むずかしい4）", G.KINDS.length === 12 && [0, 1, 2].map((l) => G.kindsOf(l).length).join() === "4,4,4", [0, 1, 2].map((l) => G.kindsOf(l).length).join());
  check("知らない key（constructor など）は問題にしない", G.make("constructor") === null && G.make("__proto__") === null && G.make("toString") === null);
  const longLook = G.KINDS.filter((k) => [...k.look].length > 45).map((k) => k.id);
  check("ヒントは45字以内（やさしい日本語。一文を短く）", !longLook.length, longLook.join(","));
  const ap = {}; for (const q of all) { if (q.fix) continue; const o = G.make(q.key).opts.indexOf(q.ans); ap[o] = (ap[o] || 0) + 1; }
  const ta = Object.values(ap).reduce((a, b) => a + b, 0);
  check("答えの場所（1〜4番目）がどれも1割5分以上", [0, 1, 2, 3].every((i) => (ap[i] || 0) >= ta * 0.15), JSON.stringify(ap));
}
{
  // 今日の5問・上級の組み方（3年分）
  const bad = [], cover = new Set(); let sameAsPrev = 0, prev = "";
  const d0 = Date.parse("2026-11-08");
  const kd = (t) => G.BANK[t].kind;
  for (let i = 0; i < 365 * 3; i++) {
    const d = new Date(d0 + i * 864e5).toISOString().slice(0, 10), dl = G.dailyTags(d), hl = G.hardTags(d);
    const dk = dl.map(kd), hk = hl.map(kd);
    if (dl.length !== 5 || new Set(dk).size !== 5 || dk.map((k) => G.BY[k].lv).join() !== "0,0,1,1,2") bad.push(d + " 今日");
    if (hl.length !== 3 || new Set(hk).size !== 3 || hk.some((k) => G.BY[k].lv !== 2) || hk.includes(dk[4])) bad.push(d + " 上級");
    if (JSON.stringify(dl) !== JSON.stringify(G.dailyTags(d))) bad.push(d + " 同じにならない");
    if (dl.join() === prev) sameAsPrev++; prev = dl.join();
    if (i < 60) [...dk, ...hk].forEach((k) => cover.add(k));
  }
  check("今日の5問（やさしい2・ふつう2・むずかしい1、種類は重ねない）と上級（むずかしい3・今日のむずかしいと別）を3年分作れる", bad.length === 0, bad.slice(0, 5).join(","));
  check("2か月のうちに12種類が全部出る・前の日と同じ5問の日が無い", cover.size === 12 && sameAsPrev === 0, `${cover.size}種類・前の日と同じ ${sameAsPrev}日`);
  // 過去の日の問題を変えない：はじめの日の5問を控えと比べる（gen.js・BANK を変えたら、ここが落ちる）
  check("過去の日の問題が変わらない（第1回 2026-11-08 の5問と上級）", JSON.stringify([G.dailyTags("2026-11-08"), G.hardTags("2026-11-08")]) === FIRST_DAY, JSON.stringify([G.dailyTags("2026-11-08"), G.hardTags("2026-11-08")]));
}

// ---- 2. ファイルの中身 ----
const html = readFileSync(path.join(root, "index.html"), "utf8"), gen = readFileSync(path.join(root, "gen.js"), "utf8");
const ext = [...html.matchAll(/(?:src|href)="(https?:[^"]+)"/g)].map((m) => m[1]).filter((u) => !/^https:\/\/fonts\.googleapis\.com(\/|$)|^https:\/\/ko-fi\.com\/satouaaaaa$/.test(u));
check("外から読むのは文字（Google Fonts）だけ。スクリプト・広告・解析を入れない（出典のリンクは押したときに開くだけ）", ext.length === 0 && ![...html.matchAll(/<script[^>]+src="([^"]+)"/g)].some((m) => /^https?:/.test(m[1])), ext.join(","));
check("CSP で通信先を自分だけにしている", /connect-src 'self'/.test(html) && !/connect-src[^;"]*https/.test(html));
check("Math.random は練習・とことんの並びと回の名札だけ（今日の5問・上級は日付の乱数。gen.js には無い）", (html.match(/Math\.random/g) || []).length === 3 && !/Math\.random/.test(gen));
check("乱数は sort の比較の中で引かない（ブラウザで引く回数が変わる）", !/\.sort\(\s*\([^)]*\)\s*=>[^\n;]*\b(R|rng|rand|Math\.random)\s*\(/.test(html + gen));
check("一行の式の途中にコメント // を足さない（行の残りが消える。rosen-hitofude 2026-11-04）", !/;\s*\/\/[^\n]*;\s*\w/.test(gen.split("\n").filter((l) => !l.trim().startsWith("//")).join("\n")));
check("このゲームについて：出典（厚生労働省・農林水産省）を載せ、医療の助言には使えないこと・温度は「めやす」で食中毒がまったく起きないとは言えないこと・読めなかった資料のことは答えにしないことを書く", /医療の助言には使えません/.test(html) && /まったく起きないとは言えません/.test(html) && /問題の答えにしません/.test(html) && /G\.SRC/.test(html) && Object.values(G.SRC).length >= 8);
check("画面に医療の効果を言い切る言葉を入れない（治る・予防できる など）", !MED.test(html) && !MED.test(gen));
check("チケット・回数制限・🔒で開くモードを入れない（好きなだけ遊べる。shared-workflows game-dev.md F1・F2）", !/🎫|チケット|ライフ|スタミナ|すると開く|のあとで開く/.test(html));
check("画面にお笑いの言葉を入れない（本物っぽく）", !/お笑い|ギャグ|ツッコミ|なんでやねん|（うそ）/.test(html));
check("引き継ぎ：transfer.js をゲームの script より前に、このゲームの記録のキーだけで読む", /<script src="transfer\.js" data-game="shokuchudoku-yobo" data-keys="shokuchu-v1,shokuchu-fs"><\/script>\s*<\/head>/.test(html) && html.indexOf('src="transfer.js"') < html.indexOf('src="gen.js"') && /data-hk/.test(html) && existsSync(path.join(root, "transfer.js")));
{ const og = (k) => (html.match(new RegExp(`<meta (?:property|name)="${k}" content="([^"]+)"`)) || [])[1] || "";
  const png = readFileSync(path.join(root, "og.png"));
  check("SNS で貼ると絵と題が出る（OGP・1200×630・絶対URL）", og("og:title") && og("og:description") && og("og:image") === "https://satou-aaaaa.github.io/shokuchudoku-yobo/og.png" && og("twitter:card") === "summary_large_image" && png.readUInt32BE(16) === 1200 && png.readUInt32BE(20) === 630); }
{ const fy = readFileSync(path.join(root, ".github/ISSUE_TEMPLATE/feedback.yml"), "utf8");
  check("感想フォームの name が3字以上（2字だとフォームが出ない。shared-workflows incidents/2026-11-05-feedback-form-not-shown.md）", [...((fy.match(/^name:\s*(.+)$/m) || [])[1] || "").trim()].length >= 3);
  check("感想フォームは名前・メールを聞かない", /id: fun/.test(fy) && !/id: (name|email|mail)/.test(fy) && /labels: \["感想"\]/.test(fy)); }
check("README の URL のすぐ後ろに全角の字を続けない（Link check が URL の一部と読む）", !/https?:\/\/[\x21-\x7e]*[^\x00-\x7f]/.test(readFileSync(path.join(root, "README.md"), "utf8").replace(/\]\(https?:\/\/[^)\s]+\)/g, "").replace(/<https?:\/\/[^>\s]+>/g, "")));
{ const sw = readFileSync(path.join(root, "sw.js"), "utf8"), mf = JSON.parse(readFileSync(path.join(root, "manifest.webmanifest"), "utf8"));
  const shell = JSON.parse(sw.match(/SHELL = (\[[^\]]+\])/)[1]);
  { const st = await checkSwStall(sw); check("PWA：本文の途中で通信が止まっても、保存した画面を返す（ふつうはネットの返事）", st.ok, st); }
  check("PWA：sw.js は画面のファイルを全部保存し（引き継ぎの transfer.js も）、外へ何も送らない", ["./index.html", "./gen.js", "./transfer.js", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png"].every((f) => shell.includes(f)) && !/https?:\/\//.test(sw.replace(/^\/\/.*$/gm, "")));
  check("PWA：manifest にアイコン2つと名前がある", mf.name === "食中毒よぼう" && mf.icons.length >= 2 && mf.start_url === "./"); }

// ---- 3. ブラウザで遊ぶ ----
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".png": "image/png", ".webmanifest": "application/manifest+json" };
const server = createServer((req, res) => {
  const p = decodeURIComponent(new URL(req.url, "http://x").pathname), f = path.join(root, p === "/" ? "index.html" : p);
  const rel = path.relative(root, f);
  if (rel.startsWith("..") || path.isAbsolute(rel) || !existsSync(f)) { res.writeHead(404); return res.end(); } // リポジトリの外（同じ名前で始まる隣のフォルダも）は返さない
  res.writeHead(200, { "content-type": TYPES[path.extname(f)] || "application/octet-stream" }); res.end(readFileSync(f));
});
await new Promise((r) => server.listen(0, "127.0.0.1", r)); // 外からつながらないよう、この機械の中だけで開く
const url = `http://127.0.0.1:${server.address().port}/`;
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const errors = [];
const TODAY = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
const dayBefore = (n) => new Date(Date.parse(TODAY) - n * 864e5).toISOString().slice(0, 10);
async function newPage(w = 390, ctx) {
  const c = ctx || await browser.newContext({ viewport: { width: w, height: 800 } });
  await c.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  const p = await c.newPage();
  p.on("pageerror", (e) => errors.push(e.message));
  p.on("console", (m) => { if (m.type() === "error" && !/ERR_FAILED|net::/.test(m.text())) errors.push(m.text()); });
  await p.goto(url); await p.waitForTimeout(200);
  return p;
}
const closeHow = async (p) => { if (await p.locator("#howto[open]").count()) await p.click("#howto-ok"); };
const ansIdx = (p) => p.evaluate(() => { const c = __km.cur(); return c.P.opts.indexOf(c.P.ans); });
const wrongIdx = (p) => p.evaluate(() => { const c = __km.cur(); return c.P.opts.findIndex((o) => o !== c.P.ans && !c.wrong.includes(o)); });
const mem = (p) => p.evaluate(() => JSON.parse(localStorage.getItem("shokuchu-v1") || "{}"));
async function solve(p, { wrong = 0 } = {}) {
  for (let i = 0; i < wrong; i++) await p.click(`.ch[data-j="${await wrongIdx(p)}"]`);
  await p.click(`.ch[data-j="${await ansIdx(p)}"]`);
  await p.waitForSelector(".verdict");
}

try {
  // はじめて：遊び方が出る・文字の大きさ
  const p = await newPage();
  check("はじめて開くと遊び方が出る", await p.locator("#howto[open]").count() === 1);
  await p.click("#howto-ok");
  {
    const q = await newPage();
    await q.keyboard.press("Escape"); await q.waitForTimeout(100);
    const shut = await q.locator("#howto[open]").count() === 0;
    await q.reload(); await q.waitForTimeout(150);
    const again = await q.locator("#howto[open]").count();
    await q.click("#go-p"); await q.click("#back"); await q.waitForTimeout(100);
    check("遊び方を Esc で閉じたあと、開き直しても・ホームに戻っても遊び方が出ない", shut && again === 0 && await q.locator("#howto[open]").count() === 0);
    await q.close();
  }
  { const r = await newPage(); const big = []; // 題が h1{flex:1} を受け継いで縦に伸び、iPad の縦で大きなすき間が出た（shared-workflows incidents/2026-11-07-title-stretched.md）
    for (const [w, h] of [[820, 1180], [390, 844], [1280, 800]]) { await r.setViewportSize({ width: w, height: h }); await r.reload(); await r.waitForTimeout(200); await r.keyboard.press("Escape"); await r.waitForTimeout(100);
      const v = await r.evaluate(() => { const e = [...document.querySelectorAll(".title")].find((x) => x.offsetParent); if (!e) return null; const h = e.getBoundingClientRect().height; const f = e.style.flex; e.style.flex = "none"; const n = e.getBoundingClientRect().height; e.style.flex = f; return h - n; });
      if (v === null || v > 4) big.push(`${w}x${h}:${v === null ? "題なし" : "+" + Math.round(v) + "px"}`); }
    check("ホームの題は縦長の画面でも縦に伸びない（820×1180・390×844・1280×800）", big.length === 0, big.join(" ")); await r.close(); }
  check("文字の大きさ：はじめは「大きい」（21px）", await p.evaluate(() => getComputedStyle(document.documentElement).fontSize) === "21px");
  await p.click('.fsrow button[data-fs="3"]');
  await p.reload(); await p.waitForTimeout(150);
  check("文字の大きさ：「とても大きい」にすると開き直しても残る", await p.evaluate(() => getComputedStyle(document.documentElement).fontSize) === "25px" && await p.locator('.fsrow button[data-fs="3"][aria-pressed="true"]').count() === 1);
  await p.click('.fsrow button[data-fs="2"]');
  check("ホームに今日の心得が出る", (await p.textContent("#tip")).includes("今日の心得"));

  // 今日の5問：1問目はまちがえる、2問目はヒント2回、ほかはそのまま
  await p.click("#go-d");
  const tags = await p.evaluate(() => __km.load().runs.d.list);
  check("今日の5問は日付から決まる（gen.js の dailyTags と同じ）", JSON.stringify(tags) === JSON.stringify(G.dailyTags(TODAY)));
  check("問題の画面：答える前は言葉の札を出さない（答えが見えてしまう）・大きな選び肢（高さ56px以上）", await p.locator("#scene .card").count() === 0 && (await p.$$eval(".ch", (b) => b.map((x) => x.getBoundingClientRect().height))).every((h) => h >= 56) && await p.locator(".ch").count() >= 2);
  await p.click(`.ch[data-j="${await wrongIdx(p)}"]`);
  check("まちがえると ✕ の印と「ちがう」の文字（色だけで分けない）・知らせは role=status", await p.locator(".ch.ng").count() === 1 && (await p.evaluate(() => getComputedStyle(document.querySelector(".ch.ng"), "::after").content)).includes("ちがう") && (await p.textContent("#msg")).includes("ちがいます") && await p.getAttribute("#msg", "role") === "status");
  // 開き直しても、まちがえた選び肢は残る
  await p.reload(); await p.waitForTimeout(150); await p.click("#go-d");
  check("途中で閉じても続きから（同じ問題・まちがえた印のまま）", await p.locator(".ch.ng").count() === 1 && await p.evaluate(() => __km.cur().i) === 0);
  await solve(p);
  check("正解すると ✓ の印・なぜの説明・出典のリンク・★2（まちがい1回）", await p.locator(".ch.ok").count() === 1 && (await p.textContent(".verdict .why")).length > 6 && await p.locator(".verdict .src a").count() >= 1 && (await p.getAttribute(".verdict .stars", "aria-label")) === "星2つ");
  await p.click("#next");
  check("次の問題へ進むと、問題文にフォーカスが移る（キーボード・読み上げ）", await p.evaluate(() => document.activeElement?.id) === "q");
  await p.click("#hint");
  check("ヒント1は見るところを言う（答えは言わない）", (await p.textContent("#hintbox")).includes("💡") && await p.locator(".ch.ng").count() === 0);
  const nOpt = await p.locator(".ch").count();
  if (nOpt > 2) {
    await p.click("#hint"); check("ヒント2はまちがいの選び肢を消し、2つにしぼる・ヒントは2回まで", await p.locator(".ch:not(.ng)").count() === 2 && await p.locator("#hint:disabled").count() === 1);
    await p.click(`.ch:not(.ng)[data-j="${await p.evaluate(() => { const c = __km.cur(); return c.P.opts.findLastIndex((o) => o !== c.P.ans); })}"]`);
    check("ヒント2のあとで残ったまちがいを選んでも、消した選び肢は戻らない（正解だけが残る）", await p.locator(".ch:not(.ng)").count() === 1);
  }
  else check("選び肢が2つの問題は、ヒントは1回まで（しぼる段は無い）", await p.locator("#hint:disabled").count() === 1);
  const h2 = nOpt > 2 ? 3 : 1; // ヒント2回＋しぼったあとのまちがい1回
  await solve(p);
  check("ヒントの数だけ★がへる", (await p.getAttribute(".verdict .stars", "aria-label")) === `星${h2 >= 2 ? 1 : 2}つ`);
  await p.click("#next");
  for (let i = 2; i < 5; i++) { await solve(p); await p.click("#next"); }
  await p.waitForTimeout(150);
  const s1 = await mem(p);
  check("5問で結果：今日の記録に1問ごとのまちがい（1・ヒント・0・0・0）", JSON.stringify(s1.days[TODAY]?.m) === JSON.stringify([1, h2, 0, 0, 0]));
  const share = await p.textContent(".share");
  check("シェアの文に答え・問題を出さない（題・回・日付と印だけ）", /^食中毒よぼう 第\d+回 \d+\/\d+\n(🟢|🔶|🔺){5}( まちがいなし)?$/u.test(share.trim()), share);
  check("まちがいのある日は Ko-fi の一言を出さない", await p.locator(".kofi").count() === 0);
  check("結果に「あと少しの実績」と、続けて遊ぶ・上級のボタン", await p.locator("#achnext").count() === 1 && await p.locator("#go-e").count() === 1 && await p.locator("#go-h").count() === 1);
  check("よぼう帳に解いた種類が載る", Object.keys(s1.dex).length === 5);
  await p.click("#back");
  check("今日を終えたら、ホームは「今日の結果を見る」と上級", (await p.textContent("#go-d")).includes("結果") && await p.locator("#go-h").count() === 1);
  // 上級：ヒントなし・3問
  await p.click("#go-h");
  check("上級はヒントのボタンが無い・3問", await p.locator("#hint").count() === 0 && (await p.evaluate(() => __km.load().runs.h.list.length)) === 3);
  for (let i = 0; i < 3; i++) { await solve(p); await p.click("#next"); }
  await p.waitForTimeout(150);
  check("上級の記録は hdays に入る", (await mem(p)).hdays[TODAY]?.m.length === 3);
  // 練習：記録を増やさない
  await p.click("#back"); await p.click("#go-p"); await p.click('.lv button[data-t="2"]');
  const before = await mem(p);
  for (let i = 0; i < 5; i++) { await solve(p); await p.click("#next"); }
  await p.waitForTimeout(150);
  const after = await mem(p);
  check("練習は今日の記録を増やさない（よぼう帳の数はふえる）", JSON.stringify(after.days) === JSON.stringify(before.days) && Object.values(after.dex).reduce((a, b) => a + b) === Object.values(before.dex).reduce((a, b) => a + b) + 5);
  // よぼう帳からその種類だけで練習
  await p.click("#back"); await p.click("#go-dex");
  const firstKind = await p.getAttribute(".book button", "data-k");
  await p.click(".book button");
  check("よぼう帳の種類を押すと、その種類だけで練習", (await p.evaluate(() => __km.load().runs.p.list)).every((t) => t.startsWith(firstKind + "|")));
  // とことん：まちがえても続く・「ここで降りる」まで終わらない・自己ベストは一発で正解した数
  await p.click("#back"); await p.click("#go-e");
  check("とことんは種類を混ぜて60問以上を用意し、同じ問題は出さない", await p.evaluate(() => { const l = __km.load().runs.e.list; return l.length >= 60 && new Set(l).size === l.length; }));
  await solve(p); await p.click("#next"); await solve(p); await p.click("#next");
  await solve(p, { wrong: 1 }); await p.click("#next");
  await p.click(`.ch[data-j="${await wrongIdx(p)}"]`);
  check("とことんはまちがえても終わらない・ヒントも押せる", await p.locator(".verdict").count() === 0 && await p.locator("#hint:not([disabled])").count() === 1 && await p.locator(".ch:not([disabled])").count() >= 1);
  await solve(p); await p.click("#next");
  await p.click("#quit"); await p.waitForTimeout(150);
  check("「ここで降りる」で終わり、一発で正解した数（2問）が自己ベストに残る", (await mem(p)).ebest === 2 && (await p.textContent("#eres")).includes("2問") && !(await mem(p)).runs.e);
  await p.reload(); await p.waitForTimeout(250);
  check("降りたあと開き直しても、とことんの続きにならない", await p.locator(".ch").count() === 0);
  // とことんの並びを何百回作り、足していっても、全部出し切るまで同じ問題を出さない・同じ種類を続けない
  const er = await p.evaluate(() => { const K = __km, bad = []; let kinds = 0;
    for (let n = 0; n < 300; n++) { const r = { list: K.endlessList(), cyc: 0 }; const first = r.list.slice(0, 15).map((t) => K.G.BY[K.G.BANK[t].kind].lv); if (new Set(r.list).size !== r.list.length) bad.push("same" + n);
      if (first.slice(0, 5).some((l) => l !== 0) || first.slice(5, 15).some((l) => l !== 1)) bad.push("ramp" + n);
      if (n < 3) { while (r.list.length < K.ALLKEYS.length + 200) K.moreList(r); const a = r.list.slice(0, K.ALLKEYS.length); if (new Set(a).size !== a.length) bad.push("dup" + n); if (new Set(a).size !== K.ALLKEYS.length) bad.push("cover" + n); const b = r.list.slice(r.cyc); if (new Set(b).size !== b.length) bad.push("dup2-" + n); }
      for (let i = 1; i < Math.min(r.list.length, 60); i++) if (K.G.BANK[r.list[i]].kind === K.G.BANK[r.list[i - 1]].kind) kinds++;
    }
    return [bad.slice(0, 5), kinds]; });
  {
    // 前の回の最後の問題を除いて作り直しても、やさしい5→ふつう10から始まり、その問題を1問目にしない（2026-11-07 CodeRabbit）
    const rr = await p.evaluate(() => { const K = __km, bad = []; for (let n = 0; n < 100; n++) { const last = K.ALLKEYS[n * 7 % K.ALLKEYS.length], l = K.endlessList(new Set([last]), K.G.BANK[last].kind); const lv = l.slice(0, 15).map((t) => K.G.BY[K.G.BANK[t].kind].lv); if (lv.slice(0, 5).some((x) => x !== 0) || lv.slice(5).some((x) => x !== 1) || l.includes(last) || K.G.BANK[l[0]].kind === K.G.BANK[last].kind) bad.push(n); } return bad; });
    check("とことんを2回目に始めても、やさしい→ふつうから・前の最後の問題と種類を1問目にしない", rr.length === 0, JSON.stringify(rr.slice(0, 5)));
  }
  check("とことんの並びを300回作る：やさしい5→ふつう10から始まり、全部出し切るまで同じ問題なし・同じ種類が続く所はほぼ無い", er[0].length === 0 && er[1] < 300 * 3, JSON.stringify(er));
  {
    // 引き継ぎコードなどで数の所に文字が入っても、画面に HTML として出さない（2026-11-05 CodeRabbit）
    const q = await newPage(); await closeHow(q);
    await q.evaluate(() => { const s = JSON.parse(localStorage.getItem("shokuchu-v1")) || { v: 1 }; s.ebest = '<img id="xss" src=x>'; s.dex = { genin: '"><b id="xss2">', add: 3, constructor: 4, toString: 2 }; s.elast = '"><u id="xss4">'; s.runs = { z: { mode: "z", id: "z", date: "2026-11-05", list: [], res: [] }, e: { mode: "e", id: "x", date: "2026-11-05", list: ["genin|0-0", "genin|0-1"], res: [], life: '"><i id="xss3">' }, h: { list: "bad", res: [] }, p: { mode: "p", id: "y", date: "2026-11-05", list: ["constructor|1"], res: [] }, d: { mode: "d", id: "z", date: "x", list: ["genin|1-0"], res: [] }, h2: { date: "2026-11-08", list: [], res: [] }, a1: { mode: "a", id: "a1", date: "2026-11-04", list: ["genin|1-0"], res: [null] }, a2: { mode: "a", id: "a2", date: "2026-11-03", list: "bad", res: [] }, "a:2026-11-02": { mode: "a", id: "a3", date: "2026-11-02", list: ["genin|1-0", "genin|2-0"], res: [{ m: 0 }], cur: { i: 1, tag: "genin|2-0", wrong: "x", hints: 0 } } }; s.days = { "2026-11-05": { m: "x" }, bad: { m: [0] }, "2026-02-30": { m: [0] }, "2026-11-06": { m: [] } }; localStorage.setItem("shokuchu-v1", JSON.stringify(s)); });
    await q.reload(); await q.waitForTimeout(250);
    const st = await q.evaluate(() => __km.load());
    check("記録の形を直す：数の所の文字は0に・よぼう帳の知らない種類（constructor など）は捨てる・前の版の花（life）は読まない・形のちがう途中経過（置き場とモードが合わない回も）と日ごとの記録（問題の数が合わないものも）は捨てる", st.ebest === 0 && st.dex.genin === 0 && Object.keys(st.dex).join() === "genin" && !("life" in st.runs.e) && st.elast === null && !("h" in st.runs) && !("p" in st.runs) && !("d" in st.runs) && !("a1" in st.runs) && !("a2" in st.runs) && !("h2" in st.runs) && !("z" in st.runs) && st.runs["a:2026-11-02"] && st.runs["a:2026-11-02"].cur === null && Object.keys(st.days).length === 0);
    await q.click("#go-e").catch(() => {}); await q.waitForTimeout(150);
    check("記録の文字を HTML として出さない", await q.locator("#xss, #xss2, #xss3, #xss4").count() === 0);
    await q.context().close();
  }
  // 実績・このゲームについて
  await p.click("#go-ach");
  check("実績は13個で、腕前・集める・続けるの3つの組", await p.locator(".ach").count() === 13 && await p.locator(".agrp").count() === 3 && await p.locator(".ach.got").count() >= 3);
  check("達成した実績は ✓ の文字も付く（色だけで分けない）", (await p.textContent(".ach.got b")).startsWith("✓"));
  await p.click("#back"); await p.click("#f-about");
  check("このゲームについて：出典のリンクと、法律相談には使えないこと", (await p.textContent("#about")).includes("医療の助言には使えません") && await p.locator("#about a").count() >= 8);
  await p.context().close();

  // まちがいなしの日は Ko-fi を1回だけ
  {
    const q = await newPage(); await closeHow(q); await q.click("#go-d");
    for (let i = 0; i < 5; i++) { await solve(q); await q.click("#next"); }
    await q.waitForTimeout(150);
    check("全部まちがいなしで初めて終えたときだけ Ko-fi の一言", await q.locator(".kofi").count() === 1 && (await q.textContent(".big")).includes("まちがいなし"));
    await q.click("#back"); await q.click("#go-d");
    check("結果をもう一度見ても Ko-fi は出さない", await q.locator(".kofi").count() === 0);
    await q.context().close();
  }

  // カレンダー・あとから：過去の日の記録を置いて見る
  {
    // 第1回（2026-11-08）から日がたった日に時計を合わせる（第1回の日でも、取りこぼした日を確かめられる）
    const cctx = await browser.newContext({ viewport: { width: 390, height: 800 } }); await cctx.clock.setFixedTime(new Date("2026-11-17T03:00:00Z"));
    const T2 = "2026-11-17", dayBefore = (n) => new Date(Date.parse(T2) - n * 864e5).toISOString().slice(0, 10);
    const q = await newPage(390, cctx);
    await q.evaluate(([d2, d3]) => { localStorage.setItem("shokuchu-v1", JSON.stringify({ v: 1, tut: true, days: { [d2]: { m: [0, 0, 0, 0, 0], k: [] }, [d3]: { m: [1, 0, 0, 2, 0], k: [] } }, hdays: {}, adays: {}, dex: {}, runs: {}, kofi: {}, ach: {}, ebest: 0 })); }, [dayBefore(2), dayBefore(3)]);
    await q.reload(); await q.waitForTimeout(150);
    check("ホームの「続けて」は、きのうを休んだら — （休んだ日を責めない）", (await q.textContent(".stats")).includes("—"));
    await q.click("#go-cal");
    const lateList = await q.evaluate(() => __km.lateDays(__km.load()));
    const exp = [1, 4, 5, 6, 7].map(dayBefore).filter((d) => d >= "2026-11-08");
    check("カレンダー：取りこぼした過去7日（第1回より後）を押せる", JSON.stringify(lateList) === JSON.stringify(exp), lateList.join(","));
    check("カレンダー：遊んだ日は★の数の文字も付く", (await q.locator(".cal .c.p3").count()) + (await q.locator(".cal .c.p2").count()) + (await q.locator(".cal .c.p1").count()) >= (dayBefore(3).slice(0, 7) === T2.slice(0, 7) ? 2 : 0));
    if (lateList.length) {
      const d = lateList[0];
      await q.evaluate((d) => { const b = document.querySelector(`.cal .miss[data-k="${d}"]`); if (b) b.click(); else { const m = document.querySelector(".calnav #prev"); m && m.click(); } }, d);
      if (!(await q.locator(".ch").count())) await q.click(`.cal .miss[data-k="${d}"]`);
      check("あとから：その日の今日の5問と同じ問題", JSON.stringify(await q.evaluate((d) => __km.load().runs["a:" + d].list, d)) === JSON.stringify(G.dailyTags(d)));
      for (let i = 0; i < 5; i++) { await solve(q); await q.click("#next"); }
      await q.waitForTimeout(150);
      const s = await mem(q);
      check("あとからは adays に入り、今日の記録・続けた日には数えない", s.adays[d] && !s.days[d] && (await q.locator(".share").count()) === 0 && (await q.locator(".kofi").count()) === 0);
    } else check("あとから：遊べる日がある", false, "第1回の日から日がたっていない");
    await q.context().close();
  }

  // 古いタブ：同じ問題を2つのタブで開き、片方で答えたら、もう片方は二重に入れない
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 800 } });
    const a = await newPage(390, ctx); await closeHow(a); await a.click("#go-d");
    const b = await ctx.newPage(); b.on("pageerror", (e) => errors.push(e.message)); await b.goto(url); await b.waitForTimeout(150); await b.click("#go-d");
    await solve(a);
    await b.click(`.ch[data-j="${await ansIdx(b)}"]`);
    await b.waitForTimeout(200);
    const s = await mem(a);
    check("古いタブで同じ問題に答えても二重に数えない", s.runs.d.res.length === 1 && Object.values(s.dex).reduce((x, y) => x + y) === 1);
    // ヒントの数は、別のタブで使った分も減らさない
    await a.click("#next"); await b.goto(url); await b.waitForTimeout(150); await b.click("#go-d");
    const c2 = await ctx.newPage(); c2.on("pageerror", (e) => errors.push(e.message)); await c2.goto(url); await c2.waitForTimeout(150); await c2.click("#go-d"); await c2.waitForTimeout(100); // ヒントを使う前に開いた古いタブ
    let used = 0; for (let i = 0; i < 2; i++) if (await a.locator("#hint").isEnabled()) { await a.click("#hint"); used++; } // 2択の問題はヒント1回まで
    if (await b.locator("#hint").isEnabled()) await b.click("#hint");
    check("別のタブで使ったヒントの数を減らさない", used >= 1 && (await mem(a)).runs.d.cur.hints === used);
    // ヒントを使っていない古いタブで正解しても、別のタブのヒントを★に数える（2026-11-07 CodeRabbit）
    await c2.click(`.ch[data-j="${await ansIdx(c2)}"]`); await c2.waitForTimeout(150);
    check("古いタブの正解でも、別のタブで使ったヒントを★に数える", (await mem(a)).runs.d.res[1].m >= used, JSON.stringify((await mem(a)).runs.d.res));
    await c2.close();
    await ctx.close();
  }

  // スマホ幅・とても大きい文字でもはみ出さない・押す所は44px以上
  {
    const bad = [], small = [];
    for (const [w, fs] of [[320, 3], [390, 2], [320, 1]]) {
      const q = await newPage(w); await closeHow(q);
      await q.evaluate((fs) => localStorage.setItem("shokuchu-fs", String(fs)), fs); await q.reload(); await q.waitForTimeout(150);
      for (const go of [null, "#go-d", "solve", "#go-cal", "#go-dex", "#go-ach", "#go-e"]) {
        if (go === "solve") { await solve(q); }
        else if (go) { await q.goto(url); await q.waitForTimeout(100); await q.click(go); }
        await q.waitForTimeout(100);
        const ov = await q.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        if (ov > 0) bad.push(`${w}px 文字${fs} ${go || "ホーム"} ${ov}px`);
        small.push(...(await q.$$eval("button:not([disabled]), a[href]", (bs) => bs.filter((b) => b.checkVisibility() && !b.closest(".cal")).filter((b) => b.getBoundingClientRect().height < 44).map((b) => (b.id || b.className || b.textContent).slice(0, 20)))).map((x) => `${w}/${fs}/${go}:${x}`));
      }
      await q.context().close();
    }
    // とことん：正解したすぐあとでも「ここで降りる」で終われる（2026-11-07 CodeRabbit。前は次の問題へ進むまで押しても何も起きなかった）
    {
      const q = await newPage(); await closeHow(q); await q.click("#go-e"); await q.waitForTimeout(150);
      const ans = await q.evaluate(() => __km.cur().P.ans);
      await q.locator(".ch").nth(await ansIdx(q)).click(); await q.waitForTimeout(100);
      const lab = (await q.textContent("#quit")) || "";
      await q.click("#quit"); await q.waitForTimeout(150);
      check("とことん：正解したあとでも「ここで降りる」で結果へ進み、ボタンの数も答えた数になる", /1問で終える/.test(lab) && await q.locator("#eres").count() === 1, lab);
      await q.context().close();
    }
    // 正解すると、原因の札（読み・起きやすい食べ物・特徴）が出る。幅320pxでも札ははみ出さない
    {
      const q = await newPage(320); await closeHow(q); await q.click("#go-e"); await q.waitForTimeout(150);
      await q.evaluate(() => { __km.save((x) => { x.runs.e.list[x.runs.e.res.length] = "kumi|0"; }); __km.play(); });
      await q.waitForTimeout(150);
      const ans = await q.evaluate(() => __km.cur().P.ans);
      await q.locator(".ch").nth(await ansIdx(q)).click(); await q.waitForTimeout(100);
      const cd = await q.evaluate(() => { const cs = [...document.querySelectorAll("#scene .card")]; return { n: cs.length, txt: cs.map((c) => c.textContent), w: Math.max(0, ...cs.map((c) => c.getBoundingClientRect().right)), sw: document.documentElement.scrollWidth }; });
      check("正解すると、選び肢の原因の札が出る（組み合わせの問題は4枚。読み・起きやすい食べ物・特徴。幅320pxではみ出さない）", cd.n === 4 && cd.txt.some((t) => t.includes(ans.split("：")[0] + "（")) && cd.txt.some((t) => /起きやすい：/.test(t)) && cd.w <= 320 && cd.sw <= 320, JSON.stringify(cd).slice(0, 300));
      await q.context().close();
    }
    check("幅320px・とても大きい文字でも横にはみ出さない", bad.length === 0, bad.join(" / "));
    check("押せる所は高さ44px以上", small.length === 0, [...new Set(small)].slice(0, 8).join(","));
  }

  // 見やすさの設定を全部入れても、ページの一番下まで動ける（読み上げの class が html に当たって固まった。2026-11-05）
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 700 } });
    await ctx.addInitScript(() => localStorage.setItem("a11y-v1", JSON.stringify({ read: true, cvd: true, calm: true, say: true, ruby: true })));
    const q = await newPage(390, ctx); await closeHow(q);
    const r = await q.evaluate(() => { window.scrollTo(0, 1e5); const f = document.querySelector("footer").getBoundingClientRect(); return [scrollY, Math.round(f.bottom), innerHeight, getComputedStyle(document.documentElement).position]; });
    check("見やすさの設定を全部入れても、いちばん下まで動ける（html が固定されない）", r[0] > 0 && r[1] <= r[2] && r[3] === "static", r.join(","));
    await ctx.close();
  }
  // キーボードだけで遊べる（Tab と Enter）
  {
    const q = await newPage(); await closeHow(q);
    await q.focus("#go-d"); await q.keyboard.press("Enter"); await q.waitForTimeout(100);
    const j = await ansIdx(q);
    await q.focus(`.ch[data-j="${j}"]`); await q.keyboard.press("Enter"); await q.waitForTimeout(100);
    check("キーボードだけで選んで答えられる", await q.locator(".verdict").count() === 1);
    await q.context().close();
  }
} catch (e) { check("ブラウザでの検査が最後まで動く", false, e.stack.split("\n").slice(0, 3).join(" ")); }

// 引き継ぎコード（shared-workflows template/qa/transfer-check.mjs）
try {
  const sample = { "shokuchu-v1": JSON.stringify({ v: 1, tut: true, days: { "2026-11-08": { m: [0, 1, 0, 0, 2], k: ["genin", "gensoku", "tokucho", "point", "narabe"] } }, hdays: {}, adays: {}, dex: { genin: 1, gensoku: 1, tokucho: 1, point: 1, narabe: 1 }, runs: {}, kofi: {}, ach: {}, ebest: 7, elast: null, t: 1 }), "shokuchu-fs": "3" };
  await checkTransfer({ browser, url, game: "shokuchudoku-yobo", sample, check, open: async (pg) => { if (await pg.locator("#howto[open]").count()) await pg.click("#howto-ok"); } });
} catch (e) { check("引き継ぎの検査が最後まで動く", false, e.message.split("\n")[0]); }
await browser.close();
server.close();
check("画面のエラーが無い", errors.length === 0, errors.slice(0, 3).join(" | "));

{ // 見やすさ・読みやすさ・偏り（shared-workflows template/qa/a11y.mjs の写し）
  const { spawnSync } = await import("node:child_process");
  const a = spawnSync(process.execPath, [path.join(root, "qa", "a11y.mjs")], { encoding: "utf8", env: process.env });
  check("見やすさ・読みやすさの検査（qa/a11y.mjs。中身は qa-report/a11y.md）", a.status === 0, (a.stdout.match(/^- ❌.*$/gm) || []).join(" / ") || (a.status ? a.stderr.slice(-300) : ""));
}

const ng = results.filter((r) => !r.ok);
const md = `# 食中毒よぼう QA\n\n${results.map((r) => `- ${r.ok ? "✅" : "❌"} ${r.name}${r.detail ? `（${r.detail}）` : ""}`).join("\n")}\n\n${ng.length ? `❌ ${ng.length}件` : `✅ ${results.length}項目すべて通過`}\n`;
mkdirSync(path.join(root, "qa-report"), { recursive: true });
writeFileSync(path.join(root, "qa-report/report.md"), md);
console.log(md);
process.exit(ng.length ? 1 : 0);
