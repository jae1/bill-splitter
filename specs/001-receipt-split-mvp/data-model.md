# Data Model: Receipt Split MVP

## Receipt

- `id`: stable session identifier
- `merchantName`: editable display name
- `currency`: `USD`
- `items`: ordered collection of receipt items
- `taxCents`, `tipCents`: non-negative adjustments
- `totalCents`: printed receipt total
- `status`: `draft | ready | reconciled`

## Receipt Item

- `id`: stable identifier
- `name`: editable description
- `priceCents`: signed line amount
- `quantity`: positive integer
- `confidence`: optional extraction confidence
- `participantIds`: zero or more equal-share assignees
- `splitMode`: `equal | quantity | percentage | fixed`
- `shares`: participant-to-weight or participant-to-cent values for non-equal modes

## Participant

- `id`: stable identifier
- `name`: required display name
- `venmoHandle`: optional
- `zelleRecipient`: optional phone number or email supplied by the host

## Split Summary

- participant subtotal
- proportional tax share
- proportional tip share
- deterministic rounding adjustment
- final total
- receipt-level reconciliation difference

## Share Snapshot

- versioned receipt and participant state
- optional selected participant identifier
- encoded in the URL fragment
- imported as a new local copy

## Validation and State Transitions

- Draft items may be edited at any time.
- A receipt becomes ready when it has participants and valid item prices.
- A receipt becomes reconciled only when every chargeable item is assigned and calculated
  totals equal the printed total.
- Payment handoffs may only be prepared from a reconciled summary.
