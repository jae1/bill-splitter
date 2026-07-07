import type { RealtimeChannel } from "@supabase/supabase-js";
import type { SplitState } from "../domain/types";
import { supabase } from "./supabaseClient";

export type LiveRoom = { id: string; code: string; revision: number };
type CreateRoomRow = { room_id: string; room_code: string; room_revision: number };
type JoinRoomRow = CreateRoomRow & { room_state: SplitState };
type UpdateRoomRow = { room_state: SplitState; room_revision: number };

const liveRoomErrorMessage = (error: unknown, action: string) => {
  if (error instanceof TypeError && /fetch/i.test(error.message)) {
    return `Could not reach Supabase while ${action}. Check that the Supabase project is active and the app uses the current project URL.`;
  }
  if (error instanceof Error) return error.message;
  return `Could not ${action}.`;
};

async function ensureAnonymousUser() {
  if (!supabase) throw new Error("Supabase is not configured.");
  try {
    const { data } = await supabase.auth.getSession();
    if (data.session) return;
    const { error } = await supabase.auth.signInAnonymously();
    if (error) throw error;
  } catch (error) {
    throw new Error(liveRoomErrorMessage(error, "connecting to live rooms"));
  }
}

export async function createLiveRoom(state: SplitState): Promise<LiveRoom> {
  await ensureAnonymousUser();
  let result;
  try {
    result = await supabase!.rpc("create_bill_splitter_room", { initial_state: state }).single();
  } catch (error) {
    throw new Error(liveRoomErrorMessage(error, "creating the room"));
  }
  const { data, error } = result;
  if (error) throw error;
  const row = data as unknown as CreateRoomRow;
  return { id: row.room_id, code: row.room_code, revision: Number(row.room_revision) };
}

export async function joinLiveRoom(code: string): Promise<{ room: LiveRoom; state: SplitState }> {
  await ensureAnonymousUser();
  let result;
  try {
    result = await supabase!.rpc("join_bill_splitter_room", { requested_code: code }).single();
  } catch (error) {
    throw new Error(liveRoomErrorMessage(error, "joining the room"));
  }
  const { data, error } = result;
  if (error) throw error;
  const row = data as unknown as JoinRoomRow;
  return {
    room: { id: row.room_id, code: row.room_code, revision: Number(row.room_revision) },
    state: row.room_state,
  };
}

export async function saveLiveRoom(room: LiveRoom, state: SplitState): Promise<LiveRoom> {
  let result;
  try {
    result = await supabase!
      .rpc("update_bill_splitter_room", {
        target_room_id: room.id,
        expected_revision: room.revision,
        next_state: state,
      })
      .single();
  } catch (error) {
    throw new Error(liveRoomErrorMessage(error, "saving the room"));
  }
  const { data, error } = result;
  if (error) throw error;
  const row = data as unknown as UpdateRoomRow;
  return { ...room, revision: Number(row.room_revision) };
}

export function subscribeToLiveRoom(
  roomId: string,
  onChange: (state: SplitState, revision: number) => void,
): RealtimeChannel {
  if (!supabase) throw new Error("Supabase is not configured.");
  return supabase
    .channel(`bill-splitter-room-${roomId}`)
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "bill_splitter_rooms", filter: `id=eq.${roomId}` },
      (payload) => {
        const row = payload.new as { state: SplitState; revision: number };
        onChange(row.state, Number(row.revision));
      },
    )
    .subscribe();
}

export async function unsubscribeFromLiveRoom(channel: RealtimeChannel) {
  await supabase?.removeChannel(channel);
}
