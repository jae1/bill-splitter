import { useEffect, useState, type ChangeEvent } from "react";
import { formatMoney, getItemTotalCents, getItemUnitPriceCents } from "../domain/splitCalculator";
import type { Receipt } from "../domain/types";
import { createBlankItem } from "../domain/defaultSplit";
import {
  defaultReceiptImageOptions,
  transformReceiptImage,
  type ReceiptImageOptions,
} from "../services/receiptExtraction";
import { MoneyInput } from "./MoneyInput";

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
  const [sourceFile, setSourceFile] = useState<File>();
  const [preparedFile, setPreparedFile] = useState<File>();
  const [previewUrl, setPreviewUrl] = useState<string>();
  const [imageOptions, setImageOptions] = useState<ReceiptImageOptions>(defaultReceiptImageOptions);
  const [preparingImage, setPreparingImage] = useState(false);

  useEffect(() => {
    if (!sourceFile) return;
    let cancelled = false;
    setPreparingImage(true);
    void transformReceiptImage(sourceFile, imageOptions)
      .then((file) => {
        if (cancelled) return;
        setPreparedFile(file);
        setPreviewUrl((current) => {
          if (current) URL.revokeObjectURL(current);
          return URL.createObjectURL(file);
        });
      })
      .finally(() => {
        if (!cancelled) setPreparingImage(false);
      });
    return () => { cancelled = true; };
  }, [sourceFile, imageOptions]);
  const updateItem = (id: string, field: "name" | "priceCents", value: string | number) => {
    onReceiptChange({
      ...receipt,
      items: receipt.items.map((item) => {
        if (item.id !== id) return item;
        if (field === "priceCents") {
          const nextItem = { ...item, priceCents: Number(value) };
          return { ...nextItem, unitPriceCents: getItemUnitPriceCents(nextItem) };
        }
        return { ...item, name: String(value) };
      }),
    });
  };

  const updateQuantity = (id: string, quantity: number) =>
    onReceiptChange({
      ...receipt,
      items: receipt.items.map((item) => {
        if (item.id !== id) return item;
        const safeQuantity = Math.max(1, Math.round(quantity || 1));
        const nextItem = { ...item, quantity: safeQuantity };
        return {
          ...nextItem,
          unitPriceCents: getItemUnitPriceCents(nextItem),
          quantityAssignments: safeQuantity > 1 ? item.quantityAssignments ?? {} : {},
        };
      }),
    });

  const updatePriceEntryMode = (id: string, priceEntryMode: "lineTotal" | "unitPrice") =>
    onReceiptChange({
      ...receipt,
      items: receipt.items.map((item) => {
        if (item.id !== id) return item;
        const nextItem = { ...item, priceEntryMode };
        return { ...nextItem, unitPriceCents: getItemUnitPriceCents(nextItem) };
      }),
    });

  const updateMoney = (field: "taxCents" | "tipCents" | "totalCents", value: number) =>
    onReceiptChange({ ...receipt, [field]: value });

  const handleFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setSourceFile(file);
    setImageOptions(defaultReceiptImageOptions);
  };

  const updateCrop = (field: keyof ReceiptImageOptions, percent: number) =>
    setImageOptions((current) => ({ ...current, [field]: percent / 100 }));

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
          <p>Enter items yourself, or prepare a clean photo for an OCR draft.</p>
        </div>
        <label className="upload-button">
          <input type="file" accept="image/*" onChange={handleFile} />
          {sourceFile ? "Choose another photo" : "Choose photo"}
        </label>
      </div>

      {sourceFile && (
        <div className="image-prep">
          <div className="receipt-preview">
            {previewUrl && <img src={previewUrl} alt="Cropped receipt preview" />}
            {preparingImage && <span>Preparing preview…</span>}
          </div>
          <div className="image-prep-controls">
            <div className="rotation-controls">
              <strong>Rotate</strong>
              <button
                className="secondary-button"
                onClick={() => setImageOptions((current) => ({
                  ...current,
                  rotation: ((current.rotation + 270) % 360) as ReceiptImageOptions["rotation"],
                }))}
              >↶ Left</button>
              <button
                className="secondary-button"
                onClick={() => setImageOptions((current) => ({
                  ...current,
                  rotation: ((current.rotation + 90) % 360) as ReceiptImageOptions["rotation"],
                }))}
              >Right ↷</button>
            </div>
            <fieldset>
              <legend>Crop background</legend>
              {([
                ["cropTop", "Top"],
                ["cropBottom", "Bottom"],
                ["cropLeft", "Left"],
                ["cropRight", "Right"],
              ] as const).map(([field, label]) => (
                <label key={field}>
                  <span>{label}</span>
                  <input
                    type="range"
                    min="0"
                    max="35"
                    value={Math.round(imageOptions[field] * 100)}
                    onChange={(event) => updateCrop(field, Number(event.target.value))}
                  />
                  <small>{Math.round(imageOptions[field] * 100)}%</small>
                </label>
              ))}
            </fieldset>
            <button
              className="primary-button analyze-button"
              disabled={!preparedFile || extracting || preparingImage}
              onClick={() => onUpload(preparedFile)}
            >
              {extracting ? "Analyzing…" : "Analyze this crop"}
            </button>
            <small>Tip: leave only the paper visible and keep text upright.</small>
          </div>
        </div>
      )}

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
            <MoneyInput
              className="money-input"
              aria-label={`${item.name} price`}
              valueCents={item.priceCents}
              onValueCentsChange={(value) => updateItem(item.id, "priceCents", value)}
            />
            <label className="quantity-field">
              <span>Qty</span>
              <input
                type="number"
                inputMode="numeric"
                min="1"
                step="1"
                aria-label={`${item.name || `item ${index + 1}`} quantity`}
                value={item.quantity ?? 1}
                onChange={(event) => updateQuantity(item.id, Number(event.target.value))}
              />
            </label>
            <label className="price-mode-field">
              <span>Price is</span>
              <select
                aria-label={`${item.name || `item ${index + 1}`} price type`}
                value={item.priceEntryMode ?? "lineTotal"}
                onChange={(event) => updatePriceEntryMode(item.id, event.target.value as "lineTotal" | "unitPrice")}
              >
                <option value="lineTotal">Total</option>
                <option value="unitPrice">Each</option>
              </select>
            </label>
            {(item.quantity ?? 1) > 1 && (
              <small className="line-total-note">
                Line total {formatMoney(getItemTotalCents(item))} · each {formatMoney(getItemUnitPriceCents(item))}
              </small>
            )}
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
            <MoneyInput
              aria-label={field}
              valueCents={receipt[field]}
              onValueCentsChange={(value) => updateMoney(field, value)}
            />
          </label>
        ))}
      </div>
      <p className="math-note">
        Items {formatMoney(receipt.items.reduce((sum, item) => sum + getItemTotalCents(item), 0))} ·
        Everything remains editable.
      </p>
    </section>
  );
}
