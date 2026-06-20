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
