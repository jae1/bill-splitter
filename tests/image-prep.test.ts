import { describe, expect, it } from "vitest";
import { cropDimensions } from "../src/services/receiptExtraction";

describe("receipt image preparation", () => {
  it("calculates crop and rotated output dimensions", () => {
    const dimensions = cropDimensions(1000, 2000, {
      rotation: 90,
      cropTop: 0.1,
      cropRight: 0.1,
      cropBottom: 0.2,
      cropLeft: 0.1,
    });
    expect(dimensions.sourceWidth).toBe(800);
    expect(dimensions.sourceHeight).toBe(1400);
    expect(dimensions.outputWidth).toBe(1400);
    expect(dimensions.outputHeight).toBe(800);
  });
});
