// アプリのアイコン（icon-192.png・icon-512.png）を作る。深い緑の地に、生成りの水のしずく（手洗い）と、朱の温度計。
// 使い方: node tools/make-icons.cjs（qa/ の playwright を使う）。maskable でも欠けないよう、絵は真ん中の円（直径80%）に収める
const path = require("path");
const { chromium } = require(path.join(__dirname, "..", "qa", "node_modules", "playwright"));
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  for (const s of [192, 512]) {
    const p = await b.newPage({ viewport: { width: s, height: s } });
    await p.setContent(`<body style="margin:0"><svg width="${s}" height="${s}" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <rect width="100" height="100" fill="#2f5d3a"/>
      <path d="M40 24 C40 24 22 46 22 58 a18 18 0 0 0 36 0 C58 46 40 24 40 24 z" fill="#f6f1e7"/>
      <rect x="64" y="22" width="12" height="44" rx="6" fill="#f6f1e7"/><circle cx="70" cy="70" r="10" fill="#b8402a"/><rect x="67" y="38" width="6" height="32" fill="#b8402a"/></svg></body>`);
    await p.screenshot({ path: path.join(__dirname, "..", `icon-${s}.png`), clip: { x: 0, y: 0, width: s, height: s } });
  }
  await b.close();
})();
