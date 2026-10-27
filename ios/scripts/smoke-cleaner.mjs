// Optional local check for ios/Shared/JS/PageCleaner.js: runs the generated Safari preprocessor bundle against the
// repo's HTML fixtures with jsdom and prints which cleaner won, how much text survived and how many date-like
// tokens were kept. Needs jsdom: `NODE_PATH=$(npm root -g) node ios/scripts/smoke-cleaner.mjs` after `npm i -g jsdom`,
// or point NODE_PATH at any folder containing node_modules/jsdom.
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { JSDOM, VirtualConsole } = require("jsdom");
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const bundle = readFileSync(path.join(root, "ios/ShareExtension/ShareJS.js"), "utf8");
const fixtures = process.argv.slice(2).length
  ? process.argv.slice(2)
  : [
      "tests/artifacts/sources/presidio-opera-parallele-doubt.html",
      "tests/artifacts/sources/equal-performances-simple.html",
      "tests/artifacts/sources/primary-date-with-related.html",
    ];

let failures = 0;
for (const fixture of fixtures) {
  const html = readFileSync(path.join(root, fixture), "utf8");
  const virtualConsole = new VirtualConsole();
  const dom = new JSDOM(html, { url: "https://example.test/" + path.basename(fixture), runScripts: "outside-only", virtualConsole });
  dom.window.eval(bundle);
  const result = dom.window.eval("WebToICS.clean(document, window)");
  const heuristic = dom.window.eval("WebToICS.elementToText(document, WebToICS.pickHeuristicElement(document))");
  const dates = dom.window.eval("WebToICS.countDates")(result.text);
  const heuristicDates = dom.window.eval("WebToICS.countDates")(heuristic);
  const ok = result.text.length > 100 && dates >= Math.ceil(heuristicDates * 0.5);
  if (!ok) failures++;
  console.log(`${ok ? "OK  " : "FAIL"} ${fixture}`);
  console.log(`     method=${result.method} title=${JSON.stringify(result.title)} site=${JSON.stringify(result.siteName)}`);
  console.log(`     text=${result.text.length} chars (heuristic ${heuristic.length}), dates kept ${dates}/${heuristicDates}, html=${result.html.length} chars`);
  console.log(`     preview: ${JSON.stringify(result.text.slice(0, 160))}`);
}
if (failures) {
  console.error(`${failures} fixture(s) failed`);
  process.exit(1);
}
