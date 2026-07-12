import type { Participant, ParticipantTotal, Receipt } from "./types";

export const formatMoney = (cents: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);

export const parseMoney = (value: string) => Math.round((Number.parseFloat(value) || 0) * 100);

export const getItemQuantity = (item: { quantity?: number }) => Math.max(1, Math.round(item.quantity ?? 1));

export const getItemTotalCents = (item: { priceCents: number; quantity?: number; priceEntryMode?: "lineTotal" | "unitPrice" }) =>
  item.priceEntryMode === "unitPrice" ? item.priceCents * getItemQuantity(item) : item.priceCents;

export const getItemUnitPriceCents = (item: { priceCents: number; quantity?: number; priceEntryMode?: "lineTotal" | "unitPrice" }) =>
  item.priceEntryMode === "unitPrice" ? item.priceCents : Math.round(item.priceCents / getItemQuantity(item));

const allocate = (amount: number, weights: number[]) => {
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  if (!totalWeight || !amount) return weights.map(() => 0);
  const raw = weights.map((weight) => (amount * weight) / totalWeight);
  const result = raw.map(Math.floor);
  let remainder = amount - result.reduce((sum, value) => sum + value, 0);
  raw
    .map((value, index) => ({ index, fraction: value - Math.floor(value) }))
    .sort((a, b) => b.fraction - a.fraction || a.index - b.index)
    .forEach(({ index }) => {
      if (remainder > 0) {
        result[index] += 1;
        remainder -= 1;
      }
    });
  return result;
};

export function calculateSplit(receipt: Receipt, participants: Participant[]) {
  const subtotals = participants.map(() => 0);
  const invalidItemIds: string[] = [];
  receipt.items.forEach((item) => {
    const purchasedQuantity = getItemQuantity(item);
    const itemTotalCents = getItemTotalCents(item);
    if (purchasedQuantity > 1) {
      const assignments = participants.map((participant, index) => ({
        index,
        units: item.quantityAssignments?.[participant.id] ?? 0,
      }));
      const assignedUnits = assignments.reduce((sum, assignment) => sum + assignment.units, 0);
      if (assignments.some(({ units }) => !Number.isInteger(units) || units < 0)) {
        invalidItemIds.push(item.id);
        return;
      }
      if (assignedUnits === 0) return;
      const shares = allocate(itemTotalCents, assignments.map(({ units }) => units));
      assignments.forEach(({ index }, shareIndex) => {
        subtotals[index] += shares[shareIndex];
      });
      return;
    }
    const assigned = participants
      .map((participant, index) => ({ participant, index }))
      .filter(({ participant }) => item.participantIds.includes(participant.id));
    if (!assigned.length) return;
    const mode = item.splitMode ?? "equal";
    const values = assigned.map(({ participant }) => item.shares?.[participant.id] ?? 0);
    let shares: number[];
    if (mode === "fixed") {
      if (values.some((value) => value < 0) || values.reduce((sum, value) => sum + value, 0) !== itemTotalCents) {
        invalidItemIds.push(item.id);
        return;
      }
      shares = values;
    } else if (mode === "percentage") {
      if (values.some((value) => value < 0) || values.reduce((sum, value) => sum + value, 0) !== 100) {
        invalidItemIds.push(item.id);
        return;
      }
      shares = allocate(itemTotalCents, values);
    } else if (mode === "quantity") {
      if (values.some((value) => !Number.isInteger(value) || value <= 0)) {
        invalidItemIds.push(item.id);
        return;
      }
      shares = allocate(itemTotalCents, values);
    } else {
      shares = allocate(itemTotalCents, assigned.map(() => 1));
    }
    assigned.forEach(({ index }, shareIndex) => {
      subtotals[index] += shares[shareIndex];
    });
  });

  const unassignedItemIds = receipt.items
    .filter((item) =>
      (item.quantity ?? 1) > 1
        ? Object.values(item.quantityAssignments ?? {}).reduce((sum, units) => sum + units, 0) === 0
        : item.participantIds.length === 0,
    )
    .map((item) => item.id);

  const tax = allocate(receipt.taxCents, subtotals);
  const tip = allocate(receipt.tipCents, subtotals);
  const calculated = subtotals.reduce((sum, value) => sum + value, 0) + receipt.taxCents + receipt.tipCents;
  const canApplyRounding = invalidItemIds.length === 0 && unassignedItemIds.length === 0;
  const rounding = allocate(canApplyRounding ? receipt.totalCents - calculated : 0, subtotals);
  const totals: ParticipantTotal[] = participants.map((participant, index) => ({
    participant,
    subtotalCents: subtotals[index],
    taxCents: tax[index],
    tipCents: tip[index],
    roundingCents: rounding[index],
    totalCents: subtotals[index] + tax[index] + tip[index] + rounding[index],
  }));
  const distributedCents = totals.reduce((sum, total) => sum + total.totalCents, 0);
  return {
    totals,
    unassignedItemIds,
    invalidItemIds,
    differenceCents: receipt.totalCents - distributedCents,
    reconciled:
      unassignedItemIds.length === 0 &&
      invalidItemIds.length === 0 &&
      receipt.totalCents === distributedCents,
  };
}
