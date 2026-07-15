import { describe, expect, it } from "vitest";
import { calculateSplit } from "../src/domain/splitCalculator";
import type { Participant, Receipt } from "../src/domain/types";

function removeParticipant(receipt: Receipt, participants: Participant[], participantId: string) {
  return {
    participants: participants.filter((person) => person.id !== participantId),
    receipt: {
      ...receipt,
      items: receipt.items.map((item) => ({
        ...item,
        participantIds: item.participantIds.filter((id) => id !== participantId),
        quantityAssignments: Object.fromEntries(
          Object.entries(item.quantityAssignments ?? {}).filter(([id]) => id !== participantId),
        ),
      })),
    },
  };
}

describe("participant removal", () => {
  it("removes stale item assignments with the participant", () => {
    const result = removeParticipant(
      {
        merchantName: "Test",
        items: [{ id: "item", name: "Pizza", priceCents: 2000, participantIds: ["a", "b"] }],
        taxCents: 0,
        tipCents: 0,
        totalCents: 2000,
      },
      [{ id: "a", name: "Alex" }, { id: "b", name: "Bea" }],
      "b",
    );

    expect(result.participants.map((person) => person.id)).toEqual(["a"]);
    expect(result.receipt.items[0].participantIds).toEqual(["a"]);
  });

  it("removes stale quantity assignments with the participant", () => {
    const result = removeParticipant(
      {
        merchantName: "Test",
        items: [{
          id: "item",
          name: "Dumplings",
          priceCents: 2000,
          quantity: 2,
          participantIds: ["a", "b"],
          quantityAssignments: { a: 1, b: 1 },
        }],
        taxCents: 0,
        tipCents: 0,
        totalCents: 2000,
      },
      [{ id: "a", name: "Alex" }, { id: "b", name: "Bea" }],
      "b",
    );

    expect(result.receipt.items[0].quantityAssignments).toEqual({ a: 1 });
  });

  it("does not treat stale quantity assignments as visible participant allocations", () => {
    const result = calculateSplit(
      {
        merchantName: "Test",
        items: [{
          id: "item",
          name: "Dumplings",
          priceCents: 2000,
          quantity: 2,
          participantIds: [],
          quantityAssignments: { removed: 1 },
        }],
        taxCents: 0,
        tipCents: 0,
        totalCents: 2000,
      },
      [{ id: "a", name: "Alex" }],
    );

    expect(result.unassignedItemIds).toEqual(["item"]);
    expect(result.reconciled).toBe(false);
  });
});
