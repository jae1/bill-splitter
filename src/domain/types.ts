export type Participant = {
  id: string;
  name: string;
  venmoHandle?: string;
  zelleRecipient?: string;
};

export type ReceiptItem = {
  id: string;
  name: string;
  priceCents: number;
  participantIds: string[];
  confidence?: number;
  quantity?: number;
  unitPriceCents?: number;
  quantityAssignments?: Record<string, number>;
  splitMode?: "equal" | "quantity" | "percentage" | "fixed";
  shares?: Record<string, number>;
};

export type Receipt = {
  merchantName: string;
  items: ReceiptItem[];
  taxCents: number;
  tipCents: number;
  totalCents: number;
};

export type ParticipantTotal = {
  participant: Participant;
  subtotalCents: number;
  taxCents: number;
  tipCents: number;
  roundingCents: number;
  totalCents: number;
};

export type SplitState = {
  receipt: Receipt;
  participants: Participant[];
  selectedParticipantId?: string;
};
