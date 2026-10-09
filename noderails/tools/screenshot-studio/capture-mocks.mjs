import { createServer } from "node:http";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const OUT = path.join(ROOT, "apps/landing/public/screenshots");

const SCENES = [
  "dashboard-overview",
  "payments-list",
  "payment-details",
  "customers",
  "payment-links",
  "subscriptions",
  "subscription-details",
  "product-plans",
  "app-settings",
  "tax-rates",
  "checkout",
  "payment-transactions",
  "payment-receipt",
  "invoice-email",
];

const SCENE_QUERY = {
  "dashboard-overview": "overview",
  "payments-list": "payments",
};

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".woff2": "font/woff2",
  ".css": "text/css",
  ".js": "text/javascript",
  ".png": "image/png",
  ".svg": "image/svg+xml",
};

function sceneName(file) {
  return SCENE_QUERY[file] ?? file;
}

async function serve() {
  const server = createServer(async (req, res) => {
    const url = new URL(req.url ?? "/", "http://127.0.0.1");
    let rel = decodeURIComponent(url.pathname);
    if (rel === "/") rel = "/tools/screenshot-studio/mocks/index.html";
    const filePath = path.join(ROOT, rel.replace(/^\/+/, ""));
    if (!filePath.startsWith(ROOT)) {
      res.writeHead(403).end();
      return;
    }
    try {
      const body = await readFile(filePath);
      res.writeHead(200, { "content-type": MIME[path.extname(filePath)] ?? "application/octet-stream" });
      res.end(body);
    } catch {
      res.writeHead(404).end("not found");
    }
  });
  await new Promise((resolve) => server.listen(4177, "127.0.0.1", resolve));
  return server;
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const server = await serve();
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });

  for (const file of SCENES) {
    const query = sceneName(file);
    const target = `http://127.0.0.1:4177/tools/screenshot-studio/mocks/index.html?scene=${query}`;
    await page.goto(target, { waitUntil: "networkidle" });
    await page.waitForTimeout(250);
    const dest = path.join(OUT, `${file}.png`);
    await page.screenshot({ path: dest, type: "png" });
    console.log(`wrote ${dest}`);
  }

  await browser.close();
  server.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
