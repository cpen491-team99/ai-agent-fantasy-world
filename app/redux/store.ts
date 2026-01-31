import { configureStore } from "@reduxjs/toolkit";
import chatroomsReducer from "./chatroomsSlice";

export const store = configureStore({
  reducer: {
    chatrooms: chatroomsReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
