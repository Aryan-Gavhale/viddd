import React, { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { CreditCard, DollarSign, Building2, ChevronDown, Check, AlertCircle } from "lucide-react"

const Input = ({ label, type = "text", placeholder, value, onChange, required = false }) => (
  <div className="mb-6">
    <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      required={required}
      className="w-full px-4 py-3 bg-white border-b-2 border-indigo-500 focus:border-indigo-700 focus:outline-none transition-colors duration-300"
    />
  </div>
)

const Select = ({ label, options, value, onChange, required = false }) => (
  <div className="mb-6">
    <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
    <div className="relative">
      <select
        value={value}
        onChange={onChange}
        required={required}
        className="w-full px-4 py-3 bg-white border-b-2 border-indigo-500 focus:border-indigo-700 focus:outline-none appearance-none transition-colors duration-300"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-indigo-500" size={20} />
    </div>
  </div>
)

const PaymentMethodIcon = ({ method, isActive }) => {
  const iconClass = `w-6 h-6 ${isActive ? "text-white" : "text-gray-400"}`
  switch (method) {
    case "bank":
      return <Building2 className={iconClass} />
    case "paypal":
      return <DollarSign className={iconClass} />
    case "razorpay":
      return <CreditCard className={iconClass} />
    default:
      return null
  }
}

export default function EditorPaymentDetails() {
  const [paymentMethod, setPaymentMethod] = useState("bank")
  const [bankName, setBankName] = useState("")
  const [accountNumber, setAccountNumber] = useState("")
  const [ifscCode, setIfscCode] = useState("")
  const [paypalEmail, setPaypalEmail] = useState("")
  const [razorpayId, setRazorpayId] = useState("")

  const handleSubmit = (e) => {
    e.preventDefault()
    // Handle form submission here
    console.log("Form submitted")
  }

  const paymentMethods = ["bank", "paypal", "razorpay"]

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-3xl mx-auto"
      >
        <h1 className="text-4xl font-bold mb-2 text-indigo-800">Payment Details</h1>
        <p className="text-indigo-600 mb-8">Enter your preferred payment method to receive earnings from Vidlancing</p>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="bg-white p-2 rounded-full shadow-md relative">
            <div className="flex justify-between items-center relative z-10">
              {paymentMethods.map((method, index) => (
                <motion.button
                  key={method}
                  type="button"
                  onClick={() => setPaymentMethod(method)}
                  className={`flex-1 py-3 px-6 rounded-full flex items-center justify-center space-x-2 transition-colors duration-300`}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <PaymentMethodIcon method={method} isActive={paymentMethod === method} />
                  <span className={`capitalize ${paymentMethod === method ? "text-white" : "text-gray-600"}`}>
                    {method}
                  </span>
                </motion.button>
              ))}
            </div>
            <motion.div
              className="absolute inset-2 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600"
              layoutId="highlight"
              initial={false}
              animate={{
                x: paymentMethods.indexOf(paymentMethod) * 100 + "%",
              }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              style={{
                width: `${100 / paymentMethods.length}%`,
              }}
            />
          </div>

          <div className="bg-white p-8 rounded-lg shadow-lg">
            {paymentMethod === "bank" && (
              <>
                <Input
                  label="Bank Name"
                  placeholder="Enter your bank name"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  required
                />
                <Input
                  label="Account Number"
                  placeholder="Enter your account number"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  required
                />
                <Input
                  label="IFSC Code"
                  placeholder="Enter IFSC code"
                  value={ifscCode}
                  onChange={(e) => setIfscCode(e.target.value)}
                  required
                />
              </>
            )}

            {paymentMethod === "paypal" && (
              <Input
                label="PayPal Email"
                type="email"
                placeholder="Enter your PayPal email"
                value={paypalEmail}
                onChange={(e) => setPaypalEmail(e.target.value)}
                required
              />
            )}

            {paymentMethod === "razorpay" && (
              <Input
                label="Razorpay ID"
                placeholder="Enter your Razorpay ID"
                value={razorpayId}
                onChange={(e) => setRazorpayId(e.target.value)}
                required
              />
            )}

            <Select
              label="Payout Frequency"
              options={[
                { value: "weekly", label: "Weekly" },
                { value: "biweekly", label: "Bi-weekly" },
                { value: "monthly", label: "Monthly" },
              ]}
              value="monthly"
              onChange={() => {}}
              required
            />

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white py-4 rounded-full font-semibold shadow-md hover:from-blue-600 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors duration-300 mt-6"
            >
              Save Payment Details
            </motion.button>
          </div>
        </form>

        <div className="mt-8 flex items-center justify-center space-x-4">
          <div className="flex items-center text-indigo-700">
            <Check className="w-5 h-5 mr-2" />
            <span className="text-sm">Secure Encryption</span>
          </div>
          <div className="flex items-center text-indigo-700">
            <AlertCircle className="w-5 h-5 mr-2" />
            <span className="text-sm">24/7 Support</span>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

