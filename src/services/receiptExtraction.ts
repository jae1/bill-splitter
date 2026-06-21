import { createWorker, PSM } from "tesseract.js";
import type { Receipt, ReceiptItem } from "../domain/types";

export type ExtractionResult = { receipt: Receipt; rawText: string; warnings: string[] };
export type ExtractionProgress = { progress: number; status: string };
export type ReceiptImageOptions = {
  rotation: 0 | 90 | 180 | 270;
  cropTop: number;
  cropRight: number;
  cropBottom: number;
  cropLeft: number;
};

export const defaultReceiptImageOptions: ReceiptImageOptions = {
  rotation: 0,
  cropTop: 0,
  cropRight: 0,
  cropBottom: 0,
  cropLeft: 0,
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

export function cropDimensions(width: number, height: number, options: ReceiptImageOptions) {
  const sourceWidth = Math.max(1, Math.round(width * (1 - options.cropLeft - options.cropRight)));
  const sourceHeight = Math.max(1, Math.round(height * (1 - options.cropTop - options.cropBottom)));
  return {
    sourceX: Math.round(width * options.cropLeft),
    sourceY: Math.round(height * options.cropTop),
    sourceWidth,
    sourceHeight,
    outputWidth: options.rotation % 180 === 0 ? sourceWidth : sourceHeight,
    outputHeight: options.rotation % 180 === 0 ? sourceHeight : sourceWidth,
  };
}

export async function transformReceiptImage(file: File, options: ReceiptImageOptions): Promise<File> {
  const bitmap = await createImageBitmap(file);
  const dimensions = cropDimensions(bitmap.width, bitmap.height, options);
  const canvas = document.createElement("canvas");
  canvas.width = dimensions.outputWidth;
  canvas.height = dimensions.outputHeight;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("This browser could not prepare the receipt preview.");
  context.translate(canvas.width / 2, canvas.height / 2);
  context.rotate((options.rotation * Math.PI) / 180);
  context.drawImage(
    bitmap,
    dimensions.sourceX,
    dimensions.sourceY,
    dimensions.sourceWidth,
    dimensions.sourceHeight,
    -dimensions.sourceWidth / 2,
    -dimensions.sourceHeight / 2,
    dimensions.sourceWidth,
    dimensions.sourceHeight,
  );
  bitmap.close();
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (value) => value ? resolve(value) : reject(new Error("Could not create the cropped image.")),
      "image/jpeg",
      0.92,
    ),
  );
  return new File([blob], "prepared-receipt.jpg", { type: "image/jpeg" });
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
