import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { setUser, clearUser, selectUser } from "../redux/userSlice";
import axiosInstance from "../utils/axios";

export const authLogoutRef = { current: false };

const useAuth = () => {
  const dispatch = useDispatch();
  const user = useSelector(selectUser);

  useEffect(() => {
    if (user?.id) {
      authLogoutRef.current = false;
      return;
    }
    if (authLogoutRef.current) return;

    const restoreUser = async () => {
      try {
        const response = await axiosInstance.get("/users/me");
        const userData = response.data.data;
        dispatch(setUser(userData));
      } catch {
        dispatch(clearUser());
      }
    };

    void restoreUser();
  }, [dispatch, user?.id]);

  return user;
};

export default useAuth;
