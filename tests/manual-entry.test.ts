import { describe, expect, it } from "vitest";
import { createBlankItem } from "../src/domain/defaultSplit";

describe("manual receipt entry", () => {
  it("creates independent blank item rows", () => {
    const first = createBlankItem();
    const second = createBlankItem();
    expect(first.id).not.toBe(second.id);
    expect(first.name).toBe("");
    expect(first.priceCents).toBe(0);
    expect(first.participantIds).toEqual([]);
  });
});
