import fs from "fs";
import path from "path";
import os from "os";
import { promisify } from "util";
import { exec as execCb } from "child_process";
import pdfParse from "pdf-parse";
import Tesseract from "tesseract.js";
import { generateSuggestions } from "../services/suggestService.js";

const exec = promisify(execCb);

//extract text using pdf-parse; accepts Buffer or file path
async function extractTextFromPdfDirect(input) {
  // pdf-parse accepts Buffer or Uint8Array
  if (!input) return "";
  if (Buffer.isBuffer(input)) {
    const parsed = await pdfParse(input);
    return parsed?.text?.trim() ?? "";
  }
  const data = await fs.promises.readFile(input);
  const parsed = await pdfParse(data);
  return parsed?.text?.trim() ?? "";
}

// convert pdf -> pngs using pdftoppm (poppler)
async function convertPdfToPngs(pdfPath, outputDir) {
  await fs.promises.mkdir(outputDir, { recursive: true });
  const outPrefix = path.join(outputDir, "page");
  const cmd = `pdftoppm -png "${pdfPath}" "${outPrefix}"`;
  await exec(cmd);
  const files = await fs.promises.readdir(outputDir);
  const pngs = files
    .filter((f) => f.toLowerCase().endsWith(".png"))
    .map((f) => path.join(outputDir, f))
    .sort();
  return pngs;
}

// OCR images array -> concatenated text
async function ocrImages(imagePaths) {
  let allText = "";
  for (const img of imagePaths) {
    const res = await Tesseract.recognize(img, "eng", {
      logger: (m) => console.log("TESSERACT:", m),
    });
    const pageText = res?.data?.text ?? "";
    if (pageText.trim()) {
      allText += (allText ? "\n\n" : "") + pageText.trim();
    }
  }
  return allText.trim();
}

export async function handleUpload(req, res) {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ error: "No file uploaded" });

    // Determine if multer gave us a path or not
    const hasBuffer = Buffer.isBuffer(file.buffer);
    const hasPath = typeof file.path === "string" && file.path.length > 0;

    let extractedText = "";
    const origName = file.originalname || file.filename || "upload";
    const ext = path.extname(origName).toLowerCase();
    const mime = file.mimetype || "";

    // Helper to cleanup temp files (if created)
    const tempFilesToRemove = [];

    // PDF handling
    if (mime === "application/pdf" || ext === ".pdf") {
      // 1) Try pdf-parse first (works on selectable/text PDFs)
      try {
        if (hasBuffer) {
          extractedText = await extractTextFromPdfDirect(file.buffer);
        } else if (hasPath) {
          extractedText = await extractTextFromPdfDirect(file.path);
        } else {
          return res
            .status(400)
            .json({ error: "PDF upload missing buffer and path" });
        }
      } catch (err) {
        console.warn("pdf-parse failed:", err);
        extractedText = "";
      }

      // 2) If not enough selectable text, fallback to image conversion + OCR
      const MIN_TEXT_LENGTH = 50;
      if (!extractedText || extractedText.length < MIN_TEXT_LENGTH) {
        console.log(
          "PDF needs OCR: converting pages to images for Tesseract..."
        );

        // Ensure we have a pdf file on disk for pdftoppm:
        let pdfPathToConvert;
        if (hasPath) {
          pdfPathToConvert = file.path;
        } else {
          const tmpPdf = path.join(os.tmpdir(), `upload_${Date.now()}.pdf`);
          await fs.promises.writeFile(tmpPdf, file.buffer);
          tempFilesToRemove.push(tmpPdf);
          pdfPathToConvert = tmpPdf;
        }

        const tmpOutDir = path.join(os.tmpdir(), `pdf_pages_${Date.now()}`);
        try {
          const pngs = await convertPdfToPngs(pdfPathToConvert, tmpOutDir);
          // mark pngs for cleanup
          tempFilesToRemove.push(...pngs);
          // OCR the PNG pages
          extractedText = await ocrImages(pngs);
        } catch (err) {
          console.error("PDF -> PNG conversion or OCR failed:", err);
          // If pdftoppm missing or failed, return clear error
          return res.status(500).json({
            error:
              "Failed to convert PDF pages to images for OCR. Ensure Poppler (pdftoppm) is installed and in PATH.",
            details: String(err),
          });
        } finally {
          try {
            // remove png files then directory
            for (const f of tempFilesToRemove) {
              try {
                await fs.promises.unlink(f);
              } catch (_) {}
            }
            try {
              await fs.promises.rmdir(tmpOutDir, { recursive: true });
            } catch (_) {}
          } catch (_) {}
        }
      }
    } else {
      // Image file (jpg/png/tiff etc) -> do OCR directly
      try {
        const input = hasBuffer ? file.buffer : file.path;
        const resOCR = await Tesseract.recognize(input, "eng", {
          logger: (m) => console.log("TESSERACT:", m),
        });
        extractedText = resOCR?.data?.text ?? "";
      } catch (err) {
        console.error("Image OCR failed:", err);
        return res
          .status(500)
          .json({ error: "Image OCR failed", details: String(err) });
      }
    }
    (async () => {
      for (const f of tempFilesToRemove) {
        try {
          await fs.promises.unlink(f);
        } catch (_) {}
      }
    })();

    // If still no text, respond friendly
    if (!extractedText || extractedText.trim().length === 0) {
      return res.status(200).json({
        text: "",
        words: 0,
        suggestions: ["No readable text found in the uploaded file."],
        suggestionSource: "fallback",
      });
    }

    const words = extractedText.trim().split(/\s+/).filter(Boolean).length;
    const { suggestions, source } = await generateSuggestions(extractedText);

    return res.json({
      text: extractedText,
      words,
      suggestions,
      suggestionSource: source,
    });
  } catch (err) {
    console.error("handleUpload error:", err);
    return res
      .status(500)
      .json({ error: "Upload handling failed", details: String(err) });
  }
}
