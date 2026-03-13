import { configureStore } from "@reduxjs/toolkit";
import chatroomsReducer from "./chatroomsSlice";
import authReducer from "./authSlice";

export const store = configureStore({
  reducer: {
    chatrooms: chatroomsReducer,
    auth: authReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
