import { beforeEach, describe, expect, it } from "vitest";
import { clearLocalSplit, loadLocalSplit, saveLocalSplit } from "../src/services/localSplitStorage";
import type { SplitState } from "../src/domain/types";

describe("local split storage", () => {
  const memory = new Map<string, string>();

  beforeEach(() => {
    memory.clear();
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: {
        getItem: (key: string) => memory.get(key) ?? null,
        setItem: (key: string, value: string) => memory.set(key, value),
        removeItem: (key: string) => memory.delete(key),
        clear: () => memory.clear(),
      },
    });
  });

  it("saves, restores, and clears the active split", () => {
    const state: SplitState = {
      receipt: {
        merchantName: "Local Cafe",
        items: [],
        taxCents: 0,
        tipCents: 0,
        totalCents: 0,
      },
      participants: [{ id: "a", name: "Alex" }],
    };
    saveLocalSplit(state);
    expect(loadLocalSplit()).toEqual(state);
    clearLocalSplit();
    expect(loadLocalSplit()).toBeNull();
  });
});
