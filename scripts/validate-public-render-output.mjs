import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(__dirname, "..");
const distDir = resolve(appRoot, "dist");

const forbiddenStrings = [
  "Evaluative register sample",
  "Research register sample",
  "Email register sample",
  "Closest reference profile",
  "Distance from selected register reference",
  "Legacy generic AI-style reference",
  "Legacy generic AI-style reference distance",
  "Distance from reference profiles",
  "Metric value comparison",
  "Normalised register profile comparison",
  "Rule-based report",
  "Reference profile provenance",
  "Features closer to the legacy generic AI-style reference",
  "Suggested register adjustments",
  "Paragraph flags",
  "About these reference profiles",
  "legacy generic AI-style reference",
  "Academic evaluative register provisional",
  "Academic explanatory / argumentative register provisional",
  "Empirical research register provisional",
  "Professional email register provisional",
  "Academic evaluative register",
  "Empirical research register",
  "Professional email register",
  "provisional register references",
  "provisional reference profiles",
  "generic AI-style reference",
  "Local style similarity diagnostics",
];

const requiredStrings = [
  "AI-style comparison profile",
  "AI corpus comparison plots",
  "Compact indexed AI corpus bar plot",
  "Indexed bar comparison",
  "Indexed radar comparison",
  "Selected writing task:",
  "The selected task chooses the relevant AI-style comparison profile and organises metric explanations. It is not treated as a standard of good writing.",
  "These profiles are corpus-derived AI-style comparison benchmarks. They are not AI detectors, not authorship classifiers, not plagiarism tools, and not universal averages of AI writing.",
];

function fail(message) {
  throw new Error(`Public render output validation failed: ${message}`);
}

function collectTextFiles(directory) {
  const files = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const fullPath = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectTextFiles(fullPath));
    } else if (/\.(html|js|css)$/.test(entry.name)) {
      files.push(fullPath);
    }
  }
  return files;
}

if (!existsSync(distDir)) {
  fail("dist directory does not exist; run the production build first");
}

const bundleText = collectTextFiles(distDir)
  .map((file) => readFileSync(file, "utf8"))
  .join("\n");

const forbiddenFound = forbiddenStrings.filter((text) => bundleText.includes(text));
if (forbiddenFound.length) {
  fail(`forbidden public strings found: ${forbiddenFound.join("; ")}`);
}

const requiredMissing = requiredStrings.filter((text) => !bundleText.includes(text));
if (requiredMissing.length) {
  fail(`required public strings missing: ${requiredMissing.join("; ")}`);
}

console.log("Public render output validation passed.");
console.log(`Checked ${forbiddenStrings.length} forbidden strings.`);
console.log(`Checked ${requiredStrings.length} required strings.`);
