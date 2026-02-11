/**
 * Chatroom Store - Agent-to-Agent Inference Logic
 *
 * This store handles agent inference in chatrooms where agents respond
 * autonomously to each other without user input.
 */

import { create } from "zustand";
import log from "loglevel";
import { ChatMessage, createMessage } from "./chat";
import { useAppConfig } from "./config";
import { LLMApi, RequestMessage } from "../client/api";
import { estimateTokenLength } from "../utils/token";
import { getMessageTextContent } from "../utils";
import { getMqttClient } from "../client/mqtt";

export interface AgentConfig {
  agentId: string;
  agentName: string;
  systemPrompt: string;
}

export interface ChatroomState {
  // Current agent configuration
  agentConfig: AgentConfig | null;

  // Inference state
  isGenerating: boolean;
  currentStreamingMessage: ChatMessage | null;

  // Auto-respond toggle (for testing)
  autoRespondEnabled: boolean;
}

export interface ChatroomActions {
  // Configuration
  setAgentConfig: (config: AgentConfig) => void;
  setAutoRespond: (enabled: boolean) => void;

  // Inference
  onAgentRespond: (
    llm: LLMApi,
    roomId: string,
    roomMessages: ChatMessage[],
    triggerMessage: ChatMessage,
  ) => void;
  abortResponse: () => void;

  // State management
  resetState: () => void;
}

const DEFAULT_AGENT_SYSTEM_PROMPT = `You are an AI agent participating in a group chat with other agents. 
Respond naturally and conversationally to the ongoing discussion.
Keep your responses concise and relevant to the conversation.
Do not use greetings or sign-offs unless contextually appropriate.`;

/**
 * Build context messages for agent inference from room history.
 * Similar to getMessagesWithMemory in chat.ts but adapted for rooms.
 */
function buildAgentContext(
  roomMessages: ChatMessage[],
  agentConfig: AgentConfig,
  maxTokens: number = 4096,
): RequestMessage[] {
  const systemPrompt: RequestMessage = {
    role: "system",
    content: agentConfig.systemPrompt || DEFAULT_AGENT_SYSTEM_PROMPT,
  };

  // Build context from recent messages, respecting token limit
  const contextMessages: RequestMessage[] = [];
  let tokenCount = estimateTokenLength(
    typeof systemPrompt.content === "string" ? systemPrompt.content : "",
  );

  // Iterate backwards through messages to get most recent context
  for (let i = roomMessages.length - 1; i >= 0 && tokenCount < maxTokens; i--) {
    const msg = roomMessages[i];
    if (msg.isError || msg.streaming) continue;

    const content = getMessageTextContent(msg);
    const msgTokens = estimateTokenLength(content);

    if (tokenCount + msgTokens > maxTokens) break;

    // Convert to RequestMessage format
    // Messages from the current agent are "assistant", others are "user"

    contextMessages.unshift({
      role: "user",
      content: msg.agentId
        ? `[${msg.model || msg.agentId}]: ${content}`
        : content,
    });

    tokenCount += msgTokens;
  }

  return [systemPrompt, ...contextMessages];
}

export const useChatroomStore = create<ChatroomState & ChatroomActions>(
  (set, get) => ({
    // Initial state
    agentConfig: null,
    isGenerating: false,
    currentStreamingMessage: null,
    autoRespondEnabled: false,

    setAgentConfig: (config: AgentConfig) => {
      set({ agentConfig: config });
    },

    setAutoRespond: (enabled: boolean) => {
      set({ autoRespondEnabled: enabled });
      log.info(
        `[ChatroomStore] Auto-respond ${enabled ? "enabled" : "disabled"}`,
      );
    },

    onAgentRespond: (
      llm: LLMApi,
      roomId: string,
      roomMessages: ChatMessage[],
      triggerMessage: ChatMessage,
    ) => {
      const state = get();
      const { agentConfig, isGenerating } = state;

      // Guard: Don't respond if already generating or no agent config
      if (isGenerating) {
        log.warn("[ChatroomStore] Already generating, skipping response");
        return;
      }

      if (!agentConfig) {
        log.warn("[ChatroomStore] No agent config set, skipping response");
        return;
      }

      // Don't respond to own messages
      if (triggerMessage.agentId === agentConfig.agentId) {
        log.debug("[ChatroomStore] Ignoring own message");
        return;
      }

      log.info(
        `[ChatroomStore] Agent ${agentConfig.agentId} responding to message from ${triggerMessage.agentId}`,
      );

      // Create streaming message placeholder
      const modelConfig = useAppConfig.getState().modelConfig;
      const streamingMessage: ChatMessage = createMessage({
        role: "assistant",
        content: "",
        streaming: true,
        model: agentConfig.agentName,
        agentId: agentConfig.agentId,
        isUserAgent: true, // This is our agent
      });

      set({
        isGenerating: true,
        currentStreamingMessage: streamingMessage,
      });

      // Build context from room messages
      const contextMessages = buildAgentContext(
        roomMessages,
        agentConfig,
        modelConfig.context_window_size || 4096,
      );

      log.debug("[ChatroomStore] Context messages:", contextMessages);

      // Make LLM request
      llm.chat({
        messages: contextMessages,
        config: {
          ...modelConfig,
          cache: useAppConfig.getState().cacheType,
          stream: true,
          enable_thinking: useAppConfig.getState().enableThinking,
        },
        onUpdate: (message: string) => {
          const current = get().currentStreamingMessage;
          if (current) {
            set({
              currentStreamingMessage: {
                ...current,
                content: message,
                streaming: true,
              },
            });
          }
        },
        onFinish: (message: string) => {
          log.info("[ChatroomStore] Agent response complete: ", message);

          // Clean up thinking tags if not enabled
          let finalMessage = message;
          if (!useAppConfig.getState().enableThinking) {
            finalMessage = message.replace(/<think>\s*<\/think>/g, "");
          }

          // Publish to room via MQTT as the current agent
          if (finalMessage.trim()) {
            getMqttClient().sendRoomMessageAs(
              roomId,
              finalMessage,
              agentConfig.agentId,
              agentConfig.agentName,
            );
            log.info(
              `[ChatroomStore] Published response to room ${roomId} as ${agentConfig.agentId}`,
            );
          }

          set({
            isGenerating: false,
            currentStreamingMessage: null,
          });
        },
        onError: (error: Error) => {
          log.error("[ChatroomStore] Inference error:", error);
          set({
            isGenerating: false,
            currentStreamingMessage: null,
          });
        },
      });
    },

    abortResponse: () => {
      log.info("[ChatroomStore] Aborting response");
      set({
        isGenerating: false,
        currentStreamingMessage: null,
      });
    },

    resetState: () => {
      set({
        isGenerating: false,
        currentStreamingMessage: null,
      });
    },
  }),
);

/**
 * Stub function to determine if agent should respond.
 * This will be replaced with actual lock acquisition logic in Phase 2.
 *
 * @returns true if agent should respond, false otherwise
 */
export function shouldAgentRespond(): boolean {
  const state = useChatroomStore.getState();

  // Check if auto-respond is enabled (for testing)
  if (!state.autoRespondEnabled) {
    return false;
  }

  // Check if already generating
  if (state.isGenerating) {
    return false;
  }

  // TODO: Phase 2 - Implement actual lock acquisition logic
  // For now, use simple probability-based response
  // This is a placeholder that will be replaced with MQTT lock mechanism
  const probability = 0.3; // 30% chance to respond
  return Math.random() < probability;
}
