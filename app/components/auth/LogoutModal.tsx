"use client";

import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/app/redux/hooks";
import { closeLogoutModal, logout } from "@/app/redux/authSlice";

export default function LogoutModal() {
  const dispatch = useAppDispatch();
  const { showLogoutModal, name } = useAppSelector((state) => state.auth);

  useEffect(() => {
    if (!showLogoutModal) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        dispatch(closeLogoutModal());
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [dispatch, showLogoutModal]);

  if (!showLogoutModal) return null;

  const handleLogout = () => {
    dispatch(logout());
  };

  return (
    <div
      onClick={() => dispatch(closeLogoutModal())}
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
          maxWidth: "400px",
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
          <h2 style={{ margin: 0, fontSize: "1.2rem" }}>Log out</h2>
          <button
            type="button"
            onClick={() => dispatch(closeLogoutModal())}
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
          {name
            ? `Do you want to log out, ${name}?`
            : "Do you want to log out?"}
        </p>

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: "12px",
          }}
        >
          <button
            type="button"
            onClick={() => dispatch(closeLogoutModal())}
            style={{
              padding: "10px 16px",
              borderRadius: "10px",
              border: "1px solid #ccc",
              background: "white",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleLogout}
            style={{
              padding: "10px 16px",
              borderRadius: "10px",
              border: "none",
              background: "#d9534f",
              color: "white",
              cursor: "pointer",
            }}
          >
            Log out
          </button>
        </div>
      </div>
    </div>
  );
}
