"use client";

import { useEffect, useRef } from "react";
import { loadGoogleScript } from "@/app/client/googleAuth";

type Props = {
  onCredential: (credential: string) => void;
};

let googleInitialized = false;

export default function GoogleLoginButton({ onCredential }: Props) {
  const buttonRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function setup() {
      await loadGoogleScript();

      if (cancelled || !buttonRef.current || !window.google) return;

      const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
      if (!clientId) {
        console.error("Missing NEXT_PUBLIC_GOOGLE_CLIENT_ID");
        return;
      }

      if (!googleInitialized) {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (response: any) => {
            if (response?.credential) {
              onCredential(response.credential);
            }
          },
        });
        googleInitialized = true;
      }

      buttonRef.current.innerHTML = "";

      window.google.accounts.id.renderButton(buttonRef.current, {
        theme: "outline",
        size: "large",
        text: "signin_with",
        shape: "rectangular",
        width: 250,
      });
    }

    setup().catch((err) => {
      console.error("Google login setup failed:", err);
    });

    return () => {
      cancelled = true;
    };
  }, [onCredential]);

  return <div ref={buttonRef} />;
}
