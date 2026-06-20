import { createWorker, PSM } from "tesseract.js";
import type { Receipt, ReceiptItem } from "../domain/types";

export type ExtractionResult = { receipt: Receipt; rawText: string; warnings: string[] };
export type ExtractionProgress = { progress: number; status: string };

export const sampleReceipt: Receipt = {
  merchantName: "Juniper & Stone",
  items: [
    { id: "item-1", name: "Truffle fries", priceCents: 1400, participantIds: [], confidence: 0.98 },
    { id: "item-2", name: "Margherita pizza", priceCents: 2200, participantIds: [], confidence: 0.94 },
    { id: "item-3", name: "Spicy rigatoni", priceCents: 2400, participantIds: [], confidence: 0.91 },
    { id: "item-4", name: "Sparkling water", priceCents: 800, participantIds: [], confidence: 0.82 },
  ],
  taxCents: 612,
  tipCents: 1378,
  totalCents: 8790,
};

const moneyAtEnd = /(?:\$?\s*)(-?\d{1,5}(?:[.,]\d{2}|\s+\d{2}))\s*$/;
const ignored = /^(subtotal|total|tax|tip|gratuity|balance|amount|cash|change|visa|mastercard|amex)/i;

const normalizeOcrLine = (line: string) =>
  line
    .replace(/[|]/g, "I")
    .replace(/(\d)[oO](?=\s*$)/g, "$10")
    .replace(/(\d)[lI](?=\d(?:\s|$))/g, "$11")
    .replace(/[·•…_]{2,}/g, " ")
    .replace(/\.{2,}/g, " ")
    .replace(/\s+/g, " ")
    .trim();

async function preprocessReceipt(file: File, onProgress?: (progress: ExtractionProgress) => void) {
  onProgress?.({ progress: 0.03, status: "preparing image" });
  const bitmap = await createImageBitmap(file);
  const longest = Math.max(bitmap.width, bitmap.height);
  const scale = Math.min(3, Math.max(1, 2200 / longest));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("This browser could not prepare the receipt image.");
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  const image = context.getImageData(0, 0, canvas.width, canvas.height);
  const data = image.data;
  let sum = 0;
  for (let index = 0; index < data.length; index += 4) {
    const gray = Math.round(data[index] * 0.299 + data[index + 1] * 0.587 + data[index + 2] * 0.114);
    sum += gray;
  }
  const average = sum / (data.length / 4);
  const contrast = average < 150 ? 1.65 : 1.9;
  for (let index = 0; index < data.length; index += 4) {
    const gray = data[index] * 0.299 + data[index + 1] * 0.587 + data[index + 2] * 0.114;
    const adjusted = Math.max(0, Math.min(255, (gray - average) * contrast + 210));
    data[index] = adjusted;
    data[index + 1] = adjusted;
    data[index + 2] = adjusted;
  }
  context.putImageData(image, 0, 0);
  return canvas;
}

export function parseReceiptText(rawText: string): ExtractionResult {
  const lines = rawText.split(/\r?\n/).map(normalizeOcrLine).filter(Boolean);
  let taxCents = 0;
  let tipCents = 0;
  let totalCents = 0;
  const items: ReceiptItem[] = [];

  for (const line of lines) {
    const match = line.match(moneyAtEnd);
    if (!match) continue;
    const numeric = match[1].replace(/\s+(\d{2})$/, ".$1").replace(",", ".");
    const cents = Math.round(Number(numeric) * 100);
    if (!Number.isFinite(cents)) continue;
    const label = line
      .slice(0, match.index)
      .replace(/^[\d]+\s*[xX@]?\s*/, "")
      .replace(/[-:=\s]+$/, "")
      .trim();
    if (/tax/i.test(label)) taxCents = cents;
    else if (/(tip|gratuity)/i.test(label)) tipCents = cents;
    else if (/(grand\s*)?total|balance|amount due/i.test(label)) totalCents = Math.max(totalCents, cents);
    else if (label && !ignored.test(label) && cents !== 0) {
      items.push({
        id: crypto.randomUUID(),
        name: label,
        priceCents: cents,
        participantIds: [],
        confidence: 0.7,
      });
    }
  }

  const itemSum = items.reduce((sum, item) => sum + item.priceCents, 0);
  if (!totalCents) totalCents = itemSum + taxCents + tipCents;
  const merchantName = lines.find((line) => !moneyAtEnd.test(line) && line.length > 2)?.slice(0, 60) || "Uploaded receipt";
  const warnings: string[] = [];
  if (!items.length) warnings.push("No item lines were detected. Use the recognized text to enter them manually.");
  if (Math.abs(itemSum + taxCents + tipCents - totalCents) > 2) {
    warnings.push("The recognized lines do not match the detected total. Review the highlighted draft.");
  }

  return {
    receipt: { merchantName, items, taxCents, tipCents, totalCents },
    rawText,
    warnings,
  };
}

export async function extractReceipt(
  file: File,
  onProgress?: (progress: ExtractionProgress) => void,
): Promise<ExtractionResult> {
  if (!file.type.startsWith("image/")) throw new Error("Choose an image file such as JPG, PNG, or HEIC.");
  const prepared = await preprocessReceipt(file, onProgress);
  const worker = await createWorker("eng", undefined, {
    logger: (message) => {
      if (typeof message.progress === "number") {
        onProgress?.({ progress: message.progress, status: message.status.replaceAll("_", " ") });
      }
    },
  });
  try {
    await worker.setParameters({
      tessedit_pageseg_mode: PSM.SINGLE_BLOCK,
      preserve_interword_spaces: "1",
      user_defined_dpi: "300",
    });
    const result = await worker.recognize(prepared);
    return parseReceiptText(result.data.text);
  } finally {
    await worker.terminate();
  }
}
