import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ReceiptEditor } from "../src/components/ReceiptEditor";

const renderEditor = () => render(
  <ReceiptEditor
    receipt={{ merchantName: "", items: [], taxCents: 0, tipCents: 0, totalCents: 0 }}
    extracting={false}
    extractionProgress={0}
    extractionMessage=""
    hasPendingDraft={false}
    onApplyDraft={vi.fn()}
    onDiscardDraft={vi.fn()}
    onReceiptChange={vi.fn()}
    onUpload={vi.fn()}
  />,
);

afterEach(cleanup);

describe("receipt photo inputs", () => {
  it("offers an in-app camera and an existing photo picker", () => {
    renderEditor();

    const existingPhotoInput = screen.getByLabelText("Choose an existing receipt photo");

    expect(screen.getByRole("button", { name: "Take photo" })).toBeTruthy();
    expect(existingPhotoInput.getAttribute("accept")).toBe("image/*");
    expect(existingPhotoInput.getAttribute("capture")).toBeNull();
  });

  it("opens the rear camera with receipt framing guidance", async () => {
    const stop = vi.fn();
    const getUserMedia = vi.fn().mockResolvedValue({ getTracks: () => [{ stop }] });
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: { getUserMedia },
    });
    renderEditor();

    fireEvent.click(screen.getByRole("button", { name: "Take photo" }));

    expect(screen.getByRole("dialog", { name: "Fit the receipt inside the frame" })).toBeTruthy();
    expect(screen.getByText("Keep all four corners visible")).toBeTruthy();
    expect(screen.getByText("Avoid shadows and glare")).toBeTruthy();
    await waitFor(() => expect(getUserMedia).toHaveBeenCalledWith({
      video: { facingMode: { ideal: "environment" } },
      audio: false,
    }));
  });
});
