import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const OUT = path.join(ROOT, "apps/landing/public/screenshots");
const APP = "2f07b892-3527-4ab4-91b5-52b30303c6b8";
const DASH = "http://127.0.0.1:3001";

function loadEnvFile(filePath) {
  let text = "";
  try { text = readFileSync(filePath, "utf8"); } catch { return; }
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq < 1) continue;
    const key = line.slice(0, eq);
    if (process.env[key]) continue;
    let value = line.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

loadEnvFile(path.join(ROOT, "envs/backend.env"));
loadEnvFile(path.join(ROOT, ".env"));

const jwt = createRequire(path.join(ROOT, "services/noderails-server/package.json"))("jsonwebtoken");
const merchant = JSON.parse(execFileSync("npx", ["tsx", "prisma/shot-merchant.ts"], {
  cwd: path.join(ROOT, "packages/database"),
  encoding: "utf8",
}));
if (!process.env.JWT_REFRESH_SECRET) throw new Error("JWT_REFRESH_SECRET missing");
const refreshToken = jwt.sign(
  { sub: merchant.id, email: merchant.email, role: merchant.role, type: "refresh" },
  process.env.JWT_REFRESH_SECRET,
  { expiresIn: "7d" },
);

async function dress(page) {
  await page.addStyleTag({
    content: `nextjs-portal, [data-nextjs-toast], [data-next-badge-root] { display: none !important; }`,
  }).catch(() => {});
  await page.evaluate(() => {
    const swap = (value) =>
      value
        .replaceAll("http://127.0.0.1:3002", "https://pay.noderails.com")
        .replaceAll("http://localhost:3002", "https://pay.noderails.com")
        .replaceAll("127.0.0.1:3002", "pay.noderails.com")
        .replaceAll("localhost:3002", "pay.noderails.com")
        .replaceAll("http://127.0.0.1:3001", "https://merchant.noderails.com")
        .replaceAll("http://localhost:3001", "https://merchant.noderails.com");
    const walk = (node) => {
      if (node.nodeType === Node.TEXT_NODE && node.textContent) node.textContent = swap(node.textContent);
      node.childNodes.forEach(walk);
    };
    walk(document.body);
    for (const el of document.querySelectorAll("p")) {
      const text = el.textContent?.trim() ?? "";
      if (text.startsWith("Test app - testnet only") || text.startsWith("Receiving wallet missing")) {
        const box = el.closest("div.flex,div.rounded-lg,div[class*='border']") ?? el.parentElement;
        if (box && (box.textContent?.length ?? 0) < 280) box.style.display = "none";
      }
    }
  });
  await page.waitForTimeout(250);
}

async function open(page, urlPath, ready) {
  await page.goto(`${DASH}${urlPath}`, { waitUntil: "load", timeout: 60000 });
  await page.waitForFunction(
    (needle) => (document.body?.innerText ?? "").includes(needle) && !(document.body?.innerText ?? "").includes("Sign in to your dashboard"),
    ready,
    { timeout: 40000 },
  );
  await page.waitForTimeout(600);
}

async function shot(page, file) {
  await dress(page);
  await page.screenshot({ path: path.join(OUT, file), type: "png" });
  console.log(`wrote ${file}`);
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
await context.addCookies([{
  name: "nr_refresh",
  value: refreshToken,
  domain: "127.0.0.1",
  path: "/",
  httpOnly: true,
  secure: false,
  sameSite: "Strict",
}]);
const page = await context.newPage();

await open(page, `/dashboard/apps/${APP}/payments`, "Payment intents");
await page.waitForFunction(
  () => /Acme Robotics|28,500|28500/.test(document.body?.innerText ?? ""),
  { timeout: 30000 },
);
await page.locator("table tbody tr").first().locator("td").nth(1).click();
await page.getByText("Fee breakdown", { exact: false }).waitFor({ timeout: 15000 });
await page.waitForTimeout(400);
await shot(page, "payment-details.png");
await shot(page, "payment-transactions.png");

await open(page, `/dashboard/apps/${APP}/customers`, "Acme Robotics");
await page.getByText("Acme Robotics", { exact: true }).first().click();
await page.waitForTimeout(800);
await shot(page, "customers.png");

await open(page, `/dashboard/apps/${APP}/payment-links`, "Enterprise kickoff");
await page.waitForTimeout(400);
await shot(page, "payment-links.png");

await open(page, `/dashboard/apps/${APP}/product-plans`, "NodeRails Pro");
await page.waitForTimeout(400);
await shot(page, "product-plans.png");

await open(page, `/dashboard/apps/${APP}/settings`, "Chains");
await page.waitForFunction(
  () => /Ethereum|Sepolia|Sui|Base|Polygon/.test(document.body?.innerText ?? ""),
  { timeout: 30000 },
).catch(() => {});
await page.waitForTimeout(800);
await shot(page, "app-settings.png");

await open(page, "/dashboard/settings/tax-rates", "Tax");
await page.waitForTimeout(800);
await shot(page, "tax-rates.png");

await browser.close();
