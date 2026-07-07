import type { ReceiptItem, SplitState } from "./types";

export function createBlankItem(): ReceiptItem {
  return {
    id: crypto.randomUUID(),
    name: "",
    priceCents: 0,
    priceEntryMode: "lineTotal",
    quantity: 1,
    unitPriceCents: 0,
    quantityAssignments: {},
    participantIds: [],
  };
}

export function createBlankSplit(): SplitState {
  return {
    receipt: {
      merchantName: "",
      items: [],
      taxCents: 0,
      tipCents: 0,
      totalCents: 0,
    },
    participants: [],
  };
}
