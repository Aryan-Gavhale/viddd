import { Navigate, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { selectIsAuthenticated, selectUserRole, selectAuthLoading, selectUser } from "../redux/userSlice";

const PROFILE_EXEMPT_PATHS = ["/create-profile", "/onboarding", "/settings", "/logout"];

const ProtectedRoute = ({ children, allowedRoles }) => {
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const role = useSelector(selectUserRole);
  const user = useSelector(selectUser);
  const isLoading = useSelector(selectAuthLoading);
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to="/" replace />;
  }

  const isExempt = PROFILE_EXEMPT_PATHS.some((p) => location.pathname.startsWith(p));
  if (
    role === "FREELANCER" &&
    user.isProfileComplete === false &&
    !isExempt
  ) {
    return <Navigate to="/create-profile" replace />;
  }

  return children;
};

export default ProtectedRoute;
