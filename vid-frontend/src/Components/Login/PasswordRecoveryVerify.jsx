import { useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { ShieldCheck, ArrowLeft, Loader2, Lock, Eye, EyeOff, CheckCircle } from "lucide-react";
import axiosInstance from "../../api/axiosInstance";
import { toast } from "react-toastify";

export default function PasswordRecoveryVerify() {
  const [searchParams] = useSearchParams();
  const email = searchParams.get("email") || "";
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState("verify");
  const [loading, setLoading] = useState(false);

  const handleVerify = async (e) => {
    e.preventDefault();
    if (!code.trim()) { toast.error("Enter the verification code"); return; }
    if (newPassword.length < 8) { toast.error("Password must be at least 8 characters"); return; }
    if (newPassword !== confirmPassword) { toast.error("Passwords do not match"); return; }

    setLoading(true);
    try {
      await axiosInstance.post("/users/reset-password", { email, code, newPassword });
      setStep("success");
      toast.success("Password reset successfully!");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Reset failed. Check your code and try again.");
    } finally {
      setLoading(false);
    }
  };

  if (step === "success") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
        <div className="w-full max-w-md text-center space-y-6">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Password Reset!</h1>
          <p className="text-gray-600">Your password has been updated successfully. You can now log in with your new password.</p>
          <Link to="/login" className="inline-block px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg font-medium hover:from-purple-700 hover:to-indigo-700 transition-all">
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
            <ShieldCheck className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Verify & Reset</h1>
            <p className="text-sm text-gray-500">{email}</p>
          </div>
        </div>

        <p className="text-gray-600">Enter the code sent to your email and choose a new password.</p>

        <form onSubmit={handleVerify} className="space-y-5">
          <div className="space-y-1">
            <label htmlFor="code" className="block text-sm font-medium text-gray-700">Verification Code</label>
            <input id="code" type="text" value={code} onChange={(e) => setCode(e.target.value)}
              placeholder="Enter code from email" autoComplete="one-time-code"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition" />
          </div>

          <div className="space-y-1">
            <label htmlFor="new-password" className="block text-sm font-medium text-gray-700">New Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input id="new-password" type={showPassword ? "text" : "password"} value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)} placeholder="Minimum 8 characters"
                className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition" />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-1">
            <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700">Confirm Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input id="confirm-password" type={showPassword ? "text" : "password"} value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Re-enter password"
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition" />
            </div>
          </div>

          <button type="submit" disabled={loading}
            className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg px-6 py-3 font-medium transition-all hover:from-purple-700 hover:to-indigo-700 hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed">
            {loading ? <span className="flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin mr-2" />Resetting...</span> : "Reset Password"}
          </button>
        </form>

        <div className="text-center">
          <Link to="/password-recovery" className="inline-flex items-center text-sm text-gray-600 hover:text-purple-600 transition-colors">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Link>
        </div>
      </div>
    </div>
  );
}
