const puppeteer = require("puppeteer-core");
const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const PORT = 4173;
const MIME = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".svg": "image/svg+xml" };

const server = http.createServer((req, res) => {
  let file = path.join(ROOT, req.url === "/" ? "index.html" : decodeURIComponent(req.url.split("?")[0]));
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); res.end("nope"); return; }
    res.writeHead(200, { "Content-Type": MIME[path.extname(file)] || "application/octet-stream" });
    res.end(data);
  });
});

const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 900, deviceScaleFactor: 1 },
  { name: "tablet", width: 768, height: 1024, deviceScaleFactor: 1 },
  { name: "mobile", width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
];

(async () => {
  await new Promise((r) => server.listen(PORT, r));
  const browser = await puppeteer.launch({
    executablePath: "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
    headless: "new",
    args: ["--no-first-run", "--disable-extensions", "--mute-audio", "--use-gl=angle"],
  });

  let failures = 0;
  for (const vp of VIEWPORTS) {
    const page = await browser.newPage();
    const errors = [];
    page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
    page.on("pageerror", (e) => errors.push("PAGEERROR: " + e.message));
    page.on("requestfailed", (r) => errors.push("REQFAIL: " + r.url() + " " + (r.failure() || {}).errorText));

    await page.setViewport(vp);
    await page.goto(`http://localhost:${PORT}/`, { waitUntil: "networkidle0", timeout: 30000 });
    await new Promise((r) => setTimeout(r, 3500)); // let preloader finish + hero intro

    const metrics = await page.evaluate(() => {
      const doc = document.documentElement;
      const overflowX = doc.scrollWidth - doc.clientWidth;
      const h1 = document.querySelector("h1");
      const heroVisible = h1 && getComputedStyle(h1).opacity !== "0";
      const canvas = document.getElementById("heroCanvas");
      let webgl = false;
      try { webgl = !!(canvas && (canvas.getContext("webgl2") || canvas.getContext("webgl"))); } catch (e) {}
      const preloaderGone = getComputedStyle(document.getElementById("preloader")).display === "none";
      return {
        overflowX,
        heroVisible,
        webglContext: webgl,
        preloaderGone,
        title: document.title,
        bodyHeight: document.body.scrollHeight,
      };
    });

    // scroll through the page to exercise ScrollTrigger, then to bottom
    await page.evaluate(async () => {
      const h = document.body.scrollHeight;
      for (let y = 0; y <= h; y += 600) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)); }
      window.scrollTo(0, 0);
    });
    await new Promise((r) => setTimeout(r, 800));
    await page.screenshot({ path: path.join(__dirname, `shot-${vp.name}-hero.png`) });
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight * 0.55));
    await new Promise((r) => setTimeout(r, 1200));
    await page.screenshot({ path: path.join(__dirname, `shot-${vp.name}-mid.png`) });

    const realErrors = errors.filter((e) => !/favicon/i.test(e));
    console.log(`\n=== ${vp.name} (${vp.width}x${vp.height}) ===`);
    console.log("metrics:", JSON.stringify(metrics));
    console.log("console errors:", realErrors.length ? realErrors : "none");
    if (metrics.overflowX > 1) { console.log(`FAIL: horizontal overflow of ${metrics.overflowX}px`); failures++; }
    if (!metrics.preloaderGone) { console.log("FAIL: preloader still visible"); failures++; }
    if (realErrors.length) failures++;
    await page.close();
  }

  await browser.close();
  server.close();
  console.log(failures ? `\n${failures} CHECK(S) FAILED` : "\nALL CHECKS PASSED");
  process.exit(failures ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
