import { useState, useEffect, useMemo } from "react";
import { FcGoogle } from "react-icons/fc";
import { FaApple, FaEye, FaEyeSlash } from "react-icons/fa";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { setUser } from "../../redux/userSlice";
import axiosInstance from "../../utils/axios";

const PASSWORD_MIN = 8;
const PASSWORD_MAX = 128;
const NAME_MAX = 50;
const EMAIL_MAX = 254;

function getPasswordStrength(pw) {
  if (!pw) return { score: 0, label: "", color: "", width: "0%" };
  let score = 0;
  if (pw.length >= PASSWORD_MIN) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[a-z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[!@#$%^&*(),.?":{}|<>]/.test(pw)) score++;

  if (score <= 2) return { score, label: "Weak", color: "bg-red-500", textColor: "text-red-600", width: "25%" };
  if (score <= 3) return { score, label: "Fair", color: "bg-orange-400", textColor: "text-orange-500", width: "50%" };
  if (score <= 4) return { score, label: "Good", color: "bg-yellow-400", textColor: "text-yellow-600", width: "75%" };
  return { score, label: "Strong", color: "bg-green-500", textColor: "text-green-600", width: "100%" };
}

function getPasswordChecks(pw) {
  return [
    { label: "At least 8 characters", met: pw.length >= PASSWORD_MIN },
    { label: "Uppercase letter (A-Z)", met: /[A-Z]/.test(pw) },
    { label: "Lowercase letter (a-z)", met: /[a-z]/.test(pw) },
    { label: "Number (0-9)", met: /[0-9]/.test(pw) },
    { label: "Special character (!@#$...)", met: /[!@#$%^&*(),.?":{}|<>]/.test(pw) },
  ];
}

const COUNTRIES = [
  { code: "IN", name: "India" },
  { code: "US", name: "United States" },
  { code: "UK", name: "United Kingdom" },
  { code: "CA", name: "Canada" },
  { code: "AU", name: "Australia" },
  { code: "DE", name: "Germany" },
  { code: "FR", name: "France" },
  { code: "JP", name: "Japan" },
  { code: "BR", name: "Brazil" },
  { code: "SG", name: "Singapore" },
];

export default function ModernSignupForm() {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const roleFromJoin = new URLSearchParams(location.search).get("role") || null;

  const [serverError, setServerError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [touched, setTouched] = useState({});
  const [formData, setFormData] = useState({
    firstname: "",
    lastname: "",
    email: "",
    password: "",
    country: "",
    role: roleFromJoin ? roleFromJoin.toUpperCase() : null,
    acceptTerms: false,
  });

  useEffect(() => {
    if (roleFromJoin) {
      setFormData((prev) => ({ ...prev, role: roleFromJoin.toUpperCase() }));
    }
  }, [roleFromJoin]);

  const fieldErrors = useMemo(() => {
    const e = {};
    if (touched.firstname && !formData.firstname.trim()) e.firstname = "First name is required";
    else if (touched.firstname && formData.firstname.length > NAME_MAX) e.firstname = `Max ${NAME_MAX} characters`;

    if (touched.lastname && !formData.lastname.trim()) e.lastname = "Last name is required";
    else if (touched.lastname && formData.lastname.length > NAME_MAX) e.lastname = `Max ${NAME_MAX} characters`;

    if (touched.email) {
      if (!formData.email.trim()) e.email = "Email is required";
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) e.email = "Enter a valid email address";
      else if (formData.email.length > EMAIL_MAX) e.email = `Max ${EMAIL_MAX} characters`;
    }

    if (touched.password) {
      const pw = formData.password;
      if (!pw) e.password = "Password is required";
      else if (pw.length < PASSWORD_MIN) e.password = `At least ${PASSWORD_MIN} characters required`;
      else if (pw.length > PASSWORD_MAX) e.password = `Max ${PASSWORD_MAX} characters`;
      else {
        const missing = [];
        if (!/[A-Z]/.test(pw)) missing.push("uppercase letter");
        if (!/[a-z]/.test(pw)) missing.push("lowercase letter");
        if (!/[0-9]/.test(pw)) missing.push("number");
        if (!/[!@#$%^&*(),.?":{}|<>]/.test(pw)) missing.push("special character");
        if (missing.length > 0) e.password = `Must include: ${missing.join(", ")}`;
      }
    }

    if (touched.country && !formData.country) e.country = "Please select a country";
    return e;
  }, [formData, touched]);

  const strength = useMemo(() => getPasswordStrength(formData.password), [formData.password]);
  const checks = useMemo(() => getPasswordChecks(formData.password), [formData.password]);

  const isFormValid =
    formData.firstname.trim() &&
    formData.lastname.trim() &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email) &&
    formData.password.length >= PASSWORD_MIN &&
    /[A-Z]/.test(formData.password) &&
    /[a-z]/.test(formData.password) &&
    /[0-9]/.test(formData.password) &&
    /[!@#$%^&*(),.?":{}|<>]/.test(formData.password) &&
    formData.country &&
    formData.role &&
    formData.acceptTerms;

  const handleBlur = (field) => setTouched((prev) => ({ ...prev, [field]: true }));

  const handleChange = (field, value) => {
    setServerError("");
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched({ firstname: true, lastname: true, email: true, password: true, country: true });

    if (!isFormValid) return;

    setLoading(true);
    setServerError("");
    setSuccess("");

    try {
      const response = await axiosInstance.post("/users/register", {
        firstname: formData.firstname.trim(),
        lastname: formData.lastname.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        country: formData.country,
        role: formData.role,
      });
      const { user } = response.data.data;
      dispatch(setUser(user));
      setSuccess("Account created successfully! Redirecting...");

      if (user.role === "FREELANCER") {
        setTimeout(() => navigate("/create-profile"), 1000);
      } else {
        setTimeout(() => navigate("/client/dashboard"), 1000);
      }
    } catch (error) {
      const res = error.response?.data;
      if (res?.data && Array.isArray(res.data)) {
        const msgs = res.data.map((d) => d.message);
        setServerError(msgs.join(". "));
      } else {
        setServerError(res?.message || "Registration failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const inputBase =
    "w-full px-4 py-3 rounded-lg border bg-white text-gray-900 placeholder-gray-400 transition-all duration-200 focus:outline-none focus:ring-2 text-sm";
  const inputOk = "border-gray-300 focus:border-indigo-500 focus:ring-indigo-200";
  const inputErr = "border-red-400 focus:border-red-500 focus:ring-red-200";

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Left panel */}
      <div className="hidden lg:flex w-1/2 relative bg-gradient-to-br from-indigo-600 via-purple-600 to-blue-700 items-center justify-center p-12">
        <div className="max-w-md text-white space-y-6">
          <h1 className="text-4xl font-bold leading-tight">
            {formData.role === "FREELANCER"
              ? "Launch your freelancing career"
              : "Find top video editors"}
          </h1>
          <p className="text-indigo-100 text-lg">
            {formData.role === "FREELANCER"
              ? "Join thousands of video editors showcasing their skills and landing projects on Vidlancing."
              : "Connect with talented editors and bring your creative vision to life."}
          </p>
          <div className="flex items-center gap-3 pt-4">
            <div className="flex -space-x-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="w-8 h-8 rounded-full bg-white/20 border-2 border-white/40 flex items-center justify-center text-xs font-bold">
                  {String.fromCharCode(64 + i)}
                </div>
              ))}
            </div>
            <p className="text-indigo-100 text-sm">Trusted by 10,000+ creators</p>
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12">
        <div className="max-w-md w-full space-y-6">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Create your account</h2>
            <p className="mt-1 text-gray-500">
              Joining as{" "}
              <span className="font-medium text-indigo-600">
                {formData.role === "CLIENT" ? "a Client" : formData.role === "FREELANCER" ? "a Freelancer" : "..."}
              </span>
              {" · "}
              <Link to="/join" className="text-indigo-600 hover:underline text-sm">Change</Link>
            </p>
          </div>

          {serverError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
              <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <p className="text-red-700 text-sm">{serverError}</p>
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2">
              <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <p className="text-green-700 text-sm font-medium">{success}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {/* Name row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="firstname" className="block text-sm font-medium text-gray-700 mb-1">First name</label>
                <input
                  id="firstname"
                  type="text"
                  maxLength={NAME_MAX}
                  className={`${inputBase} ${fieldErrors.firstname ? inputErr : inputOk}`}
                  placeholder="John"
                  value={formData.firstname}
                  onChange={(e) => handleChange("firstname", e.target.value)}
                  onBlur={() => handleBlur("firstname")}
                  disabled={loading || !!success}
                />
                {fieldErrors.firstname && <p className="mt-1 text-xs text-red-500">{fieldErrors.firstname}</p>}
              </div>
              <div>
                <label htmlFor="lastname" className="block text-sm font-medium text-gray-700 mb-1">Last name</label>
                <input
                  id="lastname"
                  type="text"
                  maxLength={NAME_MAX}
                  className={`${inputBase} ${fieldErrors.lastname ? inputErr : inputOk}`}
                  placeholder="Doe"
                  value={formData.lastname}
                  onChange={(e) => handleChange("lastname", e.target.value)}
                  onBlur={() => handleBlur("lastname")}
                  disabled={loading || !!success}
                />
                {fieldErrors.lastname && <p className="mt-1 text-xs text-red-500">{fieldErrors.lastname}</p>}
              </div>
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email address</label>
              <input
                id="email"
                type="email"
                maxLength={EMAIL_MAX}
                autoComplete="email"
                className={`${inputBase} ${fieldErrors.email ? inputErr : inputOk}`}
                placeholder="john@example.com"
                value={formData.email}
                onChange={(e) => handleChange("email", e.target.value)}
                onBlur={() => handleBlur("email")}
                disabled={loading || !!success}
              />
              {fieldErrors.email && <p className="mt-1 text-xs text-red-500">{fieldErrors.email}</p>}
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  maxLength={PASSWORD_MAX}
                  autoComplete="new-password"
                  className={`${inputBase} pr-10 ${fieldErrors.password ? inputErr : inputOk}`}
                  placeholder="Create a strong password"
                  value={formData.password}
                  onChange={(e) => handleChange("password", e.target.value)}
                  onBlur={() => handleBlur("password")}
                  disabled={loading || !!success}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <FaEyeSlash size={16} /> : <FaEye size={16} />}
                </button>
              </div>

              {/* Strength bar */}
              {formData.password && (
                <div className="mt-2 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-300 ${strength.color}`} style={{ width: strength.width }} />
                    </div>
                    <span className={`text-xs font-medium ${strength.textColor}`}>{strength.label}</span>
                  </div>
                  <ul className="grid grid-cols-2 gap-x-4 gap-y-0.5">
                    {checks.map((c) => (
                      <li key={c.label} className={`text-xs flex items-center gap-1.5 ${c.met ? "text-green-600" : "text-gray-400"}`}>
                        {c.met ? (
                          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
                        ) : (
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" strokeWidth="2"/></svg>
                        )}
                        {c.label}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {fieldErrors.password && touched.password && strength.score <= 2 && (
                <p className="mt-1 text-xs text-red-500 font-medium">A strong password is required to protect your account.</p>
              )}
            </div>

            {/* Country */}
            <div>
              <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-1">Country</label>
              <select
                id="country"
                className={`${inputBase} ${fieldErrors.country ? inputErr : inputOk}`}
                value={formData.country}
                onChange={(e) => handleChange("country", e.target.value)}
                onBlur={() => handleBlur("country")}
                disabled={loading || !!success}
              >
                <option value="">Select your country</option>
                {COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>{c.name}</option>
                ))}
              </select>
              {fieldErrors.country && <p className="mt-1 text-xs text-red-500">{fieldErrors.country}</p>}
            </div>

            <input type="hidden" name="role" value={formData.role || ""} />

            {/* Terms */}
            <div className="flex items-start gap-2">
              <input
                id="accept-terms"
                type="checkbox"
                className="mt-0.5 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                checked={formData.acceptTerms}
                onChange={(e) => handleChange("acceptTerms", e.target.checked)}
                disabled={loading || !!success}
              />
              <label htmlFor="accept-terms" className="text-sm text-gray-600 leading-tight">
                I agree to the{" "}
                <a href="#" className="text-indigo-600 hover:underline">Terms of Service</a>{" "}
                and{" "}
                <a href="#" className="text-indigo-600 hover:underline">Privacy Policy</a>
              </label>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || !isFormValid || !!success}
              className="w-full py-3 px-4 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                  Creating account...
                </>
              ) : success ? (
                "Redirecting..."
              ) : (
                "Create Account"
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div>
            <div className="relative flex justify-center text-sm"><span className="bg-gray-50 px-3 text-gray-400">or continue with</span></div>
          </div>

          {/* Social buttons */}
          <div className="grid grid-cols-2 gap-3">
            <button type="button" className="flex items-center justify-center gap-2 py-2.5 px-4 border border-gray-300 rounded-lg bg-white text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
              <FcGoogle className="w-5 h-5" /> Google
            </button>
            <button type="button" className="flex items-center justify-center gap-2 py-2.5 px-4 border border-gray-300 rounded-lg bg-white text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
              <FaApple className="w-5 h-5 text-black" /> Apple
            </button>
          </div>

          <p className="text-center text-sm text-gray-500">
            Already have an account?{" "}
            <Link to="/login" className="text-indigo-600 font-medium hover:underline">Log in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
