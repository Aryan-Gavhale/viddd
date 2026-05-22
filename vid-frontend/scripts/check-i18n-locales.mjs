import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const localesDir = path.join(root, "src", "i18n", "locales");
const languages = ["en", "es", "fr", "de", "ja", "hi"];

function flatten(value, prefix = "") {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return [prefix];
  }
  return Object.entries(value).flatMap(([key, child]) => {
    const next = prefix ? `${prefix}.${key}` : key;
    return flatten(child, next);
  });
}

function readLocale(language) {
  const filePath = path.join(localesDir, `${language}.json`);
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

const baseline = flatten(readLocale("en")).sort();
let failed = false;

for (const language of languages.filter((lang) => lang !== "en")) {
  const keys = flatten(readLocale(language)).sort();
  const keySet = new Set(keys);
  const baseSet = new Set(baseline);
  const missing = baseline.filter((key) => !keySet.has(key));
  const extra = keys.filter((key) => !baseSet.has(key));

  if (missing.length || extra.length) {
    failed = true;
    console.error(`\n${language}.json does not match en.json`);
    if (missing.length) console.error(`  Missing: ${missing.join(", ")}`);
    if (extra.length) console.error(`  Extra: ${extra.join(", ")}`);
  }
}

if (failed) {
  process.exitCode = 1;
} else {
  console.log(`i18n locale parity OK (${baseline.length} keys across ${languages.length} locales)`);
}
