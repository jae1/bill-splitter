import type { SplitState } from "../domain/types";

const STORAGE_KEY = "fairshare.active-split.v2";

export function loadLocalSplit(): SplitState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SplitState) : null;
  } catch {
    return null;
  }
}

export function saveLocalSplit(state: SplitState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function clearLocalSplit() {
  localStorage.removeItem(STORAGE_KEY);
}
