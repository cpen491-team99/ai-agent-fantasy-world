"use client";

import React, { useRef, useEffect } from "react";
import { Provider } from "react-redux";
import { store } from "./redux/store";
import { useAppDispatch, useAppSelector } from "./redux/hooks";
import { setRooms, addMessage } from "./redux/chatroomsSlice";
import { createMessage } from "./store/chat";
import { getMqttClient } from "./client/mqtt";
import { v4 as uuidv4 } from "uuid";

const uuid = uuidv4();

function MqttBootstrap() {
  const dispatch = useAppDispatch();
  const currentUserAgentId = useAppSelector(
    (state) => state.chatrooms.currentUserAgentId,
  );

  useEffect(() => {
    const agentId = currentUserAgentId;
    const username = "test_user";
    const clientId = uuid;

    let port = "9001";
    try {
      if (
        typeof process !== "undefined" &&
        process.env?.NEXT_PUBLIC_MQTT_FRONTEND_PORT_NUMBER
      ) {
        port = process.env.NEXT_PUBLIC_MQTT_FRONTEND_PORT_NUMBER;
      }
    } catch (e) {
      console.warn("Env var missing, using default port 9001");
    }

    const brokerUrl = `ws://127.0.0.1:${port}`;

    const client = getMqttClient();

    client.setHandlers({
      onConnect: () => console.log("[MQTT] connected"),
      onError: (err) => console.error("[MQTT] error", err),

      onRoomsState: (data) => {
        const roomsRaw = Array.isArray(data) ? data : data?.rooms;
        if (!Array.isArray(roomsRaw)) return;

        const rooms = roomsRaw
          .map((r: any) => {
            const id = r.id ?? r.roomId ?? r.name; // whichever exists
            const topic = r.topic ?? r.title ?? id ?? "Room";
            return {
              ...r,
              id,
              topic,
              lastUpdate: r.lastUpdate ?? r.updatedAt ?? Date.now(),
              messages: Array.isArray(r.messages) ? r.messages : [],
            };
          })
          .filter((r: any) => r.id !== "private-room");

        dispatch(setRooms(rooms));
      },

      onChatOut: (msg) => {
        const senderIsMe = msg.fromAgentId === agentId;
        dispatch(
          addMessage({
            roomId: msg.roomId,
            message: createMessage({
              role: senderIsMe ? "user" : "assistant",
              content: msg.msg,
              model: msg.fromAgentId,
              agentId: msg.fromAgentId,
              isUserAgent: msg.fromAgentId === agentId,
            }),
          }),
        );
      },
    });

    client.connect({
      brokerUrl,
      clientId,
      agentId,
      username,
      autoSubscribeBase: true,
    });

    return () => client.disconnect();
  }, [dispatch, currentUserAgentId]);

  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <Provider store={store}>
      <MqttBootstrap />
      {children}
    </Provider>
  );
}
