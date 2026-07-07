import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MoneyInput } from "../src/components/MoneyInput";

describe("MoneyInput", () => {
  it("keeps in-progress decimal text while updating cents", () => {
    const onChange = vi.fn();
    render(<MoneyInput aria-label="price" valueCents={0} onValueCentsChange={onChange} />);

    const input = screen.getByLabelText("price") as HTMLInputElement;
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "8." } });

    expect(input.value).toBe("8.");
    expect(onChange).toHaveBeenLastCalledWith(800);
  });

  it("accepts leading-decimal cents on mobile-style input", () => {
    const onChange = vi.fn();
    render(<MoneyInput aria-label="tax" valueCents={0} onValueCentsChange={onChange} />);

    const input = screen.getByLabelText("tax") as HTMLInputElement;
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: ".75" } });
    fireEvent.blur(input);

    expect(onChange).toHaveBeenLastCalledWith(75);
    expect(input.value).toBe("0.75");
    expect(input.type).toBe("text");
    expect(input.inputMode).toBe("decimal");
  });
});
