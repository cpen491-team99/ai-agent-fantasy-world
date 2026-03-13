"use client";

import { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "@/app/redux/hooks";
import {
  closeLoginModal,
  loginSuccess,
  setLoginStatus,
  openAgentSelectionModal,
} from "@/app/redux/authSlice";
import GoogleLoginButton from "@/app/components/auth/GoogleLoginButton";

type Props = {
  onCredential?: (credential: string) => Promise<void> | void;
};

export default function LoginModal({ onCredential }: Props) {
  const dispatch = useAppDispatch();
  const { showLoginModal, loginStatus } = useAppSelector((state) => state.auth);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!showLoginModal) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        dispatch(closeLoginModal());
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [dispatch, showLoginModal]);

  if (!showLoginModal) return null;

  const handleCredential = async (credential: string) => {
    if (onCredential) {
      await onCredential(credential);
      return;
    }

    try {
      setErrorMessage(null);
      dispatch(setLoginStatus("loading"));

      console.log("[LOGIN] Sending credential to backend");

      const response = await fetch("http://127.0.0.1:8080/auth/google", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ credential }),
      });

      const data = await response.json();

      console.log("[LOGIN] Backend response:", data);

      if (!response.ok) {
        throw new Error(data?.error || "Login failed.");
      }

      dispatch(
        loginSuccess({
          userId: data.userId,
          agentId: data.agentId,
          googleSub: data.googleSub,
          name: data.name,
          email: data.email,
          picture: data.picture ?? null,
          lastLoginAt: data.lastLoginAt ?? null,
          activeUserAgent: data.activeUserAgent ?? null,
        }),
      );

      if (!data.activeUserAgent) {
        dispatch(openAgentSelectionModal());
      }
      console.log("[LOGIN] Redux login success:", data);
    } catch (err: any) {
      console.error("Login failed:", err);
      setErrorMessage(err?.message ?? "Login failed.");
      dispatch(setLoginStatus("error"));
    }
  };

  return (
    <div
      onClick={() => dispatch(closeLoginModal())}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: "16px",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: "420px",
          background: "var(--white)",
          borderRadius: "16px",
          padding: "24px",
          boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "12px",
          }}
        >
          <h2 style={{ margin: 0, fontSize: "1.25rem" }}>Sign in</h2>
          <button
            type="button"
            onClick={() => dispatch(closeLoginModal())}
            style={{
              border: "none",
              background: "transparent",
              fontSize: "1.25rem",
              cursor: "pointer",
            }}
          >
            ×
          </button>
        </div>

        <p style={{ marginTop: 0, marginBottom: "20px", lineHeight: 1.5 }}>
          Please sign in with Google to continue.
        </p>

        <div style={{ display: "flex", justifyContent: "center" }}>
          <GoogleLoginButton onCredential={handleCredential} />
        </div>

        {loginStatus === "loading" && (
          <p style={{ marginTop: "16px", textAlign: "center" }}>
            Signing in...
          </p>
        )}

        {errorMessage && (
          <p style={{ marginTop: "16px", textAlign: "center", color: "red" }}>
            {errorMessage}
          </p>
        )}
      </div>
    </div>
  );
}
