import type { Participant, Receipt } from "../domain/types";
import { formatMoney, getItemQuantity, getItemTotalCents, getItemUnitPriceCents } from "../domain/splitCalculator";

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
      item.participantIds.includes(participant.id) || (item.quantityAssignments?.[participant.id] ?? 0) > 0,
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
      items: receipt.items.map((item) => {
        const quantityAssignments = { ...item.quantityAssignments };
        delete quantityAssignments[participant.id];
        return {
          ...item,
          participantIds: item.participantIds.filter((id) => id !== participant.id),
          quantityAssignments,
        };
      }),
    });
  };

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
          <p>Use − and + to set each person's share of an item.</p>
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
        {receipt.items.map((item) => {
          const assignedUnits = participants
            .reduce((sum, participant) => sum + (item.quantityAssignments?.[participant.id] ?? 0), 0);
          const orderedQuantity = getItemQuantity(item);
          return (
          <article className={`assignment-card ${item.participantIds.length ? "" : "unassigned"}`} key={item.id}>
            <div>
              <strong>{item.name}</strong>
              <span>
                {getItemQuantity(item) > 1 && `${getItemQuantity(item)} × ${formatMoney(getItemUnitPriceCents(item))} · `}
                {formatMoney(getItemTotalCents(item))}
              </span>
            </div>
            <div className="participant-picker" aria-label={`Assign ${item.name || "item"}`}>
              {participants.map((person) => (
                <div
                  className={`share-control ${(item.quantityAssignments?.[person.id] ?? 0) > 0 ? "selected" : ""}`}
                  key={person.id}
                >
                  <span className="share-person">{person.name || "Unnamed"}</span>
                  <span className="share-stepper">
                    <button
                      aria-label={`Give ${person.name} less of ${item.name}`}
                      onClick={() => updateUnitAssignment(
                        item.id,
                        person.id,
                        (item.quantityAssignments?.[person.id] ?? 0) - 1,
                      )}
                    >−</button>
                    <b>{item.quantityAssignments?.[person.id] ?? 0}</b>
                    <button
                      aria-label={`Give ${person.name} more of ${item.name}`}
                      onClick={() => updateUnitAssignment(
                        item.id,
                        person.id,
                        (item.quantityAssignments?.[person.id] ?? 0) + 1,
                      )}
                    >+</button>
                  </span>
                </div>
              ))}
            </div>
            <div className="assignment-progress">
              {assignedUnits === 0
                ? "No one selected yet"
                : `Split into ${assignedUnits} share${assignedUnits === 1 ? "" : "s"}`}
              {orderedQuantity > 1 && ` · receipt says ${orderedQuantity} ordered`}
              </div>
            {!item.participantIds.length && <small className="assignment-warning">Needs someone</small>}
          </article>
          );
        })}
      </div>
    </section>
  );
}
