import type { ReceiptItem, SplitState } from "./types";

export function createBlankItem(): ReceiptItem {
  return {
    id: crypto.randomUUID(),
    name: "",
    priceCents: 0,
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
