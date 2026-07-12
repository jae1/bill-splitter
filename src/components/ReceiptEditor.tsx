import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { formatMoney, getItemTotalCents, getItemUnitPriceCents } from "../domain/splitCalculator";
import type { Receipt } from "../domain/types";
import { createBlankItem } from "../domain/defaultSplit";
import {
  defaultReceiptImageOptions,
  transformReceiptImage,
  type ReceiptImageOptions,
} from "../services/receiptExtraction";
import { MoneyInput } from "./MoneyInput";


const getAutoReceiptTotalCents = (receipt: Receipt) =>
  receipt.items.reduce((sum, item) => sum + getItemTotalCents(item), 0) + receipt.taxCents + receipt.tipCents;

const withAutoReceiptTotal = (receipt: Receipt): Receipt =>
  (receipt.totalMode ?? "auto") === "auto"
    ? { ...receipt, totalCents: getAutoReceiptTotalCents(receipt), totalMode: "auto" }
    : receipt;

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
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string>();
  const videoRef = useRef<HTMLVideoElement>(null);

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

  useEffect(() => {
    if (!cameraOpen) return;
    let cancelled = false;
    let activeStream: MediaStream | undefined;
    setCameraReady(false);
    setCameraError(undefined);

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError("Live camera is not supported on this device. Choose an existing photo instead.");
      return;
    }

    void navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: "environment" } },
      audio: false,
    }).then((stream) => {
      if (cancelled) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      activeStream = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    }).catch(() => {
      if (!cancelled) {
        setCameraError("Camera access was unavailable. Allow camera access or choose an existing photo.");
      }
    });

    return () => {
      cancelled = true;
      activeStream?.getTracks().forEach((track) => track.stop());
    };
  }, [cameraOpen]);

  const selectSourceFile = (file: File) => {
    setSourceFile(file);
    setImageOptions(defaultReceiptImageOptions);
  };
  const updateItem = (id: string, field: "name" | "priceCents", value: string | number) => {
    onReceiptChange(withAutoReceiptTotal({
      ...receipt,
      items: receipt.items.map((item) => {
        if (item.id !== id) return item;
        if (field === "priceCents") {
          const nextItem = { ...item, priceCents: Number(value) };
          return { ...nextItem, unitPriceCents: getItemUnitPriceCents(nextItem) };
        }
        return { ...item, name: String(value) };
      }),
    }));
  };

  const updateQuantity = (id: string, quantity: number) =>
    onReceiptChange(withAutoReceiptTotal({
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
    }));

  const updatePriceEntryMode = (id: string, priceEntryMode: "lineTotal" | "unitPrice") =>
    onReceiptChange(withAutoReceiptTotal({
      ...receipt,
      items: receipt.items.map((item) => {
        if (item.id !== id) return item;
        const nextItem = { ...item, priceEntryMode };
        return { ...nextItem, unitPriceCents: getItemUnitPriceCents(nextItem) };
      }),
    }));

  const updateMoney = (field: "taxCents" | "tipCents" | "totalCents", value: number) => {
    const nextReceipt = field === "totalCents"
      ? { ...receipt, totalCents: value, totalMode: "manual" as const }
      : withAutoReceiptTotal({ ...receipt, [field]: value });
    onReceiptChange(nextReceipt);
  };

  const useAutoTotal = () =>
    onReceiptChange(withAutoReceiptTotal({ ...receipt, totalMode: "auto" }));

  const handleFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    selectSourceFile(file);
  };

  const captureReceipt = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) {
      setCameraError("Camera is still starting. Try again in a moment.");
      return;
    }
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    if (!context) {
      setCameraError("Couldn’t capture the photo. Choose an existing photo instead.");
      return;
    }
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (!blob) {
        setCameraError("Couldn’t capture the photo. Try again.");
        return;
      }
      selectSourceFile(new File([blob], `receipt-${Date.now()}.jpg`, { type: "image/jpeg" }));
      setCameraOpen(false);
    }, "image/jpeg", 0.92);
  };

  const updateCrop = (field: keyof ReceiptImageOptions, percent: number) =>
    setImageOptions((current) => ({ ...current, [field]: percent / 100 }));

  const addItem = () =>
    onReceiptChange(withAutoReceiptTotal({ ...receipt, items: [...receipt.items, createBlankItem()] }));

  const removeItem = (id: string) =>
    onReceiptChange(withAutoReceiptTotal({ ...receipt, items: receipt.items.filter((item) => item.id !== id) }));

  const duplicateItem = (id: string) => {
    const index = receipt.items.findIndex((item) => item.id === id);
    if (index < 0) return;
    const copy = { ...receipt.items[index], id: crypto.randomUUID(), participantIds: [] };
    const items = [...receipt.items];
    items.splice(index + 1, 0, copy);
    onReceiptChange(withAutoReceiptTotal({ ...receipt, items }));
  };

  return (
    <section className="panel receipt-panel" aria-labelledby="receipt-title">
      <div className="section-heading">
        <div>
          <span className="eyebrow">Step 1</span>
          <h2 id="receipt-title">Check the receipt</h2>
          <p>Enter items yourself, or prepare a clean photo for an OCR draft.</p>
        </div>
        <div className="receipt-photo-actions">
          <button className="upload-button" type="button" onClick={() => setCameraOpen(true)}>
            {sourceFile ? "Take another photo" : "Take photo"}
          </button>
          <label className="upload-button">
            <input
              type="file"
              accept="image/*"
              aria-label="Choose an existing receipt photo"
              onChange={handleFile}
            />
            {sourceFile ? "Choose another photo" : "Choose existing photo"}
          </label>
        </div>
      </div>

      {cameraOpen && (
        <div className="camera-dialog" role="dialog" aria-modal="true" aria-labelledby="camera-title">
          <div className="camera-sheet">
            <div className="camera-heading">
              <div>
                <span className="eyebrow">Receipt camera</span>
                <h2 id="camera-title">Fit the receipt inside the frame</h2>
              </div>
              <button className="camera-close" type="button" aria-label="Close camera" onClick={() => setCameraOpen(false)}>×</button>
            </div>
            <div className="camera-viewfinder">
              {!cameraError && (
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  onLoadedMetadata={() => setCameraReady(true)}
                />
              )}
              <div className="receipt-guide" aria-hidden="true">
                <i /><i /><i /><i />
              </div>
              {!cameraReady && !cameraError && <p className="camera-message">Starting camera…</p>}
              {cameraError && <p className="camera-message camera-error">{cameraError}</p>}
            </div>
            <div className="camera-tips">
              <span>Keep all four corners visible</span>
              <span>Avoid shadows and glare</span>
              <span>Hold your phone steady</span>
            </div>
            <div className="camera-actions">
              <button className="secondary-button" type="button" onClick={() => setCameraOpen(false)}>Cancel</button>
              <button className="camera-shutter" type="button" disabled={!cameraReady || !!cameraError} onClick={captureReceipt}>
                <span aria-hidden="true" />
                <b>Capture receipt</b>
              </button>
            </div>
          </div>
        </div>
      )}

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
          <div className={`receipt-row ${item.confidence && item.confidence < 0.85 ? "needs-review" : ""}`} key={item.id}>
            <input
              aria-label={`${item.name || `item ${index + 1}`} name`}
              placeholder="Item name"
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
            <div className="price-mode-field" role="group" aria-label={`${item.name || `item ${index + 1}`} price type`}>
              <span>Price is</span>
              <div className="segmented-toggle">
                <button
                  type="button"
                  className={(item.priceEntryMode ?? "lineTotal") === "lineTotal" ? "active" : ""}
                  aria-pressed={(item.priceEntryMode ?? "lineTotal") === "lineTotal"}
                  onClick={() => updatePriceEntryMode(item.id, "lineTotal")}
                >
                  Total
                </button>
                <button
                  type="button"
                  className={(item.priceEntryMode ?? "lineTotal") === "unitPrice" ? "active" : ""}
                  aria-pressed={(item.priceEntryMode ?? "lineTotal") === "unitPrice"}
                  onClick={() => updatePriceEntryMode(item.id, "unitPrice")}
                >
                  Each
                </button>
              </div>
            </div>
            <div className="receipt-row-meta">
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
          </div>
        ))}
      </div>
      <button className="add-item-button" onClick={addItem}>+ Add item manually</button>

      <div className="receipt-totals">
        {(["taxCents", "tipCents", "totalCents"] as const).map((field) => (
          <label key={field}>
            <span>
              {field === "taxCents" ? "Tax" : field === "tipCents" ? "Tip" : "Receipt total"}
              {field === "totalCents" && <small>{(receipt.totalMode ?? "auto") === "auto" ? "Auto" : "Manual"}</small>}
            </span>
            <MoneyInput
              aria-label={field}
              valueCents={receipt[field]}
              onValueCentsChange={(value) => updateMoney(field, value)}
            />
            {field === "totalCents" && (receipt.totalMode ?? "auto") === "manual" && (
              <button type="button" className="inline-link-button" onClick={useAutoTotal}>Use auto</button>
            )}
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
