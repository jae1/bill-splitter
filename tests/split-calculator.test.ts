import { describe, expect, it } from "vitest";
import { calculateSplit } from "../src/domain/splitCalculator";
import type { Participant, Receipt } from "../src/domain/types";

const people: Participant[] = [
  { id: "a", name: "Alex", venmoHandle: "@alex" },
  { id: "b", name: "Sam", zelleRecipient: "sam@example.com" },
];

const receipt: Receipt = {
  merchantName: "Test",
  items: [
    { id: "1", name: "Soup", priceCents: 1001, participantIds: ["a", "b"] },
    { id: "2", name: "Tea", priceCents: 500, participantIds: ["a"] },
  ],
  taxCents: 121,
  tipCents: 300,
  totalCents: 1922,
};

describe("calculateSplit", () => {
  it("reconciles shared items and adjustments to the cent", () => {
    const result = calculateSplit(receipt, people);
    expect(result.reconciled).toBe(true);
    expect(result.totals.reduce((sum, person) => sum + person.totalCents, 0)).toBe(1922);
  });

  it("blocks reconciliation for unassigned items", () => {
    const result = calculateSplit({ ...receipt, items: [{ ...receipt.items[0], participantIds: [] }] }, people);
    expect(result.reconciled).toBe(false);
    expect(result.unassignedItemIds).toEqual(["1"]);
  });
});

describe("advanced split modes", () => {
  it("allocates purchased units without duplicating the item", () => {
    const result = calculateSplit({
      ...receipt,
      items: [{
        id: "units",
        name: "Taco",
        priceCents: 1800,
        quantity: 3,
        unitPriceCents: 600,
        quantityAssignments: { a: 1, b: 2 },
        participantIds: ["a", "b"],
      }],
      taxCents: 0,
      tipCents: 0,
      totalCents: 1800,
    }, people);
    expect(result.totals.map((total) => total.totalCents)).toEqual([600, 1200]);
    expect(result.reconciled).toBe(true);
  });


  it("treats purchased quantity prices as line totals by default", () => {
    const result = calculateSplit({
      ...receipt,
      items: [{
        id: "line-total",
        name: "Slider",
        priceCents: 1200,
        quantity: 3,
        priceEntryMode: "lineTotal",
        quantityAssignments: { a: 1, b: 2 },
        participantIds: ["a", "b"],
      }],
      taxCents: 0,
      tipCents: 0,
      totalCents: 1200,
    }, people);
    expect(result.totals.map((total) => total.totalCents)).toEqual([400, 800]);
    expect(result.reconciled).toBe(true);
  });

  it("multiplies purchased quantity when the entered price is per item", () => {
    const result = calculateSplit({
      ...receipt,
      items: [{
        id: "unit-price",
        name: "Slider",
        priceCents: 1200,
        quantity: 3,
        priceEntryMode: "unitPrice",
        quantityAssignments: { a: 1, b: 2 },
        participantIds: ["a", "b"],
      }],
      taxCents: 0,
      tipCents: 0,
      totalCents: 3600,
    }, people);
    expect(result.totals.map((total) => total.totalCents)).toEqual([1200, 2400]);
    expect(result.reconciled).toBe(true);
  });

  it("rejects incomplete purchased-unit assignments", () => {
    const result = calculateSplit({
      ...receipt,
      items: [{
        id: "units",
        name: "Taco",
        priceCents: 1800,
        quantity: 3,
        quantityAssignments: { a: 1, b: 1 },
        participantIds: ["a", "b"],
      }],
      taxCents: 0,
      tipCents: 0,
      totalCents: 1800,
    }, people);
    expect(result.invalidItemIds).toContain("units");
    expect(result.reconciled).toBe(false);
  });

  it("allocates quantity shares", () => {
    const result = calculateSplit({
      ...receipt,
      items: [{
        id: "q",
        name: "Tacos",
        priceCents: 1200,
        participantIds: ["a", "b"],
        splitMode: "quantity",
        shares: { a: 1, b: 2 },
      }],
      taxCents: 0,
      tipCents: 0,
      totalCents: 1200,
    }, people);
    expect(result.totals.map((total) => total.totalCents)).toEqual([400, 800]);
  });

  it("rejects percentages that do not total 100", () => {
    const result = calculateSplit({
      ...receipt,
      items: [{
        id: "p",
        name: "Pizza",
        priceCents: 1000,
        participantIds: ["a", "b"],
        splitMode: "percentage",
        shares: { a: 40, b: 40 },
      }],
      taxCents: 0,
      tipCents: 0,
      totalCents: 1000,
    }, people);
    expect(result.invalidItemIds).toEqual(["p"]);
    expect(result.reconciled).toBe(false);
  });
});
