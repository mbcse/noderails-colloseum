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
  try {
    text = readFileSync(filePath, "utf8");
  } catch {
    return;
  }
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

const requireFromServer = createRequire(path.join(ROOT, "services/noderails-server/package.json"));
const jwt = requireFromServer("jsonwebtoken");

const merchant = JSON.parse(
  execFileSync("npx", ["tsx", "prisma/shot-merchant.ts"], {
    cwd: path.join(ROOT, "packages/database"),
    encoding: "utf8",
  }),
);

const refreshSecret = process.env.JWT_REFRESH_SECRET;
if (!refreshSecret) throw new Error("JWT_REFRESH_SECRET missing");

const refreshToken = jwt.sign(
  { sub: merchant.id, email: merchant.email, role: merchant.role, type: "refresh" },
  refreshSecret,
  { expiresIn: "7d" },
);

const HIDE = `
  nextjs-portal,
  [data-nextjs-dialog-overlay],
  [data-nextjs-toast],
  [data-next-badge-root],
  #__next-build-watcher { display: none !important; }
`;

async function dress(page) {
  await page.addStyleTag({ content: HIDE }).catch(() => {});
  await page.evaluate(() => {
    const swap = (value) =>
      value
        .replaceAll("http://127.0.0.1:3001", "https://merchant.noderails.com")
        .replaceAll("http://localhost:3001", "https://merchant.noderails.com")
        .replaceAll("127.0.0.1:3001", "merchant.noderails.com")
        .replaceAll("localhost:3001", "merchant.noderails.com");
    const walk = (node) => {
      if (node.nodeType === Node.TEXT_NODE && node.textContent) {
        node.textContent = swap(node.textContent);
      }
      if (node.nodeType === Node.ELEMENT_NODE) {
        for (const attr of ["href", "placeholder", "title", "aria-label"]) {
          const current = node.getAttribute?.(attr);
          if (current) node.setAttribute(attr, swap(current));
        }
      }
      node.childNodes.forEach(walk);
    };
    walk(document.body);
    for (const el of document.querySelectorAll("p")) {
      const text = el.textContent?.trim() ?? "";
      if (text.startsWith("Test app - testnet only") && text.length < 180) {
        const banner = el.parentElement;
        if (banner) banner.style.display = "none";
      }
    }
  });
  await page.waitForTimeout(350);
}

async function shot(page, file) {
  await dress(page);
  await page.screenshot({ path: path.join(OUT, file), type: "png" });
  console.log(`wrote ${file}`);
}

async function openDash(page, urlPath, readyText) {
  await page.goto(`${DASH}${urlPath}`, { waitUntil: "load", timeout: 60000 });
  await page.waitForFunction(
    () => {
      const text = document.body?.innerText ?? "";
      return text.includes("NodeRails") && !text.includes("Sign in to your dashboard");
    },
    { timeout: 20000 },
  );
  try {
    await page.waitForFunction(
      (needle) => (document.body?.innerText ?? "").includes(needle),
      readyText,
      { timeout: 25000 },
    );
  } catch {
    console.warn(`still waiting past "${readyText}" at ${urlPath}`);
  }
  await page.waitForTimeout(1400);
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });
  await context.addCookies([
    {
      name: "nr_refresh",
      value: refreshToken,
      domain: "127.0.0.1",
      path: "/",
      httpOnly: true,
      secure: false,
      sameSite: "Strict",
    },
  ]);
  const page = await context.newPage();
  await page.addInitScript(() => {
    const style = document.createElement("style");
    style.textContent = `nextjs-portal, [data-next-badge-root] { display: none !important; }`;
    document.documentElement.appendChild(style);
  });

  await openDash(page, `/dashboard/apps/${APP}/payouts`, "Send");
  await shot(page, "payouts.png");

  await openDash(page, "/dashboard/bank", "Own account");
  await shot(page, "bank.png");

  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
