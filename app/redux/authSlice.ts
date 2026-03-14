import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export type ActiveUserAgent = {
  id: string;
  ownerUserId: string;
  templateId: string;
  name: string;
  imageId: string;
  prompt: string;
  description: string;
  isActive: boolean;
};

export type AuthState = {
  isLoggedIn: boolean;
  showLoginModal: boolean;
  loginStatus: "idle" | "loading" | "authenticated" | "error";
  userId: string | null;
  agentId: string | null;
  googleSub: string | null;
  name: string | null;
  email: string | null;
  picture: string | null;
  lastLoginAt: string | null;
  showLogoutModal: boolean;
  showAgentSelectionModal: boolean;
  activeUserAgent: ActiveUserAgent | null;
};

const initialState: AuthState = {
  isLoggedIn: false,
  showLoginModal: false,
  loginStatus: "idle",
  userId: null,
  agentId: null,
  googleSub: null,
  name: null,
  email: null,
  picture: null,
  lastLoginAt: null,
  showLogoutModal: false,
  showAgentSelectionModal: false,
  activeUserAgent: null,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    openLoginModal(state) {
      state.showLoginModal = true;
    },
    closeLoginModal(state) {
      state.showLoginModal = false;
    },
    setLoginStatus(state, action: PayloadAction<AuthState["loginStatus"]>) {
      state.loginStatus = action.payload;
    },
    openLogoutModal(state) {
      state.showLogoutModal = true;
    },
    closeLogoutModal(state) {
      state.showLogoutModal = false;
    },
    openAgentSelectionModal(state) {
      state.showAgentSelectionModal = true;
    },
    closeAgentSelectionModal(state) {
      state.showAgentSelectionModal = false;
    },
    loginSuccess(
      state,
      action: PayloadAction<{
        userId: string;
        agentId: string | null;
        googleSub: string;
        name: string;
        email: string;
        picture?: string | null;
        lastLoginAt?: string | null;
        activeUserAgent?: ActiveUserAgent | null;
      }>,
    ) {
      state.isLoggedIn = true;
      state.showLoginModal = false;
      state.loginStatus = "authenticated";
      state.userId = action.payload.userId;
      state.agentId = action.payload.agentId;
      state.googleSub = action.payload.googleSub;
      state.name = action.payload.name;
      state.email = action.payload.email;
      state.picture = action.payload.picture ?? null;
      state.lastLoginAt = action.payload.lastLoginAt ?? null;
      state.activeUserAgent = action.payload.activeUserAgent ?? null;
    },
    setActiveUserAgent(state, action: PayloadAction<ActiveUserAgent | null>) {
      state.activeUserAgent = action.payload;
      state.agentId = action.payload?.id ?? null;
    },
    logout(state) {
      state.isLoggedIn = false;
      state.showLoginModal = false;
      state.showLogoutModal = false;
      state.loginStatus = "idle";
      state.userId = null;
      state.agentId = null;
      state.googleSub = null;
      state.name = null;
      state.email = null;
      state.picture = null;
      state.lastLoginAt = null;
      state.showAgentSelectionModal = false;
      state.activeUserAgent = null;
    },
  },
});

export const {
  openLoginModal,
  closeLoginModal,
  openLogoutModal,
  closeLogoutModal,
  openAgentSelectionModal,
  closeAgentSelectionModal,
  setLoginStatus,
  loginSuccess,
  setActiveUserAgent,
  logout,
} = authSlice.actions;

export default authSlice.reducer;
