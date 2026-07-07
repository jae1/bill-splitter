import type { Participant, Receipt } from "../domain/types";
import { formatMoney } from "../domain/splitCalculator";
import { MoneyInput } from "./MoneyInput";

type Props = {
  receipt: Receipt;
  participants: Participant[];
  onReceiptChange: (receipt: Receipt) => void;
  onParticipantsChange: (participants: Participant[]) => void;
};

export function AssignmentBoard({
  receipt,
  participants,
  onReceiptChange,
  onParticipantsChange,
}: Props) {
  const addPerson = () =>
    onParticipantsChange([
      ...participants,
      { id: crypto.randomUUID(), name: `Guest ${participants.length + 1}` },
    ]);

  const removePerson = (participant: Participant) => {
    if (participants.length === 1) return;
    const assignedCount = receipt.items.filter((item) =>
      item.participantIds.includes(participant.id),
    ).length;
    if (
      assignedCount > 0 &&
      !window.confirm(
        `Remove ${participant.name}? They will also be removed from ${assignedCount} assigned item${
          assignedCount === 1 ? "" : "s"
        }.`,
      )
    ) {
      return;
    }
    onParticipantsChange(participants.filter((person) => person.id !== participant.id));
    onReceiptChange({
      ...receipt,
      items: receipt.items.map((item) => ({
        ...item,
        participantIds: item.participantIds.filter((id) => id !== participant.id),
      })),
    });
  };

  const toggleAssignment = (itemId: string, participantId: string) =>
    onReceiptChange({
      ...receipt,
      items: receipt.items.map((item) =>
        item.id === itemId
          ? (() => {
              const selected = item.participantIds.includes(participantId);
              const participantIds = selected
                ? item.participantIds.filter((id) => id !== participantId)
                : [...item.participantIds, participantId];
              const shares = { ...item.shares };
              if (selected) delete shares[participantId];
              else if ((item.splitMode ?? "equal") === "quantity") shares[participantId] = 1;
              return { ...item, participantIds, shares };
            })()
          : item,
      ),
    });

  const updateSplitMode = (itemId: string, splitMode: "equal" | "quantity" | "percentage" | "fixed") =>
    onReceiptChange({
      ...receipt,
      items: receipt.items.map((item) => {
        if (item.id !== itemId) return item;
        const count = item.participantIds.length;
        const shares: Record<string, number> = {};
        item.participantIds.forEach((id, index) => {
          if (splitMode === "quantity") shares[id] = 1;
          if (splitMode === "percentage") shares[id] = Math.floor(100 / count) + (index < 100 % count ? 1 : 0);
          if (splitMode === "fixed") shares[id] = Math.floor(item.priceCents / count) + (index < item.priceCents % count ? 1 : 0);
        });
        return { ...item, splitMode, shares };
      }),
    });

  const updateShare = (itemId: string, participantId: string, value: number) =>
    onReceiptChange({
      ...receipt,
      items: receipt.items.map((item) =>
        item.id === itemId ? { ...item, shares: { ...item.shares, [participantId]: value } } : item,
      ),
    });

  const updateUnitAssignment = (itemId: string, participantId: string, units: number) =>
    onReceiptChange({
      ...receipt,
      items: receipt.items.map((item) => {
        if (item.id !== itemId) return item;
        const quantityAssignments = {
          ...item.quantityAssignments,
          [participantId]: Math.max(0, Math.round(units)),
        };
        const participantIds = Object.entries(quantityAssignments)
          .filter(([, count]) => count > 0)
          .map(([id]) => id);
        return { ...item, quantityAssignments, participantIds };
      }),
    });

  return (
    <section className="panel" aria-labelledby="assign-title">
      <div className="section-heading">
        <div>
          <span className="eyebrow">Step 2</span>
          <h2 id="assign-title">Who had what?</h2>
          <p>Tap everyone who shared an item. We split shared plates evenly.</p>
        </div>
        <button className="secondary-button" onClick={addPerson}>+ Add person</button>
      </div>

      <div className="people-editor">
        {participants.length === 0 && (
          <p className="empty-state">No people yet. Add the first person to start assigning items.</p>
        )}
        {participants.map((person, index) => (
          <div className="person-input" key={person.id}>
            <span style={{ background: `var(--avatar-${(index % 4) + 1})` }}>
              {person.name.slice(0, 1)}
            </span>
            <input
              aria-label={`Participant ${index + 1}`}
              value={person.name}
              onChange={(event) =>
                onParticipantsChange(
                  participants.map((candidate) =>
                    candidate.id === person.id ? { ...candidate, name: event.target.value } : candidate,
                  ),
                )
              }
            />
            <button
              className="remove-person"
              aria-label={`Remove ${person.name}`}
              title={participants.length === 1 ? "At least one participant is required" : `Remove ${person.name}`}
              disabled={participants.length === 1}
              onClick={() => removePerson(person)}
            >
              ×
            </button>
          </div>
        ))}
      </div>

      <div className="assignment-list">
        {receipt.items.map((item) => (
          <article className={`assignment-card ${item.participantIds.length ? "" : "unassigned"}`} key={item.id}>
            <div>
              <strong>{item.name}</strong>
              <span>
                {(item.quantity ?? 1) > 1 && `${item.quantity} × ${formatMoney(item.unitPriceCents ?? Math.round(item.priceCents / (item.quantity ?? 1)))} · `}
                {formatMoney(item.priceCents)}
              </span>
            </div>
            {(item.quantity ?? 1) === 1 && <div className="assignment-buttons" aria-label={`Assign ${item.name}`}>
              {participants.map((person) => (
                <button
                  key={person.id}
                  className={item.participantIds.includes(person.id) ? "selected" : ""}
                  aria-pressed={item.participantIds.includes(person.id)}
                  onClick={() => toggleAssignment(item.id, person.id)}
                >
                  {person.name.slice(0, 1)}
                </button>
              ))}
            </div>}
            {(item.quantity ?? 1) > 1 && (
              <div className="unit-assignment">
                {participants.map((person) => (
                  <label key={person.id}>
                    <span>{person.name}</span>
                    <button
                      aria-label={`Remove one ${item.name} from ${person.name}`}
                      onClick={() => updateUnitAssignment(
                        item.id,
                        person.id,
                        (item.quantityAssignments?.[person.id] ?? 0) - 1,
                      )}
                    >−</button>
                    <b>{item.quantityAssignments?.[person.id] ?? 0}</b>
                    <button
                      aria-label={`Add one ${item.name} to ${person.name}`}
                      onClick={() => updateUnitAssignment(
                        item.id,
                        person.id,
                        (item.quantityAssignments?.[person.id] ?? 0) + 1,
                      )}
                    >+</button>
                  </label>
                ))}
                <small>
                  Assigned {Object.values(item.quantityAssignments ?? {}).reduce((sum, units) => sum + units, 0)}
                  {" / "}{item.quantity}
                </small>
              </div>
            )}
            {(item.quantity ?? 1) === 1 && item.participantIds.length > 1 && (
              <div className="split-editor">
                <label>
                  Split
                  <select
                    value={item.splitMode ?? "equal"}
                    onChange={(event) =>
                      updateSplitMode(
                        item.id,
                        event.target.value as "equal" | "quantity" | "percentage" | "fixed",
                      )
                    }
                  >
                    <option value="equal">Equally</option>
                    <option value="quantity">By weight</option>
                    <option value="percentage">By percentage</option>
                    <option value="fixed">Exact amounts</option>
                  </select>
                </label>
                {(item.splitMode ?? "equal") !== "equal" && (
                  <div className="share-inputs">
                    {item.participantIds.map((id) => {
                      const person = participants.find((candidate) => candidate.id === id);
                      const mode = item.splitMode ?? "equal";
                      const divisor = mode === "fixed" ? 100 : 1;
                      return (
                        <label key={id}>
                          <span>{person?.name}</span>
                          {mode === "fixed" ? (
                            <MoneyInput
                              aria-label={`${person?.name ?? "Participant"} exact amount`}
                              valueCents={item.shares?.[id] ?? 0}
                              onValueCentsChange={(value) => updateShare(item.id, id, value)}
                            />
                          ) : (
                            <input
                              type="number"
                              inputMode="numeric"
                              min={mode === "quantity" ? 1 : 0}
                              step="1"
                              value={item.shares?.[id] ?? 0}
                              onChange={(event) => updateShare(item.id, id, Math.round(Number(event.target.value)))}
                            />
                          )}
                          <small>{mode === "percentage" ? "%" : mode === "fixed" ? "$" : "×"}</small>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
            {!item.participantIds.length && <small>Needs someone</small>}
          </article>
        ))}
      </div>
    </section>
  );
}
