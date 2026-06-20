import { useState } from "react";
import type { LiveRoom } from "../services/liveRoom";

type Props = {
  configured: boolean;
  room: LiveRoom | null;
  status: string;
  onCreate: () => Promise<void>;
  onJoin: (code: string) => Promise<void>;
};

export function LiveRoomControls({ configured, room, status, onCreate, onJoin }: Props) {
  const [code, setCode] = useState("");

  if (!configured) return null;

  return (
    <section className="live-room" aria-label="Live collaboration">
      <div>
        <span className={`live-dot ${room ? "connected" : ""}`} />
        <strong>{room ? `Live room ${room.code}` : "Live collaboration"}</strong>
        <small>{status}</small>
      </div>
      {room ? (
        <button
          className="secondary-button"
          onClick={() => navigator.clipboard.writeText(`${location.origin}${location.pathname}?room=${room.code}`)}
        >
          Copy room link
        </button>
      ) : (
        <div className="room-actions">
          <button className="primary-button" onClick={onCreate}>Create room</button>
          <label>
            <span className="sr-only">Room code</span>
            <input
              aria-label="Room code"
              maxLength={8}
              placeholder="Room code"
              value={code}
              onChange={(event) => setCode(event.target.value.toUpperCase())}
            />
          </label>
          <button className="secondary-button" disabled={code.length !== 8} onClick={() => onJoin(code)}>
            Join
          </button>
        </div>
      )}
    </section>
  );
}
