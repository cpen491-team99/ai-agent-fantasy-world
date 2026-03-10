"use client";

import { useCallback } from "react";
import { useAppDispatch, useAppSelector } from "@/app/redux/hooks";
import { openLoginModal } from "@/app/redux/authSlice";

export function useRequireAuth() {
  const dispatch = useAppDispatch();
  const isLoggedIn = useAppSelector((state) => state.auth.isLoggedIn);

  const requireAuth = useCallback(
    (action?: () => void) => {
      if (isLoggedIn) {
        action?.();
        return true;
      }

      dispatch(openLoginModal());
      return false;
    },
    [dispatch, isLoggedIn],
  );

  return { isLoggedIn, requireAuth };
}
