"use client";

import { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "@/app/redux/hooks";
import {
  closeAgentSelectionModal,
  setActiveUserAgent,
} from "@/app/redux/authSlice";
import FoxImg from "@/app/assets/agents/fox.png";
import BunnyImg from "@/app/assets/agents/bunny.png";
import RaccoonImg from "@/app/assets/agents/raccoon.png";
import MouseImg from "@/app/assets/agents/mouse.png";
import DefaultImg from "@/app/assets/agents/default.png";

type AgentTemplate = {
  id: string;
  name: string;
  imageId: string;
  prompt: string;
  description: string;
};

const AGENT_IMAGE_MAP: Record<string, string> = {
  "fox.png": FoxImg.src,
  "bunny.png": BunnyImg.src,
  "raccoon.png": RaccoonImg.src,
  "mouse.png": MouseImg.src,
};

export default function AgentSelectionModal() {
  const dispatch = useAppDispatch();
  const { showAgentSelectionModal, userId } = useAppSelector(
    (state) => state.auth,
  );

  const [templates, setTemplates] = useState<AgentTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!showAgentSelectionModal) return;

    const loadTemplates = async () => {
      try {
        setLoading(true);
        setErrorMessage(null);

        const res = await fetch("http://127.0.0.1:8080/agents/templates");
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data?.error || "Failed to load agent templates.");
        }

        setTemplates(data);
      } catch (err: any) {
        setErrorMessage(err?.message || "Failed to load agent templates.");
      } finally {
        setLoading(false);
      }
    };

    loadTemplates();
  }, [showAgentSelectionModal]);

  if (!showAgentSelectionModal) return null;

  const handleConfirm = async () => {
    if (!userId || !selectedTemplateId) return;

    try {
      setSubmitting(true);
      setErrorMessage(null);

      const res = await fetch("http://127.0.0.1:8080/agents/select", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          templateId: selectedTemplateId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Failed to select agent.");
      }

      dispatch(setActiveUserAgent(data));
      dispatch(closeAgentSelectionModal());
    } catch (err: any) {
      setErrorMessage(err?.message || "Failed to select agent.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 10000,
        padding: "20px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "900px",
          maxHeight: "90vh",
          overflowY: "auto",
          background: "var(--white)",
          borderRadius: "20px",
          padding: "24px",
          boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
        }}
      >
        <h2 style={{ marginTop: 0 }}>Choose Your Agent</h2>
        <p style={{ marginBottom: "20px" }}>
          Select the character you want to begin your journey with.
        </p>

        {loading && <p>Loading agents...</p>}

        {errorMessage && (
          <p style={{ color: "red", marginBottom: "16px" }}>{errorMessage}</p>
        )}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "16px",
          }}
        >
          {templates.map((agent) => {
            const selected = selectedTemplateId === agent.id;

            return (
              <button
                key={agent.id}
                type="button"
                onClick={() => setSelectedTemplateId(agent.id)}
                style={{
                  textAlign: "left",
                  border: selected ? "2px solid #333" : "1px solid #ddd",
                  borderRadius: "16px",
                  padding: "16px",
                  background: selected ? "#f3f3f3" : "white",
                  cursor: "pointer",
                }}
              >
                <img
                  src={AGENT_IMAGE_MAP[agent.imageId] ?? DefaultImg.src}
                  alt={agent.name}
                  style={{
                    width: "100%",
                    height: "180px",
                    objectFit: "cover",
                    borderRadius: "12px",
                    marginBottom: "12px",
                  }}
                />
                <div style={{ fontWeight: 700, marginBottom: "8px" }}>
                  {agent.name}
                </div>
                <div style={{ fontSize: "0.95rem", lineHeight: 1.5 }}>
                  {agent.description}
                </div>
              </button>
            );
          })}
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            marginTop: "24px",
            gap: "12px",
          }}
        >
          <button
            type="button"
            disabled={!selectedTemplateId || submitting}
            onClick={handleConfirm}
            style={{
              padding: "10px 16px",
              borderRadius: "10px",
              border: "none",
              background: "#222",
              color: "white",
              cursor:
                !selectedTemplateId || submitting ? "not-allowed" : "pointer",
              opacity: !selectedTemplateId || submitting ? 0.6 : 1,
            }}
          >
            {submitting ? "Selecting..." : "Confirm Selection"}
          </button>
        </div>
      </div>
    </div>
  );
}
