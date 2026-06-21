import { describe, expect, it } from "vitest";
import { parseItemQuantity, parseReceiptText } from "../src/services/receiptExtraction";

describe("receipt text parsing", () => {
  it("extracts item lines, tax, tip, and total", () => {
    const result = parseReceiptText(`
      CORNER CAFE
      Burger 12.50
      Fries 4.00
      Tax 1.49
      Tip 3.01
      Total 21.00
    `);
    expect(result.receipt.merchantName).toBe("CORNER CAFE");
    expect(result.receipt.items.map((item) => item.name)).toEqual(["Burger", "Fries"]);
    expect(result.receipt.taxCents).toBe(149);
    expect(result.receipt.tipCents).toBe(301);
    expect(result.receipt.totalCents).toBe(2100);
  });

  it("recovers common receipt OCR punctuation errors", () => {
    const result = parseReceiptText(`
      NIGHT OWL DINER
      2 x Tacos .... 12 50
      Soda _____ 3,00
      TAX 1.4O
      TOTAL 16.9O
    `);
    expect(result.receipt.items.map((item) => item.name)).toEqual(["Tacos", "Soda"]);
    expect(result.receipt.items.map((item) => item.priceCents)).toEqual([1250, 300]);
    expect(result.receipt.taxCents).toBe(140);
    expect(result.receipt.totalCents).toBe(1690);
    expect(result.receipt.items[0].quantity).toBe(2);
    expect(result.receipt.items[0].unitPriceCents).toBe(625);
  });

  it("recognizes leading and trailing quantity formats", () => {
    expect(parseItemQuantity("3x Taco")).toEqual({ quantity: 3, name: "Taco" });
    expect(parseItemQuantity("Taco x3")).toEqual({ quantity: 3, name: "Taco" });
    expect(parseItemQuantity("3 Taco")).toEqual({ quantity: 3, name: "Taco" });
  });
});
