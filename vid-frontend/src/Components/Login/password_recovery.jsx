import { useState } from "react"
import { KeyRound, ArrowLeft, Loader2, Mail, AlertCircle } from "lucide-react"
import {Link} from "react-router-dom"
import { useNavigate } from "react-router-dom";

export default function PasswordRecovery({ defaultEmail = "" }) {
  const navigate = useNavigate()
  const [email, setEmail] = useState(defaultEmail)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  const isValidEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")

    if (!email.trim() || !isValidEmail(email)) {
      setError("Please enter a valid email address")
      return
    }

    setIsLoading(true)
    try {
      await new Promise((resolve) => setTimeout(resolve, 1500))
      navigate(`/password-recovery/verify?email=${encodeURIComponent(email)}`)
    } catch (err) {
      setError("Something went wrong. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
            <KeyRound className="w-6 h-6 text-purple-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Reset Password</h1>
        </div>

        <p className="text-gray-600">
          Enter your email address and we'll send you instructions to reset your password.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email address
            </label>
            <div className="relative">
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  setError("")
                }}
                placeholder="Enter your email"
                className={`w-full pl-10 pr-4 py-2 bg-transparent border-b-2 ${
                  error ? "border-red-300" : "border-gray-300"
                } focus:outline-none focus:border-gradient-to-r focus:from-purple-600 focus:to-indigo-600
                  transition-colors placeholder:text-gray-400`}
                aria-invalid={error ? "true" : "false"}
                aria-describedby={error ? "email-error" : undefined}
              />
              <Mail className="w-5 h-5 text-gray-400 absolute left-0 top-1/2 transform -translate-y-1/2" />
            </div>
            {error && (
              <div id="email-error" className="flex items-center space-x-1 text-sm text-red-600">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg
              px-6 py-3 font-medium text-sm transition-all duration-300
              ${
                isLoading
                  ? "opacity-80 cursor-not-allowed"
                  : "hover:from-purple-700 hover:to-indigo-700 hover:shadow-lg hover:shadow-purple-500/25 active:scale-[0.98]"
              }
              disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:shadow-none`}
          >
            {isLoading ? (
              <span className="flex items-center justify-center">
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                Sending...
              </span>
            ) : (
              "Send Reset Instructions"
            )}
          </button>
        </form>

        <div className="text-center">
          <Link
            to="/login"
            className="inline-flex items-center text-sm text-gray-600 hover:text-purple-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to login
          </Link>
        </div>
      </div>
    </div>
  )
}

