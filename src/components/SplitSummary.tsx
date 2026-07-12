import type { ParticipantTotal } from "../domain/types";
import { formatMoney } from "../domain/splitCalculator";

type Props = {
  merchant: string;
  totals: ParticipantTotal[];
  unassignedCount: number;
  invalidCount: number;
  differenceCents: number;
  reconciled: boolean;
  savedLabel: string;
  onShare: () => void;
  onReset: () => void;
  selectedParticipantId?: string;
};

export function SplitSummary({
  totals,
  invalidCount,
  differenceCents,
  reconciled,
  savedLabel,
  onShare,
  onReset,
  selectedParticipantId,
}: Props) {
  return (
    <section className="panel summary-panel" aria-labelledby="summary-title">
      <div className="section-heading">
        <div>
          <span className="eyebrow">Step 3</span>
          <h2 id="summary-title">Review the split</h2>
          <p>Every dollar has a visible path from receipt to person.</p>
        </div>
        <span className={`status-pill ${reconciled ? "success" : ""}`}>
          {reconciled ? "All set" : "Needs review"}
        </span>
      </div>

      <div className="summary-grid">
        {totals.map((total) => (
          <article
            className={`person-total ${selectedParticipantId === total.participant.id ? "is-me" : ""}`}
            key={total.participant.id}
          >
            <div>
              <strong>{total.participant.name}</strong>
              <b>{formatMoney(total.totalCents)}</b>
            </div>
            <dl>
              <div><dt>Food & drinks</dt><dd>{formatMoney(total.subtotalCents)}</dd></div>
              <div><dt>Tax</dt><dd>{formatMoney(total.taxCents)}</dd></div>
              <div><dt>Tip</dt><dd>{formatMoney(total.tipCents)}</dd></div>
            </dl>
          </article>
        ))}
      </div>

      {!reconciled && (
        <div className="warning-box" role="status">
          Review every item before sharing the final totals.
          {invalidCount > 0 && ` ${invalidCount} split rule${invalidCount === 1 ? "" : "s"} do not add up.`}
          {differenceCents !== 0 && ` Difference: ${formatMoney(differenceCents)}.`}
        </div>
      )}

      <div className="share-controls">
        <div>
          <h3>Save & share</h3>
          <p>{savedLabel} · The share link contains a private copy of this split.</p>
        </div>
        <div>
          <button className="primary-button" onClick={onShare}>Copy share link</button>
          <button className="secondary-button danger" onClick={onReset}>Reset split</button>
        </div>
      </div>
    </section>
  );
}
