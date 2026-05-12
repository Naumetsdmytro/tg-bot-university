import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createCanvas } from "@napi-rs/canvas";

const here = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(here, "..");
const outDir = path.join(projectRoot, "assets/images");

// All PDFs in this list are processed in order. Page numbering is continuous
// across files (so part 2 starts where part 1 finished).
const PDF_PARTS = ["assets/source.pdf", "assets/source-part2.pdf"];

const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");

class NodeCanvasFactory {
  create(width, height) {
    const canvas = createCanvas(width, height);
    return { canvas, context: canvas.getContext("2d") };
  }
  reset(canvasAndContext, width, height) {
    canvasAndContext.canvas.width = width;
    canvasAndContext.canvas.height = height;
  }
  destroy(canvasAndContext) {
    canvasAndContext.canvas.width = 0;
    canvasAndContext.canvas.height = 0;
    canvasAndContext.canvas = null;
    canvasAndContext.context = null;
  }
}

async function renderPdf(pdfRelativePath, startPage) {
  const absPath = path.join(projectRoot, pdfRelativePath);
  try {
    await fs.access(absPath);
  } catch {
    console.log(`Skip: ${pdfRelativePath} (not found).`);
    return startPage;
  }

  const data = new Uint8Array(await fs.readFile(absPath));
  const loadingTask = pdfjs.getDocument({
    data,
    canvasFactory: new NodeCanvasFactory(),
    disableFontFace: true,
    useSystemFonts: false,
  });
  const doc = await loadingTask.promise;
  console.log(`\nProcessing ${pdfRelativePath}: ${doc.numPages} pages (starting at page-${startPage}).`);

  const scale = 1.5;
  for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
    const page = await doc.getPage(pageNum);
    const viewport = page.getViewport({ scale });
    const factory = new NodeCanvasFactory();
    const cc = factory.create(viewport.width, viewport.height);

    await page.render({
      canvasContext: cc.context,
      viewport,
      canvasFactory: factory,
    }).promise;

    const buffer = cc.canvas.toBuffer("image/png");
    const fileName = `page-${String(startPage + pageNum - 1).padStart(2, "0")}.png`;
    await fs.writeFile(path.join(outDir, fileName), buffer);

    page.cleanup();
    process.stdout.write(`\rRendered ${pdfRelativePath} ${pageNum}/${doc.numPages}`);
  }
  process.stdout.write("\n");
  return startPage + doc.numPages;
}

async function main() {
  await fs.mkdir(outDir, { recursive: true });
  let nextPage = 1;
  for (const pdf of PDF_PARTS) {
    nextPage = await renderPdf(pdf, nextPage);
  }
  console.log(`Done. Total pages rendered: ${nextPage - 1}.`);
  console.log(`Output: ${path.relative(projectRoot, outDir)}/`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
