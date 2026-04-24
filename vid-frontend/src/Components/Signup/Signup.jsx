import { useState, useEffect } from "react";
import { FcGoogle } from "react-icons/fc";
import { FaApple } from "react-icons/fa";
import { Link, useLocation } from "react-router-dom";
import { useDispatch } from "react-redux";
import { setUser } from "../../redux/userSlice";
import axiosInstance from "../../utils/axios"; // Adjusted path

export default function ModernSignupForm() {
  const location = useLocation();
  const dispatch = useDispatch();
  const roleFromJoin = new URLSearchParams(location.search).get("role") || null;

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
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
    console.log("roleFromJoin:", roleFromJoin);
    console.log("formData.role:", formData.role);
  }, [roleFromJoin]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    if (!formData.acceptTerms) {
      setError("You must accept the Terms and Conditions to sign up.");
      setLoading(false);
      return;
    }

    if (!formData.role) {
      setError("No role selected. Please go back to the join page and choose a role.");
      setLoading(false);
      return;
    }

    try {
      const response = await axiosInstance.post("/users/register", formData);
      const { user } = response.data.data;
      dispatch(setUser(user));
      setSuccess("You’ve successfully registered! Setting up your account...");
      setFormData({
        firstname: "",
        lastname: "",
        email: "",
        password: "",
        country: "",
        role: roleFromJoin ? roleFromJoin.toUpperCase() : null,
        acceptTerms: false,
      });
    } catch (error) {
      console.error("Registration error:", error);
      setError(error.response?.data?.message || "An error occurred during registration.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <div
        className="hidden lg:flex w-1/2 bg-cover bg-center"
        style={{ backgroundImage: "url('https://source.unsplash.com/random?minimalist')" }}
      ></div>
      <div className="w-full lg:w-1/2 flex items-center justify-center p-12">
        <div className="max-w-md w-full space-y-8">
          <div>
            <h2 className="mt-6 text-center text-4xl font-extrabold text-gray-900">Create your account</h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              Joining as a{" "}
              {formData.role === "CLIENT"
                ? "client"
                : formData.role === "FREELANCER"
                ? "freelancer"
                : "user"} – Start your journey
            </p>
          </div>
          {error && <p className="text-center text-red-600 text-sm">{error}</p>}
          {success && (
            <div className="text-center text-green-600 text-sm">
              {success}
            </div>
          )}
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-6">
              <div className="flex space-x-4">
                <div className="flex-1">
                  <input
                    id="firstname"
                    name="firstname"
                    type="text"
                    required
                    className="bg-gray-50 appearance-none block w-full px-0 py-2 border-0 border-b-2 border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-0 focus:border-indigo-600 transition duration-150 ease-in-out text-lg font-light"
                    placeholder="First Name"
                    value={formData.firstname}
                    onChange={(e) => setFormData({ ...formData, firstname: e.target.value })}
                    disabled={loading}
                  />
                </div>
                <div className="flex-1">
                  <input
                    id="lastname"
                    name="lastname"
                    type="text"
                    required
                    className="bg-gray-50 appearance-none block w-full px-0 py-2 border-0 border-b-2 border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring- thwarted-indigo-600 transition duration-150 ease-in-out text-lg font-light"
                    placeholder="Last Name"
                    value={formData.lastname}
                    onChange={(e) => setFormData({ ...formData, lastname: e.target.value })}
                    disabled={loading}
                  />
                </div>
              </div>
              <div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="bg-gray-50 appearance-none block w-full px-0 py-2 border-0 border-b-2 border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-0 focus:border-indigo-600 transition duration-150 ease-in-out text-lg font-light"
                  placeholder="Email address"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  disabled={loading}
                />
              </div>
              <div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  className="bg-gray-50 appearance-none block w-full px-0 py-2 border-0 border-b-2 border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-0 focus:border-indigo-600 transition duration-150 ease-in-out text-lg font-light"
                  placeholder="Password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  disabled={loading}
                />
              </div>
              <div className="relative">
                <select
                  id="country"
                  name="country"
                  required
                  className="bg-gray-50 appearance-none block w-full px-0 py-2 border-0 border-b-2 border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-0 focus:border-indigo-600 transition duration-150 ease-in-out text-lg font-light"
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  disabled={loading}
                >
                  <option value="" disabled>
                    Select a country
                  </option>
                  <option value="IN">India</option>
                  <option value="US">United States</option>
                  <option value="UK">United Kingdom</option>
                  <option value="CA">Canada</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                  <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                    <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                  </svg>
                </div>
              </div>
              <input type="hidden" name="role" value={formData.role || ""} />
            </div>

            <div className="flex items-center">
              <input
                id="accept-terms"
                name="accept-terms"
                type="checkbox"
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                checked={formData.acceptTerms}
                onChange={(e) => setFormData({ ...formData, acceptTerms: e.target.checked })}
                disabled={loading}
              />
              <label htmlFor="accept-terms" className="ml-2 block text-sm text-gray-900">
                I accept the{" "}
                <a href="#" className="font-medium text-indigo-600 hover:text-indigo-500">
                  Terms and Conditions
                </a>
              </label>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading || !formData.acceptTerms || !formData.role}
                className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition duration-150 ease-in-out disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {loading ? "Signing up..." : "Sign up"}
              </button>
            </div>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-gray-50 text-gray-500">Or continue with</span>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <div>
                <a
                  href="#"
                  className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 transition duration-150 ease-in-out"
                >
                  <span className="sr-only">Sign up with Google</span>
                  <FcGoogle className="w-5 h-5" />
                </a>
              </div>
              <div>
                <a
                  href="#"
                  className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 transition duration-150 ease-in-out"
                >
                  <span className="sr-only">Sign up with Apple</span>
                  <FaApple className="w-5 h-5 text-black" />
                </a>
              </div>
            </div>
          </div>

          <p className="mt-2 text-center text-sm text-gray-600">
            Already have an account?{" "}
            <Link to="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}