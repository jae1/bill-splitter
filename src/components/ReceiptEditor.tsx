import type { ChangeEvent } from "react";
import { formatMoney, parseMoney } from "../domain/splitCalculator";
import type { Receipt } from "../domain/types";

type Props = {
  receipt: Receipt;
  extracting: boolean;
  extractionProgress: number;
  extractionMessage: string;
  extractionError?: string;
  rawText?: string;
  onReceiptChange: (receipt: Receipt) => void;
  onUpload: (file?: File) => void;
};

export function ReceiptEditor({
  receipt,
  extracting,
  extractionProgress,
  extractionMessage,
  extractionError,
  rawText,
  onReceiptChange,
  onUpload,
}: Props) {
  const updateItem = (id: string, field: "name" | "priceCents", value: string) => {
    onReceiptChange({
      ...receipt,
      items: receipt.items.map((item) =>
        item.id === id ? { ...item, [field]: field === "priceCents" ? parseMoney(value) : value } : item,
      ),
    });
  };

  const updateMoney = (field: "taxCents" | "tipCents" | "totalCents", value: string) =>
    onReceiptChange({ ...receipt, [field]: parseMoney(value) });

  const handleFile = (event: ChangeEvent<HTMLInputElement>) => onUpload(event.target.files?.[0]);

  return (
    <section className="panel receipt-panel" aria-labelledby="receipt-title">
      <div className="section-heading">
        <div>
          <span className="eyebrow">Step 1</span>
          <h2 id="receipt-title">Check the receipt</h2>
          <p>AI makes the first pass. You always get the final say.</p>
        </div>
        <label className="upload-button">
          <input type="file" accept="image/*" onChange={handleFile} />
          {extracting ? "Reading receipt…" : "Upload photo"}
        </label>
      </div>

      {(extracting || extractionError || rawText) && (
        <div className={`ocr-status ${extractionError ? "error" : ""}`} role="status">
          <div>
            <strong>{extractionError ? "Couldn’t read that receipt" : extractionMessage}</strong>
            {extracting && <span>{Math.round(extractionProgress * 100)}%</span>}
          </div>
          {extracting && <progress max="1" value={extractionProgress} />}
          {extractionError && <p>{extractionError} You can still edit the receipt manually.</p>}
          {rawText && (
            <details>
              <summary>View recognized text</summary>
              <pre>{rawText}</pre>
            </details>
          )}
        </div>
      )}

      <label className="field merchant-field">
        Restaurant
        <input
          value={receipt.merchantName}
          onChange={(event) => onReceiptChange({ ...receipt, merchantName: event.target.value })}
        />
      </label>

      <div className="receipt-list">
        {receipt.items.map((item) => (
          <div className="receipt-row" key={item.id}>
            <span className={`confidence ${item.confidence && item.confidence < 0.85 ? "review" : ""}`}>
              {item.confidence && item.confidence < 0.85 ? "Review" : "✓"}
            </span>
            <input
              aria-label={`${item.name} name`}
              value={item.name}
              onChange={(event) => updateItem(item.id, "name", event.target.value)}
            />
            <input
              className="money-input"
              aria-label={`${item.name} price`}
              value={(item.priceCents / 100).toFixed(2)}
              onChange={(event) => updateItem(item.id, "priceCents", event.target.value)}
            />
          </div>
        ))}
      </div>

      <div className="receipt-totals">
        {(["taxCents", "tipCents", "totalCents"] as const).map((field) => (
          <label key={field}>
            <span>{field === "taxCents" ? "Tax" : field === "tipCents" ? "Tip" : "Receipt total"}</span>
            <input
              aria-label={field}
              value={(receipt[field] / 100).toFixed(2)}
              onChange={(event) => updateMoney(field, event.target.value)}
            />
          </label>
        ))}
      </div>
      <p className="math-note">
        Items {formatMoney(receipt.items.reduce((sum, item) => sum + item.priceCents, 0))} ·
        Everything remains editable.
      </p>
    </section>
  );
}
