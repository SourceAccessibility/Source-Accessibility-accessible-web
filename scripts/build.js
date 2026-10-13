const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const outputDirectory = path.join(projectRoot, "dist");
const partialDirectory = path.join(projectRoot, "partials");

const excludedDirectories = new Set([
  ".git",
  "dist",
  "node_modules",
  "partials",
  "scripts",
]);
const excludedFiles = new Set([
  ".DS_Store",
  ".gitignore",
  "package.json",
  "README.md",
]);

function expandPartials(html, relativePath) {
  const includePattern = /<div\s+data-include="([^"]+)"\s*><\/div>/g;
  let includeCount = 0;

  const expandedHtml = html.replace(includePattern, (_match, includePath) => {
    const resolvedPartial = path.resolve(projectRoot, includePath);
    if (!resolvedPartial.startsWith(`${partialDirectory}${path.sep}`)) {
      throw new Error(`Invalid partial path in ${relativePath}: ${includePath}`);
    }

    if (!fs.existsSync(resolvedPartial)) {
      throw new Error(`Missing partial in ${relativePath}: ${includePath}`);
    }

    includeCount += 1;
    return fs.readFileSync(resolvedPartial, "utf8").trim();
  });

  if (expandedHtml.includes("data-include=")) {
    throw new Error(`Unprocessed partial placeholder in ${relativePath}`);
  }

  const withoutLoader = expandedHtml.replace(
    /^[\t ]*<script\b(?=[^>]*\bsrc=["']js\/load-partials\.js["'])[^>]*>\s*<\/script>[\t ]*(?:\r?\n|$)/gm,
    "",
  );

  if (
    /^services-[^/]+\.html$/i.test(relativePath) &&
    includeCount !== 3
  ) {
    throw new Error(
      `Expected header, contact and footer partials in ${relativePath}; expanded ${includeCount}.`,
    );
  }

  return { html: withoutLoader, includeCount };
}

function copySite(sourceDirectory, destinationDirectory, stats) {
  for (const entry of fs.readdirSync(sourceDirectory, { withFileTypes: true })) {
    const sourcePath = path.join(sourceDirectory, entry.name);
    const destinationPath = path.join(destinationDirectory, entry.name);
    const relativePath = path.relative(projectRoot, sourcePath);

    if (entry.isDirectory()) {
      if (excludedDirectories.has(entry.name)) continue;
      fs.mkdirSync(destinationPath, { recursive: true });
      copySite(sourcePath, destinationPath, stats);
      continue;
    }

    if (!entry.isFile() || excludedFiles.has(entry.name)) continue;
    if (relativePath === path.join("js", "load-partials.js")) continue;

    fs.mkdirSync(path.dirname(destinationPath), { recursive: true });

    if (path.extname(entry.name).toLowerCase() === ".html") {
      const sourceHtml = fs.readFileSync(sourcePath, "utf8");
      const result = expandPartials(sourceHtml, relativePath);
      fs.writeFileSync(destinationPath, result.html);
      stats.htmlFiles += 1;
      stats.partialsExpanded += result.includeCount;
    } else {
      fs.copyFileSync(sourcePath, destinationPath);
      stats.otherFiles += 1;
    }
  }
}

if (fs.existsSync(outputDirectory)) {
  if (fs.lstatSync(outputDirectory).isSymbolicLink()) {
    throw new Error("Refusing to replace dist because it is a symbolic link.");
  }
  fs.rmSync(outputDirectory, { recursive: true, force: true });
}

fs.mkdirSync(outputDirectory, { recursive: true });

const stats = { htmlFiles: 0, otherFiles: 0, partialsExpanded: 0 };
copySite(projectRoot, outputDirectory, stats);

const servicePageCount = fs
  .readdirSync(projectRoot)
  .filter((entry) => /^services-[^/]+\.html$/i.test(entry)).length;
const expectedPartialCount = servicePageCount * 3;

if (stats.partialsExpanded !== expectedPartialCount) {
  throw new Error(
    `Expected to expand ${expectedPartialCount} shared partials across ${servicePageCount} service pages; expanded ${stats.partialsExpanded}.`,
  );
}

console.log(
  `Built ${stats.htmlFiles} HTML pages and ${stats.otherFiles} supporting files in dist/; expanded ${stats.partialsExpanded} shared partials.`,
);
