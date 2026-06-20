import { describe, expect, it } from "vitest";
import { decodeShareSnapshot, encodeShareSnapshot } from "../src/services/shareSnapshot";
import type { SplitState } from "../src/domain/types";

describe("share snapshots", () => {
  it("round trips a split without a server", () => {
    const state: SplitState = {
      receipt: {
        merchantName: "Cafe",
        items: [{ id: "1", name: "Coffee", priceCents: 500, participantIds: ["a"] }],
        taxCents: 0,
        tipCents: 0,
        totalCents: 500,
      },
      participants: [{ id: "a", name: "Alex" }],
    };
    const encoded = encodeShareSnapshot(state);
    expect(decodeShareSnapshot(`#share=${encoded}`)).toEqual(state);
  });
});
