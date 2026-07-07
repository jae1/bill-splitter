import { useEffect, useRef, useState } from "react";
import { parseMoney } from "../domain/splitCalculator";

type Props = {
  valueCents: number;
  onValueCentsChange: (value: number) => void;
  "aria-label": string;
  className?: string;
};

const formatDraft = (cents: number) => (cents ? (cents / 100).toFixed(2) : "");

export function MoneyInput({ valueCents, onValueCentsChange, className, "aria-label": ariaLabel }: Props) {
  const [draft, setDraft] = useState(() => formatDraft(valueCents));
  const draftRef = useRef(draft);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (!editing) {
      const nextDraft = formatDraft(valueCents);
      draftRef.current = nextDraft;
      setDraft(nextDraft);
    }
  }, [valueCents]);

  const commit = (nextDraft: string) => {
    const cents = parseMoney(nextDraft);
    onValueCentsChange(cents);
    const formatted = formatDraft(cents);
    draftRef.current = formatted;
    setDraft(formatted);
    setEditing(false);
  };

  return (
    <input
      className={className}
      aria-label={ariaLabel}
      type="text"
      inputMode="decimal"
      autoComplete="off"
      value={draft}
      placeholder="0.00"
      onFocus={() => setEditing(true)}
      onChange={(event) => {
        const nextDraft = event.target.value.replace(/[^\d.,-]/g, "");
        draftRef.current = nextDraft;
        setDraft(nextDraft);
        onValueCentsChange(parseMoney(nextDraft));
      }}
      onBlur={() => commit(draftRef.current)}
      onKeyDown={(event) => {
        if (event.key === "Enter") event.currentTarget.blur();
      }}
    />
  );
}
