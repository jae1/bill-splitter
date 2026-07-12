import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SplitSummary } from "../src/components/SplitSummary";

describe("SplitSummary", () => {
  it("keeps internal rounding out of the participant-facing summary", () => {
    render(
      <SplitSummary
        merchant="Test"
        totals={[{
          participant: { id: "a", name: "Alex" },
          subtotalCents: 1000,
          taxCents: 80,
          tipCents: 200,
          roundingCents: 1,
          totalCents: 1281,
        }]}
        unassignedCount={0}
        invalidCount={0}
        differenceCents={0}
        reconciled
        savedLabel="Saved"
        onShare={vi.fn()}
        onReset={vi.fn()}
      />,
    );

    expect(screen.getByText("$12.81")).toBeTruthy();
    expect(screen.getByText("All set")).toBeTruthy();
    expect(screen.queryByText("Rounding")).toBeNull();
  });

  it("uses a plain-language review status", () => {
    render(
      <SplitSummary
        merchant="Test"
        totals={[]}
        unassignedCount={1}
        invalidCount={0}
        differenceCents={1000}
        reconciled={false}
        savedLabel="Saved"
        onShare={vi.fn()}
        onReset={vi.fn()}
      />,
    );

    expect(screen.getByText("Needs review")).toBeTruthy();
    expect(screen.queryByText("Reconciled")).toBeNull();
  });
});
