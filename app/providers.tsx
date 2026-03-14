"use client";

import React, { useEffect } from "react";
import { Provider } from "react-redux";
import { store } from "./redux/store";
import { useAppDispatch, useAppSelector } from "./redux/hooks";
import { setRooms, addMessage } from "./redux/chatroomsSlice";
import { createMessage } from "./store/chat";
import { getMqttClient } from "./client/mqtt";
import { v4 as uuidv4 } from "uuid";
import { useAppConfig } from "./store/config";

const uuid = uuidv4();

/**
 * Watches the Zustand config store for theme changes.
 * Syncs the theme to the HTML attribute, body class, and mobile status bar.
 */
function ThemeWatcher() {
  const theme = useAppConfig((state) => state.theme);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);

    const allThemes = [
      "light",
      "midnight",
      "forest",
      "cyberpunk",
      "gameboy",
      "vampire",
      "auto",
    ];
    document.body.classList.remove(...allThemes);
    document.body.classList.add(theme);

    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      const colors: Record<string, string> = {
        light: "#f5d6a7",
        midnight: "#15181e",
        forest: "#1b2114",
        cyberpunk: "#1a0624",
        gameboy: "#9bbc0f",
        vampire: "#0f0f0f",
      };
      metaThemeColor.setAttribute("content", colors[theme] || "#f5d6a7");
    }

    console.log(`[ThemeWatcher] UI switched to: ${theme}`);
  }, [theme]);

  return null;
}

/**
 * Handles the MQTT connection lifecycle and dispatches incoming
 * messages/rooms to the Redux store.
 */
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
            const id = r.id ?? r.roomId ?? r.name;
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

/**
 * Global provider wrapper for the application.
 * Injects Redux store and initializes background watchers.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <Provider store={store}>
      <ThemeWatcher />
      <MqttBootstrap />
      {children}
    </Provider>
  );
}
