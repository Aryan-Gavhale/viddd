"use client";

import { useState, useMemo } from "react";
import { FcGoogle } from "react-icons/fc";
import { FaApple, FaEye, FaEyeSlash } from "react-icons/fa";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import axiosInstance from "../../utils/axios";
import { useDispatch } from "react-redux";
import { setUser } from "../../redux/userSlice";

const EMAIL_MAX = 254;

/**
 * Paths that only make sense for a specific role. We use this to ignore a
 * stale `from` path (e.g. a freelancer was on /create-profile, logged out, and
 * a different user later signs in on the same machine — they should NOT be
 * thrown back into the freelancer onboarding flow).
 */
const ROLE_RESTRICTED_PREFIXES = {
  FREELANCER: ["/editor", "/create-profile", "/onboarding"],
  CLIENT: ["/client"],
  ADMIN: ["/admin"],
};

function isPathAllowedForRole(path, role) {
  if (!path) return false;
  for (const [r, prefixes] of Object.entries(ROLE_RESTRICTED_PREFIXES)) {
    if (prefixes.some((p) => path === p || path.startsWith(`${p}/`) || path.startsWith(p))) {
      return r === role;
    }
  }
  return true;
}

export default function Login() {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = location.state?.from?.pathname || null;

  const [formData, setFormData] = useState({ email: "", password: "", rememberMe: false });
  const [serverError, setServerError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [touched, setTouched] = useState({});

  const fieldErrors = useMemo(() => {
    const e = {};
    if (touched.email) {
      if (!formData.email.trim()) e.email = "Email is required";
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) e.email = "Enter a valid email address";
    }
    if (touched.password && !formData.password) e.password = "Password is required";
    return e;
  }, [formData, touched]);

  const isValid = formData.email.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email) && formData.password;

  const handleBlur = (f) => setTouched((p) => ({ ...p, [f]: true }));
  const handleChange = (f, v) => { setServerError(""); setFormData((p) => ({ ...p, [f]: v })); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched({ email: true, password: true });
    if (!isValid) return;

    setLoading(true);
    setServerError("");
    setSuccess("");

    try {
      const response = await axiosInstance.post("/users/login", {
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
      });
      const { user } = response.data.data;
      dispatch(setUser(user));
      setSuccess("Logged in successfully!");

      const defaultDest =
        user?.role === "FREELANCER"
          ? user?.isProfileComplete ? "/editor/dashboard" : "/create-profile"
          : user?.role === "ADMIN"
            ? "/admin"
            : "/client/dashboard";
      // Only honor `redirectTo` if it's a path the freshly-signed-in user is
      // actually allowed to visit. Otherwise the role's default dashboard.
      const dest = isPathAllowedForRole(redirectTo, user?.role) ? redirectTo : defaultDest;
      setTimeout(() => navigate(dest, { replace: true }), 600);
    } catch (err) {
      const msg = err.response?.data?.message;
      if (msg?.toLowerCase().includes("locked")) {
        setServerError(msg);
      } else if (err.response?.status === 401 || err.response?.status === 400) {
        setServerError("Invalid email or password. Please try again.");
      } else {
        setServerError(msg || "Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const inputBase = "w-full px-4 py-3 rounded-lg border bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 transition-all duration-200 focus:outline-none focus:ring-2 text-sm";
  const inputOk = "border-gray-300 dark:border-slate-700 focus:border-indigo-500 focus:ring-indigo-200 dark:focus:ring-indigo-900/50";
  const inputErr = "border-red-400 focus:border-red-500 focus:ring-red-200";

  return (
    <div className="min-h-screen flex bg-gray-50 dark:bg-slate-950">
      {/* Left panel */}
      <div className="hidden lg:flex w-1/2 relative bg-gradient-to-br from-indigo-600 via-purple-600 to-blue-700 items-center justify-center p-12">
        <div className="max-w-md text-white space-y-6">
          <h1 className="text-4xl font-bold leading-tight">{t("auth.loginTitle", "Welcome back to Vidlancing")}</h1>
          <p className="text-indigo-100 text-lg">
            {t("auth.loginSubtitle", "Pick up where you left off. Your projects, messages, and opportunities are waiting.")}
          </p>
          <div className="grid grid-cols-3 gap-4 pt-4">
            {[
              { n: "10K+", l: "Creators" },
              { n: "50K+", l: "Projects" },
              { n: "4.9", l: "Rating" },
            ].map((s) => (
              <div key={s.l} className="text-center">
                <p className="text-2xl font-bold">{s.n}</p>
                <p className="text-indigo-200 text-sm">{s.l}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12">
        <div className="max-w-md w-full space-y-6">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-slate-100">{t("auth.login", "Log in")}</h2>
            <p className="mt-1 text-gray-500 dark:text-slate-400">{t("auth.loginCredentialsPrompt", "Enter your credentials to access your account")}</p>
          </div>

          {serverError && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 flex items-start gap-2">
              <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <p className="text-red-700 dark:text-red-300 text-sm">{serverError}</p>
            </div>
          )}

          {success && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 flex items-center gap-2">
              <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <p className="text-green-700 dark:text-green-300 text-sm font-medium">{success}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">{t("auth.email", "Email address")}</label>
              <input
                id="email"
                type="email"
                maxLength={EMAIL_MAX}
                autoComplete="email"
                className={`${inputBase} ${fieldErrors.email ? inputErr : inputOk}`}
                placeholder="you@example.com"
                value={formData.email}
                onChange={(e) => handleChange("email", e.target.value)}
                onBlur={() => handleBlur("email")}
                disabled={loading || !!success}
              />
              {fieldErrors.email && <p className="mt-1 text-xs text-red-500">{fieldErrors.email}</p>}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="password" className="text-sm font-medium text-gray-700 dark:text-slate-300">{t("auth.password", "Password")}</label>
                <Link to="/password-recovery" className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline">{t("auth.forgotPassword", "Forgot password?")}</Link>
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  className={`${inputBase} pr-10 ${fieldErrors.password ? inputErr : inputOk}`}
                  placeholder={t("auth.enterPassword", "Enter your password")}
                  value={formData.password}
                  onChange={(e) => handleChange("password", e.target.value)}
                  onBlur={() => handleBlur("password")}
                  disabled={loading || !!success}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-slate-300"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <FaEyeSlash size={16} /> : <FaEye size={16} />}
                </button>
              </div>
              {fieldErrors.password && <p className="mt-1 text-xs text-red-500">{fieldErrors.password}</p>}
            </div>

            <div className="flex items-center">
              <input
                id="remember-me"
                type="checkbox"
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 dark:border-slate-700 rounded"
                checked={formData.rememberMe}
                onChange={(e) => handleChange("rememberMe", e.target.checked)}
                disabled={loading || !!success}
              />
              <label htmlFor="remember-me" className="ml-2 text-sm text-gray-600 dark:text-slate-400">{t("auth.rememberMe", "Remember me")}</label>
            </div>

            <button
              type="submit"
              disabled={loading || !isValid || !!success}
              className="w-full py-3 px-4 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                  {t("auth.loggingIn", "Logging in…")}
                </>
              ) : success ? (
                t("auth.redirecting", "Redirecting…")
              ) : (
                t("auth.login", "Log in")
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200 dark:border-slate-700" /></div>
            <div className="relative flex justify-center text-sm"><span className="bg-gray-50 dark:bg-slate-950 px-3 text-gray-400 dark:text-slate-500">{t("auth.orContinueWith", "or continue with")}</span></div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button type="button" className="flex items-center justify-center gap-2 py-2.5 px-4 border border-gray-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-sm font-medium text-gray-600 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">
              <FcGoogle className="w-5 h-5" /> Google
            </button>
            <button type="button" className="flex items-center justify-center gap-2 py-2.5 px-4 border border-gray-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-sm font-medium text-gray-600 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">
              <FaApple className="w-5 h-5 text-black dark:text-white" /> Apple
            </button>
          </div>

          <p className="text-center text-sm text-gray-500 dark:text-slate-400">
            {t("auth.noAccount", "Don't have an account?")}{" "}
            <Link to="/join" className="text-indigo-600 dark:text-indigo-400 font-medium hover:underline">{t("auth.signup", "Sign up")}</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
