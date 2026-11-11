// SNS で貼られたときの絵（og.png 1200×630）を作る。今日の問題（答え）は入れず、しずく・温度計・冷蔵庫の絵だけ。
// 使い方: node tools/make-og.cjs（qa/ の playwright を使う）
const path = require("path");
const { chromium } = require(path.join(__dirname, "..", "qa", "node_modules", "playwright"));
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const p = await b.newPage({ viewport: { width: 1200, height: 630 } });
  const art = `
    <path d="M60 20 C60 20 25 70 25 92 a35 35 0 0 0 70 0 C95 70 60 20 60 20 z" fill="#2f5d3a"/>
    <rect x="140" y="20" width="22" height="90" rx="11" fill="#2a2420" opacity=".15"/><rect x="146" y="50" width="10" height="60" fill="#b8402a"/><circle cx="151" cy="118" r="18" fill="#b8402a"/>
    <rect x="220" y="14" width="90" height="130" rx="10" fill="#fffdf8" stroke="#2f5d3a" stroke-width="6"/><path d="M220 60 h90" stroke="#2f5d3a" stroke-width="6"/><rect x="292" y="28" width="8" height="20" rx="4" fill="#2f5d3a"/><rect x="292" y="74" width="8" height="26" rx="4" fill="#2f5d3a"/>
    <text x="330" y="100" font-size="44" font-weight="900" fill="#b8402a">75℃</text>`;
  await p.setContent(`<body style="margin:0;font-family:'Noto Sans CJK JP','IPAPGothic',sans-serif">
  <div style="width:1200px;height:630px;box-sizing:border-box;padding:56px 64px;background:#f6f1e7;color:#2a2420;display:flex;flex-direction:column;gap:36px;justify-content:center">
    <div>
      <div style="font-size:32px;color:#86291a;letter-spacing:.06em">冷蔵庫は何℃？肉の加熱は何℃で何分？</div>
      <div style="font-size:112px;font-weight:900;margin-top:4px;color:#2f5d3a;white-space:nowrap">食中毒<span style="color:#b8402a">よぼう</span></div>
      <div style="font-size:30px;margin-top:8px;white-space:nowrap">家庭でできる予防のきまりを当てる1日5問</div>
    </div>
    <svg width="470" height="150" viewBox="0 0 470 150" style="align-self:flex-end;transform:scale(1.3);transform-origin:right bottom">${art}</svg>
  </div></body>`);
  await p.screenshot({ path: path.join(__dirname, "..", "og.png") });
  await b.close();
})();
