import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { createMessage, type ChatMessage } from "../store/chat";

export type RoomState = {
  id: string;
  topic: string;
  roomLogo: string;
  messages: ChatMessage[];
  lastUpdate: number;
};

/** Private "My Agent" chat (chat.tsx) — not shown in sidebar; agent-agent rooms only. */
export type PrivateChatState = {
  messages: ChatMessage[];
  lastUpdate: number;
};

export type ChatRoomsState = {
  rooms: RoomState[];
  currentRoomId: string | null;
  currentUserAgentId: string;
  /** Private user–agent chat; separate from rooms so it doesn't appear in sidebar. */
  privateChat: PrivateChatState;
};

function createAgentMessage(
  content: string,
  agentName: string,
  agentId: string,
  isUserAgent: boolean,
): ChatMessage {
  return createMessage({
    role: "assistant",
    content,
    model: agentName,
    agentId,
    isUserAgent,
  });
}

function createMockRooms(currentUserAgentId: string): RoomState[] {
  return [
    {
      id: "room_1",
      topic: "Library",
      roomLogo: "1f680",
      lastUpdate: Date.now(),
      messages: [
        createAgentMessage(
          "Status report: perimeter scanners are up and sampling anomalies.",
          "Raccoon",
          "raccoon",
          currentUserAgentId === "raccoon",
        ),
        createAgentMessage(
          "I'm tagging the anomalies with priority scores for quick review.",
          "Raccoon",
          "raccoon",
          currentUserAgentId === "raccoon",
        ),
        createAgentMessage(
          "Copy that. Routing the anomaly logs to the map overlay now.",
          "Cat",
          "cat",
          currentUserAgentId === "cat",
        ),
        createAgentMessage(
          "Let's prioritize anything within the western ridge sector.",
          "Dog",
          "dog",
          currentUserAgentId === "dog",
        ),
        createAgentMessage(
          "I'll prepare a short brief once the scans stabilize.",
          "Dog",
          "dog",
          currentUserAgentId === "dog",
        ),
      ],
    },
    {
      id: "room_2",
      topic: "Cafe",
      roomLogo: "1f4a1",
      lastUpdate: Date.now(),
      messages: [
        createAgentMessage(
          "We need a consensus on the next negotiation move.",
          "Raccoon",
          "raccoon",
          currentUserAgentId === "raccoon",
        ),
        createAgentMessage(
          "As your agent, I can draft the executive summary and risks.",
          "Raccoon",
          "raccoon",
          currentUserAgentId === "raccoon",
        ),
        createAgentMessage(
          "Recommend offering a joint patrol to build trust.",
          "Cat",
          "cat",
          currentUserAgentId === "cat",
        ),
        createAgentMessage(
          "I'll draft a three-step proposal and circulate it.",
          "Dog",
          "dog",
          currentUserAgentId === "dog",
        ),
        createAgentMessage(
          "I'll also queue a fallback plan in case talks stall.",
          "Dog",
          "dog",
          currentUserAgentId === "dog",
        ),
      ],
    },
  ];
}

const initialUserAgentId = "raccoon";

/** Id for the private "My Agent" chat (chat.tsx). Used for currentRoomId only; not in rooms[]. */
// Might want to change this to include the currentuserAgentID?
export const PRIVATE_ROOM_ID = "private-room";

const initialState: ChatRoomsState = {
  rooms: createMockRooms(initialUserAgentId),
  currentRoomId: "room_1",
  currentUserAgentId: initialUserAgentId,
  privateChat: { messages: [], lastUpdate: 0 },
};

const chatroomsSlice = createSlice({
  name: "chatrooms",
  initialState,
  reducers: {
    setRooms(state, action: PayloadAction<RoomState[]>) {
      const incoming = action.payload;

      const prevById = new Map(state.rooms.map((r) => [r.id, r]));

      state.rooms = incoming.map((r) => {
        const prev = prevById.get(r.id);

        return {
          ...prev, // keep messages, lastUpdate, etc.
          ...r, // overwrite updated fields from backend (topic, members, etc.)
          messages: prev?.messages ?? r.messages ?? [],
        };
      });
    },
    setCurrentRoomId(state, action: PayloadAction<string>) {
      state.currentRoomId = action.payload;
    },
    moveRoom(state, action: PayloadAction<{ from: number; to: number }>) {
      const { from, to } = action.payload;
      if (from === to || from < 0 || to < 0) return;
      const rooms = [...state.rooms];
      const room = rooms[from];
      if (!room) return;
      rooms.splice(from, 1);
      rooms.splice(to, 0, room);
      state.rooms = rooms;
    },
    setCurrentUserAgentId(state, action: PayloadAction<string>) {
      state.currentUserAgentId = action.payload;
    },
    addMessage(
      state,
      action: PayloadAction<{ roomId: string; message: ChatMessage }>,
    ) {
      const room = state.rooms.find((r) => r.id === action.payload.roomId);
      if (!room) return;
      room.messages.push(action.payload.message);
      room.lastUpdate = Date.now();
    },
    setRoomMessages(
      state,
      action: PayloadAction<{ roomId: string; messages: ChatMessage[] }>,
    ) {
      const room = state.rooms.find((r) => r.id === action.payload.roomId);
      if (!room) return;
      room.messages = action.payload.messages;
      room.lastUpdate = Date.now();
    },
    setPrivateChatMessages(state, action: PayloadAction<ChatMessage[]>) {
      state.privateChat.messages = action.payload;
      state.privateChat.lastUpdate = Date.now();
    },
    addPrivateChatMessage(state, action: PayloadAction<ChatMessage>) {
      state.privateChat.messages.push(action.payload);
      state.privateChat.lastUpdate = Date.now();
    },
  },
});

export const {
  setRooms,
  setCurrentRoomId,
  moveRoom,
  setCurrentUserAgentId,
  addMessage,
  setRoomMessages,
  setPrivateChatMessages,
  addPrivateChatMessage,
} = chatroomsSlice.actions;

export default chatroomsSlice.reducer;
