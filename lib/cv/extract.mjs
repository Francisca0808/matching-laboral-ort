import { prepareExtractedText } from "./text.mjs";

export async function extractCvText(buffer, mimeType) {
  let text = "";
  if (mimeType === "application/pdf") {
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: new Uint8Array(buffer) });
    try {
      text = (await parser.getText()).text;
    } finally {
      await parser.destroy();
    }
  } else if (
    mimeType ===
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    const mammoth = (await import("mammoth")).default;
    text = (await mammoth.extractRawText({ buffer })).value;
  } else {
    throw new Error("Formato de CV no admitido.");
  }
  return prepareExtractedText(text);
}
