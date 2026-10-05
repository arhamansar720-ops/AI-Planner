// Builds the single-file Claude test bench: node bench/build.mjs <out.html>
import { build } from "esbuild";
import { readFileSync, writeFileSync } from "node:fs";

const out = process.argv[2] ?? "bench/dist/forma-bench.html";
const engine = await build({
  entryPoints: [new URL("./engine.ts", import.meta.url).pathname],
  bundle: true, format: "iife", globalName: "Forma", minify: true, target: "es2020",
  tsconfig: new URL("../tsconfig.json", import.meta.url).pathname, write: false,
});
const safe = (js) => js.replace(/<\/script/gi, "<\\/script");
const html = readFileSync(new URL("./bench.html", import.meta.url), "utf8")
  .replace("/*ENGINE*/", () => safe(engine.outputFiles[0].text))
  .replace("/*APP*/", () => safe(readFileSync(new URL("./app.js", import.meta.url), "utf8")));
writeFileSync(out, html);
console.log(`wrote ${out} (${(html.length / 1024).toFixed(0)} KB)`);
