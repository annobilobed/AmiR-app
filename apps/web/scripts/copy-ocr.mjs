// Copies the in-browser OCR engine and English language data into public/ocr, so screenshot
// reading works offline and sends nothing to a CDN. Runs before dev and build.
import { cpSync, existsSync, mkdirSync, realpathSync } from "node:fs";
import { dirname, join } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const out = join(import.meta.dirname, "..", "public", "ocr");
mkdirSync(out, { recursive: true });

const tesseract = dirname(realpathSync(require.resolve("tesseract.js/package.json")));
const core = dirname(createRequire(join(tesseract, "package.json")).resolve("tesseract.js-core/package.json"));
const lang = dirname(require.resolve("@tesseract.js-data/eng/package.json"));

cpSync(join(tesseract, "dist", "worker.min.js"), join(out, "worker.min.js"));
for (const f of ["tesseract-core", "tesseract-core-simd", "tesseract-core-lstm", "tesseract-core-simd-lstm", "tesseract-core-relaxedsimd", "tesseract-core-relaxedsimd-lstm"]) {
  const src = join(core, `${f}.wasm.js`);
  if (existsSync(src)) cpSync(src, join(out, `${f}.wasm.js`));
}
cpSync(join(lang, "4.0.0_best_int", "eng.traineddata.gz"), join(out, "eng.traineddata.gz"));
console.log("OCR files copied to public/ocr");
