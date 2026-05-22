import { configureStore } from "@reduxjs/toolkit";
import userReducer from "./userSlice";
import preferencesReducer from "./preferencesSlice";

const store = configureStore({
  reducer: {
    user: userReducer,
    preferences: preferencesReducer,
  },
});

export default store;
