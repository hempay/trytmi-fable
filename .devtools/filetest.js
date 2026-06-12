const puppeteer = require("puppeteer-core");
(async () => {
  const browser = await puppeteer.launch({
    executablePath: "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
    headless: "new", args: ["--no-first-run", "--mute-audio", "--use-gl=angle"],
  });
  const page = await browser.newPage();
  const errors = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  page.on("pageerror", (e) => errors.push("PAGEERROR: " + e.message));
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto("file:///Users/samsonite/Documents/Sam/trytmi/index.html", { waitUntil: "networkidle0" });
  await new Promise((r) => setTimeout(r, 4500));
  const state = await page.evaluate(() => {
    const c = document.getElementById("heroCanvas");
    // a live WebGL canvas has a context and non-zero drawing buffer
    const gl = c.getContext("webgl") || c.getContext("webgl2");
    return { hasGL: !!gl, bufW: gl ? gl.drawingBufferWidth : 0, three: typeof THREE !== "undefined" };
  });
  await page.screenshot({ path: "shot-file-protocol.png" });
  console.log("state:", JSON.stringify(state));
  console.log("errors:", errors.length ? errors : "none");
  await browser.close();
})();
