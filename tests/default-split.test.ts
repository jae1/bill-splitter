import { describe, expect, it } from "vitest";
import { createBlankSplit } from "../src/domain/defaultSplit";

describe("blank split", () => {
  it("starts without receipt content or participants", () => {
    const state = createBlankSplit();
    expect(state.receipt.merchantName).toBe("");
    expect(state.receipt.items).toEqual([]);
    expect(state.receipt.totalCents).toBe(0);
    expect(state.receipt.totalMode).toBe("auto");
    expect(state.participants).toEqual([]);
  });
});
