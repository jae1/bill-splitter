import type { SplitState } from "../domain/types";

type Snapshot = { version: 1; state: SplitState };

const toBase64Url = (value: string) =>
  btoa(unescape(encodeURIComponent(value)))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");

const fromBase64Url = (value: string) => {
  const padded = value.replaceAll("-", "+").replaceAll("_", "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  return decodeURIComponent(escape(atob(padded)));
};

export function encodeShareSnapshot(state: SplitState) {
  return toBase64Url(JSON.stringify({ version: 1, state } satisfies Snapshot));
}

export function decodeShareSnapshot(hash: string): SplitState | null {
  const encoded = hash.replace(/^#share=/, "");
  if (!encoded || encoded === hash) return null;
  try {
    const snapshot = JSON.parse(fromBase64Url(encoded)) as Snapshot;
    return snapshot.version === 1 ? snapshot.state : null;
  } catch {
    return null;
  }
}

export function createShareUrl(state: SplitState) {
  return `${location.origin}${location.pathname}#share=${encodeShareSnapshot(state)}`;
}
