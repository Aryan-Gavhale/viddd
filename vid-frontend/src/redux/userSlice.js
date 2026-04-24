import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  id: null,
  firstname: "",
  lastname: "",
  email: "",
  country: "",
  role: "",
  profilePicture: null,
  isProfileComplete: false,
  _authLoading: true,
};

const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    setUser: (state, action) => {
      return { ...state, ...action.payload, _authLoading: false };
    },
    clearUser: () => {
      return { ...initialState, _authLoading: false };
    },
  },
});

export const { setUser, clearUser } = userSlice.actions;

export const selectUser = (state) => state.user;
export const selectIsAuthenticated = (state) => !!state.user.id;
export const selectUserRole = (state) => state.user.role;
export const selectAuthLoading = (state) => state.user._authLoading;

export default userSlice.reducer;
