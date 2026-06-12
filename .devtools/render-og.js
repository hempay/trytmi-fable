const puppeteer = require("puppeteer-core");
const path = require("path");
const fs = require("fs");

(async () => {
  const browser = await puppeteer.launch({
    executablePath: "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
    headless: "new",
    args: ["--no-first-run", "--force-color-profile=srgb"],
  });
  const page = await browser.newPage();
  // native 1200x630 so declared OG dimensions == actual pixels
  await page.setViewport({ width: 1200, height: 630, deviceScaleFactor: 1 });
  await page.goto("file://" + path.join(__dirname, "og-template.html"), { waitUntil: "networkidle0" });
  await new Promise((r) => setTimeout(r, 600)); // let webfonts settle

  const outDir = path.resolve(__dirname, "..", "assets");
  fs.mkdirSync(outDir, { recursive: true });
  const out = path.join(outDir, "og-image.png");
  await page.screenshot({ path: out, clip: { x: 0, y: 0, width: 1200, height: 630 } });

  const bytes = fs.statSync(out).size;
  console.log("wrote", out, "(" + Math.round(bytes / 1024) + " KB)");
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
