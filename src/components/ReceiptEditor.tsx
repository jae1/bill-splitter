import type { ChangeEvent } from "react";
import { formatMoney, parseMoney } from "../domain/splitCalculator";
import type { Receipt } from "../domain/types";
import { createBlankItem } from "../domain/defaultSplit";

type Props = {
  receipt: Receipt;
  extracting: boolean;
  extractionProgress: number;
  extractionMessage: string;
  extractionError?: string;
  rawText?: string;
  hasPendingDraft: boolean;
  onApplyDraft: () => void;
  onDiscardDraft: () => void;
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
  hasPendingDraft,
  onApplyDraft,
  onDiscardDraft,
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

  const addItem = () =>
    onReceiptChange({ ...receipt, items: [...receipt.items, createBlankItem()] });

  const removeItem = (id: string) =>
    onReceiptChange({ ...receipt, items: receipt.items.filter((item) => item.id !== id) });

  const duplicateItem = (id: string) => {
    const index = receipt.items.findIndex((item) => item.id === id);
    if (index < 0) return;
    const copy = { ...receipt.items[index], id: crypto.randomUUID(), participantIds: [] };
    const items = [...receipt.items];
    items.splice(index + 1, 0, copy);
    onReceiptChange({ ...receipt, items });
  };

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
          {hasPendingDraft && (
            <div className="draft-actions">
              <button className="primary-button" onClick={onApplyDraft}>Use OCR draft</button>
              <button className="secondary-button" onClick={onDiscardDraft}>Discard draft</button>
            </div>
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
        {receipt.items.length === 0 && !extracting && (
          <p className="empty-state">Add items manually, or optionally upload a receipt for an OCR draft.</p>
        )}
        {receipt.items.map((item, index) => (
          <div className="receipt-row" key={item.id}>
            <span className={`confidence ${item.confidence && item.confidence < 0.85 ? "review" : ""}`}>
              {item.confidence && item.confidence < 0.85 ? "Review" : "✓"}
            </span>
            <input
              aria-label={`${item.name} name`}
              value={item.name}
              onChange={(event) => updateItem(item.id, "name", event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && index === receipt.items.length - 1) addItem();
              }}
            />
            <input
              className="money-input"
              aria-label={`${item.name} price`}
              value={(item.priceCents / 100).toFixed(2)}
              onChange={(event) => updateItem(item.id, "priceCents", event.target.value)}
            />
            <div className="item-row-actions">
              <button aria-label={`Duplicate ${item.name || `item ${index + 1}`}`} onClick={() => duplicateItem(item.id)}>⧉</button>
              <button aria-label={`Delete ${item.name || `item ${index + 1}`}`} onClick={() => removeItem(item.id)}>×</button>
            </div>
          </div>
        ))}
      </div>
      <button className="add-item-button" onClick={addItem}>+ Add item manually</button>

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
