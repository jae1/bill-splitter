import { useEffect, useMemo, useState } from "react";
import { AssignmentBoard } from "./components/AssignmentBoard";
import { ReceiptEditor } from "./components/ReceiptEditor";
import { SplitSummary } from "./components/SplitSummary";
import { LiveRoomControls } from "./components/LiveRoomControls";
import { calculateSplit } from "./domain/splitCalculator";
import type { Receipt, SplitState } from "./domain/types";
import { extractReceipt } from "./services/receiptExtraction";
import { createBlankSplit } from "./domain/defaultSplit";
import { clearLocalSplit, loadLocalSplit, saveLocalSplit } from "./services/localSplitStorage";
import { createShareUrl, decodeShareSnapshot } from "./services/shareSnapshot";
import {
  createLiveRoom,
  joinLiveRoom,
  saveLiveRoom,
  subscribeToLiveRoom,
  unsubscribeFromLiveRoom,
  type LiveRoom,
} from "./services/liveRoom";
import { supabaseConfigured } from "./services/supabaseClient";

const errorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error) return String(error.message);
  return fallback;
};

export default function App() {
  const initialState = useMemo<SplitState>(() => {
    const shared = decodeShareSnapshot(location.hash);
    if (shared) {
      history.replaceState(null, "", location.pathname);
      return shared;
    }
    return loadLocalSplit() ?? createBlankSplit();
  }, []);
  const [receipt, setReceipt] = useState<Receipt>(initialState.receipt);
  const [participants, setParticipants] = useState(initialState.participants);
  const [selectedParticipantId, setSelectedParticipantId] = useState(initialState.selectedParticipantId);
  const [extracting, setExtracting] = useState(false);
  const [extractionProgress, setExtractionProgress] = useState(0);
  const [extractionMessage, setExtractionMessage] = useState("");
  const [extractionError, setExtractionError] = useState<string>();
  const [rawText, setRawText] = useState<string>();
  const [pendingReceipt, setPendingReceipt] = useState<Receipt>();
  const [savedLabel, setSavedLabel] = useState("Saved locally");
  const [liveRoom, setLiveRoom] = useState<LiveRoom | null>(null);
  const [liveStatus, setLiveStatus] = useState("Local mode");
  const applyingRemote = useState({ current: false })[0];
  const split = useMemo(() => calculateSplit(receipt, participants), [receipt, participants]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      saveLocalSplit({ receipt, participants, selectedParticipantId });
      setSavedLabel(`Saved locally at ${new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [receipt, participants, selectedParticipantId]);

  useEffect(() => {
    const code = new URLSearchParams(location.search).get("room");
    if (code && supabaseConfigured && !liveRoom) {
      void joinRoom(code);
    }
  }, []);

  useEffect(() => {
    if (!liveRoom) return;
    const channel = subscribeToLiveRoom(liveRoom.id, (state, revision) => {
      setLiveRoom((current) => {
        if (!current || revision <= current.revision) return current;
        applyingRemote.current = true;
        setReceipt(state.receipt);
        setParticipants(state.participants);
        setSelectedParticipantId(state.selectedParticipantId);
        setLiveStatus("Updated from room");
        queueMicrotask(() => { applyingRemote.current = false; });
        return { ...current, revision };
      });
    });
    return () => { void unsubscribeFromLiveRoom(channel); };
  }, [liveRoom?.id]);

  useEffect(() => {
    if (!liveRoom || applyingRemote.current) return;
    const timer = window.setTimeout(async () => {
      try {
        const nextRoom = await saveLiveRoom(liveRoom, { receipt, participants, selectedParticipantId });
        setLiveRoom(nextRoom);
        setLiveStatus("Synced");
      } catch (error) {
        setLiveStatus(error instanceof Error && error.message.includes("revision conflict")
          ? "Another edit arrived — refreshing soon"
          : "Offline — changes saved locally");
      }
    }, 500);
    return () => window.clearTimeout(timer);
  }, [receipt, participants, selectedParticipantId, liveRoom?.id]);

  const upload = async (file?: File) => {
    if (!file) return;
    setExtracting(true);
    setExtractionProgress(0);
    setExtractionError(undefined);
    setRawText(undefined);
    setExtractionMessage("Starting on-device OCR…");
    try {
      const result = await extractReceipt(file, ({ progress, status }) => {
        setExtractionProgress(progress);
        setExtractionMessage(status);
      });
      setPendingReceipt(result.receipt);
      setRawText(result.rawText);
      setExtractionMessage(
        result.warnings.length ? result.warnings.join(" ") : `Found ${result.receipt.items.length} item lines. Review before assigning.`,
      );
    } catch (error) {
      setExtractionError(errorMessage(error, "Receipt recognition failed."));
      setExtractionMessage("");
    } finally {
      setExtracting(false);
    }
  };

  const applyOcrDraft = () => {
    if (!pendingReceipt) return;
    setReceipt(pendingReceipt);
    setPendingReceipt(undefined);
    setExtractionMessage("OCR draft applied. Review every line.");
  };

  const discardOcrDraft = () => {
    setPendingReceipt(undefined);
    setRawText(undefined);
    setExtractionMessage("");
  };

  const share = async () => {
    const url = createShareUrl({ receipt, participants });
    await navigator.clipboard.writeText(url);
    setSavedLabel("Share link copied");
  };

  const reset = () => {
    if (!window.confirm("Reset this split and remove its locally saved copy?")) return;
    clearLocalSplit();
    const blank = createBlankSplit();
    setReceipt(blank.receipt);
    setParticipants(blank.participants);
    setSelectedParticipantId(undefined);
    setSavedLabel("Split reset");
  };

  const leaveRoom = () => {
    setLiveRoom(null);
    history.replaceState(null, "", location.pathname);
    setLiveStatus("Left room — editing locally");
    setSavedLabel("Live room left; saved locally");
  };

  const createRoom = async () => {
    setLiveStatus("Creating room…");
    try {
      const room = await createLiveRoom({ receipt, participants, selectedParticipantId });
      setLiveRoom(room);
      history.replaceState(null, "", `?room=${room.code}`);
      setLiveStatus("Connected");
    } catch (error) {
      setLiveStatus(errorMessage(error, "Could not create room"));
    }
  };

  async function joinRoom(code: string) {
    setLiveStatus("Joining room…");
    try {
      const result = await joinLiveRoom(code);
      applyingRemote.current = true;
      setReceipt(result.state.receipt);
      setParticipants(result.state.participants);
      setSelectedParticipantId(result.state.selectedParticipantId);
      setLiveRoom(result.room);
      history.replaceState(null, "", `?room=${result.room.code}`);
      setLiveStatus("Connected");
      queueMicrotask(() => { applyingRemote.current = false; });
    } catch (error) {
      setLiveStatus(errorMessage(error, "Could not join room"));
    }
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="FairShare home">
          <span>F</span> FairShare
        </a>
        <div className="privacy-note">Private by default · USD</div>
      </header>

      <main id="top">
        <section className="hero">
          <span className="eyebrow">No signup. No awkward math.</span>
          <h1>Split the receipt.<br /><em>Keep the friendship.</em></h1>
          <p>Upload a dinner receipt, tap who had what, and get a fair total for everyone.</p>
          <div className="progress-track" aria-label="Three step process">
            <span className="active">1 <b>Receipt</b></span>
            <i />
            <span className="active">2 <b>Assign</b></span>
            <i />
            <span className={split.reconciled ? "active" : ""}>3 <b>Summary</b></span>
          </div>
        </section>

        <LiveRoomControls
          configured={supabaseConfigured}
          room={liveRoom}
          status={liveStatus}
          onCreate={createRoom}
          onJoin={joinRoom}
          onLeave={leaveRoom}
        />

        <section className="identity-bar" aria-label="Shared split identity">
          <label>
            Viewing as
            <select
              value={selectedParticipantId ?? ""}
              onChange={(event) => setSelectedParticipantId(event.target.value || undefined)}
            >
              <option value="">Host / not selected</option>
              {participants.map((person) => (
                <option key={person.id} value={person.id}>{person.name}</option>
              ))}
            </select>
          </label>
          <span>
            {selectedParticipantId
              ? `Your items and total are highlighted below.`
              : "Choose your name when opening a shared copy."}
          </span>
        </section>

        <ReceiptEditor
          receipt={receipt}
          extracting={extracting}
          extractionProgress={extractionProgress}
          extractionMessage={extractionMessage}
          extractionError={extractionError}
          rawText={rawText}
          hasPendingDraft={Boolean(pendingReceipt)}
          onApplyDraft={applyOcrDraft}
          onDiscardDraft={discardOcrDraft}
          onReceiptChange={setReceipt}
          onUpload={upload}
        />
        <AssignmentBoard
          receipt={receipt}
          participants={participants}
          onReceiptChange={setReceipt}
          onParticipantsChange={setParticipants}
        />
        <SplitSummary
          merchant={receipt.merchantName}
          totals={split.totals}
          unassignedCount={split.unassignedItemIds.length}
          invalidCount={split.invalidItemIds.length}
          differenceCents={split.differenceCents}
          reconciled={split.reconciled}
          savedLabel={savedLabel}
          onShare={share}
          onReset={reset}
          selectedParticipantId={selectedParticipantId}
        />
      </main>
      <footer>Built around transparent math — because “trust me” is not a receipt.</footer>
    </div>
  );
}
