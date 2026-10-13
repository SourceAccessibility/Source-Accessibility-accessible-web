const fs = require("node:fs");
const path = require("node:path");

const outputDirectory = path.resolve(__dirname, "..", "dist");
const expectedHtmlCount = 19;
const expectedDomain = "sourceaccessibility.co.uk";

function fail(message) {
  console.error(`Pages output validation failed: ${message}`);
  process.exitCode = 1;
}

if (!fs.existsSync(outputDirectory)) {
  fail("dist/ does not exist; run npm run build first.");
  process.exit();
}

const rootFiles = fs.readdirSync(outputDirectory, { withFileTypes: true });
const htmlFiles = rootFiles
  .filter((entry) => entry.isFile() && /\.html$/i.test(entry.name))
  .map((entry) => entry.name);
const sitemapPath = path.join(outputDirectory, "sitemap.xml");
let sitemapUrlCount = 0;

if (htmlFiles.length !== expectedHtmlCount) {
  fail(`Expected ${expectedHtmlCount} public HTML pages; found ${htmlFiles.length}.`);
}

for (const requiredFile of ["CNAME", "robots.txt", "sitemap.xml"]) {
  if (!fs.existsSync(path.join(outputDirectory, requiredFile))) {
    fail(`Required file is missing: ${requiredFile}.`);
  }
}

const cnamePath = path.join(outputDirectory, "CNAME");
if (
  fs.existsSync(cnamePath) &&
  fs.readFileSync(cnamePath, "utf8").trim() !== expectedDomain
) {
  fail(`CNAME must remain ${expectedDomain}.`);
}

if (fs.existsSync(sitemapPath)) {
  const sitemap = fs.readFileSync(sitemapPath, "utf8");
  const locations = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(
    (match) => match[1].trim(),
  );
  const sitemapPages = new Set();
  sitemapUrlCount = locations.length;

  if (locations.length !== expectedHtmlCount) {
    fail(
      `Expected ${expectedHtmlCount} sitemap URLs; found ${locations.length}.`,
    );
  }

  for (const location of locations) {
    let pageName;
    try {
      const url = new URL(location);
      if (
        url.protocol !== "https:" ||
        url.hostname !== expectedDomain ||
        url.search ||
        url.hash
      ) {
        fail(`Unexpected sitemap URL: ${location}.`);
        continue;
      }
      pageName = decodeURIComponent(url.pathname).replace(/^\/+/, "") || "index.html";
    } catch {
      fail(`Invalid sitemap URL: ${location}.`);
      continue;
    }

    if (!htmlFiles.includes(pageName)) {
      fail(`Sitemap URL does not resolve to a generated HTML page: ${location}.`);
    }
    if (sitemapPages.has(pageName)) {
      fail(`Duplicate sitemap entry for ${pageName}.`);
    }
    sitemapPages.add(pageName);
  }

  for (const htmlFile of htmlFiles) {
    if (!sitemapPages.has(htmlFile)) {
      fail(`Generated page is not listed in sitemap.xml: ${htmlFile}.`);
    }
  }
}

const requiredServicePage = "services-travel-transport-accessibility.html";
if (!htmlFiles.includes(requiredServicePage)) {
  fail(`Required service page is missing: ${requiredServicePage}.`);
}

const servicePages = htmlFiles.filter((file) => /^services-.+\.html$/i.test(file));
if (servicePages.length === 0) {
  fail("No standalone service pages were generated.");
}

for (const servicePage of servicePages) {
  const html = fs.readFileSync(path.join(outputDirectory, servicePage), "utf8");
  const requiredNavigation = [
    /<header\b[^>]*class=["'][^"']*\bsite-header\b/i,
    /<nav\b[^>]*class=["'][^"']*\bmain-nav\b/i,
    /<section\b[^>]*class=["'][^"']*\bcontact-section\b/i,
    /<footer\b[^>]*class=["'][^"']*\bsite-footer\b/i,
  ];

  if (requiredNavigation.some((pattern) => !pattern.test(html))) {
    fail(`Expanded header, navigation, contact section, or footer missing from ${servicePage}.`);
  }
  if (html.includes("data-include=") || html.includes("js/load-partials.js")) {
    fail(`Unexpanded partial or client-side partial loader found in ${servicePage}.`);
  }
}

if (process.exitCode !== 1) {
  console.log(
    `Validated ${htmlFiles.length} HTML pages, ${sitemapUrlCount} sitemap URLs, required domain files, and embedded service-page navigation.`,
  );
}
