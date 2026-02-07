// app/client/mqttClient.ts
import mqtt, { MqttClient } from "mqtt";

/**
 * Browser MQTT client helper (singleton-ish usage recommended).
 * - Handles connect/reconnect
 * - Buffers publishes while disconnected (outbox)
 * - Provides simple callback hooks for incoming messages
 *
 * Topics (same as your mock dev client):
 * - subscribe base:
 *   rooms/state
 *   rooms/+/members
 *   rooms/+/chat/out
 *   rooms/+/history/response/+
 *   senders/history/response/+
 *   agents/<agentId>/memory/find/response/+
 *
 * - publish:
 *   agents/<agentId>/status  (retained online/offline)
 *   agents/<agentId>/heartbeat
 *   rooms/<roomId>/join
 *   rooms/<roomId>/leave
 *   rooms/<roomId>/chat/in
 *   rooms/<roomId>/history/request
 *   senders/history/request
 *   agents/<agentId>/memory/find/request
 */

export type SenderType = "agent" | "user";

export type RoomChatOutMessage = {
  roomId: string;
  fromAgentId: string;
  fromUsername?: string;
  msg: string;
  type?: string;
  ts?: number;
};

export type RoomHistoryResponse = {
  requestId: string;
  roomId: string;
  messages: any[];
  nextBefore?: any;
  error?: string;
};

export type SenderHistoryResponse = {
  requestId: string;
  senderType: SenderType;
  senderId: string;
  messages: any[];
  nextBefore?: any;
  error?: string;
};

export type MemoryFindResponse = {
  requestId: string;
  textQuery?: string;
  results?: any[];
  error?: string;
};

type BufferedMessage = {
  topic: string;
  payload: string;
  options?: mqtt.IClientPublishOptions;
};

export type MqttInitOptions = {
  brokerUrl: string; // should be WS/WSS in browser, e.g. "ws://127.0.0.1:49160"
  clientId: string;
  agentId: string;
  username: string;
  clientIdPrefix?: string; // default: "web"
  heartbeatMs?: number; // default: 5000
  /**
   * If true, auto-subscribe base topics on connect (default true).
   * If you want to manually control subscriptions, set false.
   */
  autoSubscribeBase?: boolean;
};

type Handlers = {
  onConnect?: () => void;
  onReconnect?: () => void;
  onClose?: () => void;
  onError?: (err: unknown) => void;

  onAnyMessage?: (topic: string, payloadText: string) => void;

  onChatOut?: (msg: RoomChatOutMessage) => void;
  onRoomHistory?: (data: RoomHistoryResponse) => void;
  onSenderHistory?: (data: SenderHistoryResponse) => void;
  onMemoryFind?: (data: MemoryFindResponse) => void;

  onRoomsState?: (data: any) => void; // you can type this later
  onRoomMembers?: (roomId: string, data: any) => void; // you can type this later
};

export class FrontendMqttClient {
  private client: MqttClient | null = null;
  private outbox: BufferedMessage[] = [];
  private hbTimer: ReturnType<typeof setInterval> | null = null;

  private opts: MqttInitOptions | null = null;
  private handlers: Handlers = {};
  private handlerLists: Partial<Record<keyof Handlers, Function[]>> = {};

  private currentRoom: string | null = null;

  get isConnected() {
    return !!this.client?.connected;
  }

  private emit<K extends keyof Handlers>(key: K, ...args: any[]) {
    const list = this.handlerLists[key];
    if (!list) return;
    for (const fn of list) (fn as any)(...args);
  }

  /**
   * Register handlers (safe to call multiple times; later calls overwrite).
   */
  setHandlers(handlers: Handlers) {
    this.handlers = { ...this.handlers, ...handlers };
  }

  addHandlers(handlers: Partial<Handlers>) {
    const added: Array<{ key: keyof Handlers; fn: Function }> = [];

    (Object.keys(handlers) as (keyof Handlers)[]).forEach((key) => {
      const fn = handlers[key];
      if (!fn) return;

      const list = (this.handlerLists[key] ??= []);
      list.push(fn as any);
      added.push({ key, fn: fn as any });
    });

    // unsubscribe
    return () => {
      for (const { key, fn } of added) {
        const list = this.handlerLists[key];
        if (!list) continue;
        const idx = list.indexOf(fn);
        if (idx >= 0) list.splice(idx, 1);
      }
    };
  }

  /**
   * Connect once. Calling connect again will disconnect the old client first.
   */
  connect(opts: MqttInitOptions) {
    this.disconnect(); // ensure clean state

    this.opts = {
      heartbeatMs: 5000,
      autoSubscribeBase: true,
      clientIdPrefix: "web",
      ...opts,
    };

    const { brokerUrl, agentId, clientId, username, clientIdPrefix } =
      this.opts;

    // NOTE: In browser, brokerUrl must be ws:// or wss:// (MQTT over WebSocket).
    this.client = mqtt.connect(brokerUrl, {
      clientId: `${clientIdPrefix}-${clientId}`,
      will: {
        topic: `agents/${agentId}/status`,
        payload: JSON.stringify({
          status: "offline",
          username,
          agentId,
          ts: Date.now(),
        }),
        qos: 0,
        retain: true,
      },
    });

    this.client.on("connect", () => {
      this.handlers.onConnect?.();
      this.emit("onConnect");

      if (this.opts?.autoSubscribeBase) {
        this.subscribeBase();
      }

      this.publishOnline();
      this.startHeartbeat();

      // re-join if we had a room selected before reconnect
      if (this.currentRoom) {
        this.safePublish(
          `rooms/${this.currentRoom}/join`,
          JSON.stringify({ agentId, username, ts: Date.now() }),
        );
      }

      this.flushOutbox();
    });

    this.client.on("reconnect", () => {
      this.handlers.onReconnect?.();
      this.emit("onReconnect");
    });
    this.client.on("close", () => {
      this.handlers.onClose?.();
      this.emit("onClose");
    });
    this.client.on("error", (err) => {
      this.handlers.onError?.(err);
      this.emit("onError", err);
    });

    this.client.on("message", (topic, payload) => {
      const text = payload.toString();
      this.handlers.onAnyMessage?.(topic, text);

      // rooms/<roomId>/chat/out
      const mChat = topic.match(/^rooms\/([^/]+)\/chat\/out$/);
      if (mChat) {
        try {
          const data = JSON.parse(text) as RoomChatOutMessage;
          this.handlers.onChatOut?.(data);
          this.emit("onChatOut", data);
        } catch {
          // ignore parse errors
        }
        return;
      }

      // rooms/<roomId>/history/response/<requestId>
      const mRoomHist = topic.match(
        /^rooms\/([^/]+)\/history\/response\/([^/]+)$/,
      );
      if (mRoomHist) {
        try {
          const data = JSON.parse(text) as RoomHistoryResponse;
          this.handlers.onRoomHistory?.(data);
          this.emit("onRoomHistory", data);
        } catch {}
        return;
      }

      // senders/history/response/<requestId>
      const mSenderHist = topic.match(/^senders\/history\/response\/([^/]+)$/);
      if (mSenderHist) {
        try {
          const data = JSON.parse(text) as SenderHistoryResponse;
          this.handlers.onSenderHistory?.(data);
        } catch {}
        return;
      }

      // agents/<agentId>/memory/find/response/<requestId>
      const { agentId } = this.opts ?? { agentId: "" };
      const mMem = topic.match(
        /^agents\/([^/]+)\/memory\/find\/response\/([^/]+)$/,
      );

      if (mMem) {
        const topicAgentId = mMem[1]; // Capture which agent sent this
        try {
          const data = JSON.parse(text) as MemoryFindResponse;
          (data as any).agentId = topicAgentId;

          this.handlers.onMemoryFind?.(data);
          this.emit("onMemoryFind", data);
        } catch (e) {
          console.error("Error parsing memory response:", e);
        }
        return;
      }

      // rooms/state
      if (topic === "rooms/state") {
        try {
          const data = JSON.parse(text);
          this.handlers.onRoomsState?.(data);
        } catch {}
        return;
      }

      // rooms/<roomId>/members
      const mMembers = topic.match(/^rooms\/([^/]+)\/members$/);
      if (mMembers) {
        const roomId = mMembers[1];
        try {
          const data = JSON.parse(text);
          this.handlers.onRoomMembers?.(roomId, data);
        } catch {}
        return;
      }
    });
  }

  disconnect() {
    if (this.hbTimer) {
      clearInterval(this.hbTimer);
      this.hbTimer = null;
    }

    if (this.client) {
      // publish offline best-effort before end
      try {
        this.publishOffline();
      } catch {}

      this.client.end(true);
      this.client = null;
    }

    this.outbox = [];
    this.currentRoom = null;
    this.opts = null;
  }

  // ---------- subscriptions ----------

  subscribeBase() {
    if (!this.client) return;

    const { agentId } = this.opts!;
    this.client.subscribe(
      [
        "rooms/state",
        "rooms/+/members",
        "rooms/+/chat/out",
        "rooms/+/history/response/+",
        "senders/history/response/+",
        `agents/${agentId}/memory/find/response/+`,
        `agents/+/memory/find/response/+`,
      ],
      (err) => {
        if (err) {
          this.handlers.onError?.(err);
        }
      },
    );
  }

  // ---------- publish helpers ----------

  private safePublish(
    topic: string,
    payload: string,
    options: mqtt.IClientPublishOptions = {},
  ) {
    if (this.client?.connected) {
      this.client.publish(topic, payload, options);
    } else {
      this.outbox.push({ topic, payload, options });
    }
  }

  private flushOutbox() {
    if (!this.client?.connected || this.outbox.length === 0) return;
    while (this.outbox.length) {
      const m = this.outbox.shift()!;
      this.client.publish(m.topic, m.payload, m.options);
    }
  }

  publishOnline() {
    if (!this.opts) return;
    const { agentId, username } = this.opts;
    this.safePublish(
      `agents/${agentId}/status`,
      JSON.stringify({ status: "online", username, agentId, ts: Date.now() }),
      { qos: 0, retain: true },
    );
  }

  publishOffline() {
    if (!this.opts) return;
    const { agentId, username } = this.opts;
    this.safePublish(
      `agents/${agentId}/status`,
      JSON.stringify({ status: "offline", username, agentId, ts: Date.now() }),
      { qos: 0, retain: true },
    );
  }

  private startHeartbeat() {
    if (!this.opts) return;
    const { heartbeatMs, agentId, username } = this.opts;

    if (this.hbTimer) clearInterval(this.hbTimer);
    this.hbTimer = setInterval(() => {
      this.safePublish(
        `agents/${agentId}/heartbeat`,
        JSON.stringify({ username, agentId, ts: Date.now() }),
        { qos: 0, retain: false },
      );
    }, heartbeatMs);
  }

  // ---------- room actions (same as mock client) ----------

  joinRoom(roomId: string) {
    if (!this.opts) throw new Error("MQTT client not connected yet");
    const { agentId, username } = this.opts;

    // if switching rooms, leave old
    if (this.currentRoom && this.currentRoom !== roomId) {
      this.leaveRoom();
    }

    this.safePublish(
      `rooms/${roomId}/join`,
      JSON.stringify({ agentId, username, ts: Date.now() }),
    );

    this.currentRoom = roomId;
  }

  leaveRoom() {
    if (!this.opts) return;
    if (!this.currentRoom) return;

    const { agentId, username } = this.opts;
    const roomId = this.currentRoom;

    this.safePublish(
      `rooms/${roomId}/leave`,
      JSON.stringify({ agentId, username, ts: Date.now() }),
    );

    this.currentRoom = null;
  }

  sendRoomMessage(roomId: string, msg: string) {
    if (!this.opts) throw new Error("MQTT client not connected yet");
    const { agentId, username } = this.opts;

    this.safePublish(
      `rooms/${roomId}/chat/in`,
      JSON.stringify({
        roomId,
        fromAgentId: agentId,
        fromUsername: username,
        type: "text",
        msg,
        ts: Date.now(),
      }),
    );
  }

  requestRoomHistory(roomId: string, limit = 20, before: string | null = null) {
    if (!this.opts) throw new Error("MQTT client not connected yet");
    const { agentId } = this.opts;
    const requestId = `${agentId}-${Date.now()}`;

    this.safePublish(
      `rooms/${roomId}/history/request`,
      JSON.stringify({ requestId, limit, before }),
      { qos: 0, retain: false },
    );

    return requestId;
  }

  requestSenderHistory(
    senderType: SenderType,
    senderId: string,
    limit = 20,
    before: string | null = null,
  ) {
    if (!this.opts) throw new Error("MQTT client not connected yet");
    const { agentId } = this.opts;
    const requestId = `${agentId}-${Date.now()}`;

    this.safePublish(
      `senders/history/request`,
      JSON.stringify({ requestId, senderType, senderId, limit, before }),
      { qos: 0, retain: false },
    );

    return requestId;
  }

  requestMemoryFind(textQuery: string) {
    if (!this.opts) throw new Error("MQTT client not connected yet");
    const { agentId } = this.opts;
    const requestId = `${agentId}-${Date.now()}`;

    this.safePublish(
      `agents/${agentId}/memory/find/request`,
      JSON.stringify({ requestId, textQuery }),
      { qos: 0, retain: false },
    );

    return requestId;
  }

  requestAgentMemoryFind(textQuery: string, targetAgentID: string) {
    if (!this.opts) throw new Error("MQTT client not connected yet");
    const requestId = `${targetAgentID}-${Date.now()}`;

    this.safePublish(
      `agents/${targetAgentID}/memory/find/request`,
      JSON.stringify({ requestId, textQuery }),
      { qos: 0, retain: false },
    );

    return requestId;
  }
}

// Simple singleton so you don’t accidentally create 2 connections.
let _client: FrontendMqttClient | null = null;
export function getMqttClient() {
  if (!_client) _client = new FrontendMqttClient();
  return _client;
}
