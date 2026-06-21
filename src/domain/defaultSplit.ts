import type { SplitState } from "./types";

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
