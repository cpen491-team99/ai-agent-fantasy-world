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

const MEMORY_ONLY_MODE = true; // set false to use history + memory

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

type MemoryRecord = {
  text: string;
  from?: string;
  location?: string;
  score?: number;
};

/**
 * Format memory records into a compact prompt section.
 * Keep it short so it doesn't eat your entire context window.
 */
function formatMemoryContext(
  textQuery: string,
  records: MemoryRecord[],
): string {
  if (!records.length) return "";

  const top = records.slice(0, 6);
  const lines = top.map((r, idx) => {
    const meta: string[] = [];
    if (r.from) meta.push(`from: ${r.from}`);
    if (r.location) meta.push(`location: ${r.location}`);
    if (typeof r.score === "number" && !Number.isNaN(r.score)) {
      meta.push(`score: ${r.score.toFixed(3)}`);
    }
    const metaStr = meta.length ? ` (${meta.join(", ")})` : "";
    return `${idx + 1}. ${r.text}${metaStr}`;
  });

  return (
    `Retrieved memories for query: "${textQuery}".\n` +
    `Use them only if relevant; otherwise ignore.\n\n` +
    `Memories:\n` +
    lines.join("\n")
  );
}

/**
 * Fetch relevant memories using the existing MQTT request/response.
 * Uses requestId correlation + timeout to avoid hanging inference.
 */
async function fetchRelevantMemories(
  textQuery: string,
  timeoutMs = 1500,
): Promise<MemoryRecord[]> {
  const mqttClient = getMqttClient();

  let requestId: string;
  try {
    requestId = mqttClient.requestMemoryFind(textQuery);
  } catch (e) {
    log.warn("[ChatroomStore] requestMemoryFind failed (MQTT not ready?)", e);
    return [];
  }

  return await new Promise<MemoryRecord[]>((resolve) => {
    let done = false;

    const finish = (records: MemoryRecord[]) => {
      if (done) return;
      done = true;
      try {
        unsub?.();
      } catch {}
      resolve(records);
    };

    // const timer = setTimeout(() => finish([]), timeoutMs);
    const timer = setTimeout(() => {
      console.warn("[Inference] memory find timed out", {
        requestId,
        timeoutMs,
        textQuery: textQuery.slice(0, 120),
      });
      finish([]);
    }, timeoutMs);

    // IMPORTANT: this relies on mqtt.ts emitting "onMemoryFind" to handlerLists.
    const unsub = mqttClient.addHandlers({
      onMemoryFind: (data: any) => {
        if (!data || data.requestId !== requestId) return;

        clearTimeout(timer);

        if (data.error) {
          return finish([]);
        }

        const raw = Array.isArray(data.results) ? data.results : [];

        const cleaned: MemoryRecord[] = raw
          .map((r: any) => ({
            text: String(r?.text ?? "").trim(),
            from: r?.from ? String(r.from) : undefined,
            location: r?.location ? String(r.location) : undefined,
            score:
              typeof r?.score === "number"
                ? r.score
                : r?.score != null
                  ? Number(r.score)
                  : undefined,
          }))
          .filter((r: MemoryRecord) => r.text);

        finish(cleaned);
      },
    });
  });
}

/**
 * Build context messages for agent inference from room history + optional memory.
 * Similar to getMessagesWithMemory in chat.ts but adapted for rooms.
 */
function buildAgentContext(
  roomMessages: ChatMessage[],
  agentConfig: AgentConfig,
  memoryContext?: string,
  maxTokens: number = 4096,
): RequestMessage[] {
  const systemPrompt: RequestMessage = {
    role: "system",
    content: agentConfig.systemPrompt || DEFAULT_AGENT_SYSTEM_PROMPT,
  };

  const memoryPrompt: RequestMessage | null = memoryContext
    ? { role: "user", content: memoryContext }
    : null;

  const contextMessages: RequestMessage[] = [];

  let tokenCount = estimateTokenLength(
    typeof systemPrompt.content === "string" ? systemPrompt.content : "",
  );

  if (memoryPrompt) {
    tokenCount += estimateTokenLength(
      typeof memoryPrompt.content === "string" ? memoryPrompt.content : "",
    );
  }

  // Iterate backwards through messages to get most recent context
  for (let i = roomMessages.length - 1; i >= 0 && tokenCount < maxTokens; i--) {
    const msg = roomMessages[i];
    if (msg.isError || msg.streaming) continue;

    const content = getMessageTextContent(msg);
    const msgTokens = estimateTokenLength(content);

    if (tokenCount + msgTokens > maxTokens) break;

    contextMessages.unshift({
      role: "user",
      content: msg.agentId
        ? `[${msg.model || msg.agentId}]: ${content}`
        : content,
    });

    tokenCount += msgTokens;
  }

  return memoryPrompt
    ? [systemPrompt, memoryPrompt, ...contextMessages]
    : [systemPrompt, ...contextMessages];
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
      void (async () => {
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

        // ---- NEW: fetch relevant memories ----
        // const triggerText = getMessageTextContent(triggerMessage).trim();
        const triggerTextRaw = getMessageTextContent(triggerMessage).trim();

        // remove repetitive tags like "[dog]:" and extra whitespace
        const triggerText = triggerTextRaw
          .replace(/\[[^\]]+\]:\s*/g, "") // remove "[dog]: "
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 300); // cap length

        let memoryContext: string | undefined;
        if (triggerText) {
          const records = await fetchRelevantMemories(triggerText, 5000);

          console.log("[Inference] memory records", {
            agentId: agentConfig.agentId,
            query: triggerText,
            count: records.length,
            preview: records.slice(0, 3),
          });

          const formatted = formatMemoryContext(triggerText, records);

          console.log("[Inference] memoryContext formatted", {
            hasMemoryContext: !!formatted,
            length: formatted.length,
            preview: formatted.slice(0, 200),
          });

          memoryContext = formatted || undefined;
        }

        // Build context from room messages + memory
        // const contextMessages = buildAgentContext(
        //   roomMessages,
        //   agentConfig,
        //   memoryContext,
        //   modelConfig.context_window_size || 4096,
        // );

        const messagesForContext = MEMORY_ONLY_MODE
          ? [triggerMessage] // memory-only: no room history
          : roomMessages; // normal: full recent room history

        const contextMessages = buildAgentContext(
          messagesForContext,
          agentConfig,
          memoryContext,
          modelConfig.context_window_size || 4096,
        );

        console.log("[Inference] building context with memory?", {
          passedMemoryContext: !!memoryContext,
        });

        log.info("[ChatroomStore] Context messages:", contextMessages);

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
      })();
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
