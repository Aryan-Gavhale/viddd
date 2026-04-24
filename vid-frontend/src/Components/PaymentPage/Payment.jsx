import React, { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { CreditCard, Smartphone, DollarSign, Shield, Lock, CheckCircle } from "react-feather"

const PaymentMethod = ({ id, icon: Icon, title, description, selected, onSelect }) => (
  <div
    className={`relative flex items-center justify-between rounded-lg border-2 p-4 cursor-pointer transition-all duration-300 ${
      selected ? "border-indigo-500 bg-indigo-50" : "border-gray-200 hover:border-indigo-300"
    }`}
    onClick={() => onSelect(id)}
  >
    <div className="flex items-center gap-4">
      <div className={`p-2 rounded-full ${selected ? "bg-indigo-500 text-white" : "bg-gray-100 text-gray-500"}`}>
        <Icon size={24} />
      </div>
      <div>
        <h3 className="font-semibold text-lg">{title}</h3>
        <p className="text-sm text-gray-500">{description}</p>
      </div>
    </div>
    <div
      className={`w-6 h-6 rounded-full border-2 ${selected ? "border-indigo-500 bg-indigo-500" : "border-gray-300"}`}
    >
      {selected && <div className="w-3 h-3 bg-white rounded-full m-auto mt-1"></div>}
    </div>
  </div>
)

const PaymentForm = ({ selectedMethod }) => {
  switch (selectedMethod) {
    case "upi":
      return (
        <div className="space-y-4">
          <div>
            <label htmlFor="upiId" className="block text-sm font-medium text-gray-700 mb-1">
              UPI ID
            </label>
            <input
              type="text"
              id="upiId"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="yourname@upi"
            />
          </div>
        </div>
      )
    case "card":
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="cardName" className="block text-sm font-medium text-gray-700 mb-1">
                Cardholder Name
              </label>
              <input
                type="text"
                id="cardName"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="John Doe"
              />
            </div>
            <div>
              <label htmlFor="cardNumber" className="block text-sm font-medium text-gray-700 mb-1">
                Card Number
              </label>
              <input
                type="text"
                id="cardNumber"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="1234 5678 9012 3456"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="expMonth" className="block text-sm font-medium text-gray-700 mb-1">
                Expiry Month
              </label>
              <input
                type="text"
                id="expMonth"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="MM"
              />
            </div>
            <div>
              <label htmlFor="expYear" className="block text-sm font-medium text-gray-700 mb-1">
                Expiry Year
              </label>
              <input
                type="text"
                id="expYear"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="YY"
              />
            </div>
            <div>
              <label htmlFor="cvv" className="block text-sm font-medium text-gray-700 mb-1">
                CVV
              </label>
              <input
                type="password"
                id="cvv"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="123"
              />
            </div>
          </div>
        </div>
      )
    case "razorpay":
    case "paypal":
      return (
        <div className="text-center py-4">
          <p className="text-lg font-medium text-gray-700">
            You will be redirected to {selectedMethod === "razorpay" ? "Razorpay" : "PayPal"} to complete your payment
            securely.
          </p>
        </div>
      )
    default:
      return null
  }
}

export default function PaymentPage() {
  const [selectedMethod, setSelectedMethod] = useState("upi")
  const [isProcessing, setIsProcessing] = useState(false)

  const handlePayment = () => {
    setIsProcessing(true)
    // Simulate payment processing
    setTimeout(() => setIsProcessing(false), 2000)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-pink-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto grid gap-8 md:grid-cols-[1fr_400px]">
        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-md p-6 backdrop-blur-sm bg-opacity-80">
            <h2 className="text-3xl font-bold mb-6 text-gray-800">Choose Payment Method</h2>
            <div className="space-y-4">
              <PaymentMethod
                id="upi"
                icon={Smartphone}
                title="UPI"
                description="Pay using UPI"
                selected={selectedMethod === "upi"}
                onSelect={setSelectedMethod}
              />
              <PaymentMethod
                id="card"
                icon={CreditCard}
                title="Credit/Debit Card"
                description="Pay with Visa, Mastercard, RuPay"
                selected={selectedMethod === "card"}
                onSelect={setSelectedMethod}
              />
              <PaymentMethod
                id="razorpay"
                icon={Lock}
                title="Razorpay"
                description="Fast and secure payments"
                selected={selectedMethod === "razorpay"}
                onSelect={setSelectedMethod}
              />
              <PaymentMethod
                id="paypal"
                icon={DollarSign}
                title="PayPal"
                description="Pay with your PayPal account"
                selected={selectedMethod === "paypal"}
                onSelect={setSelectedMethod}
              />
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={selectedMethod}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="bg-white rounded-2xl shadow-md p-6 backdrop-blur-sm bg-opacity-80"
            >
              <h3 className="text-2xl font-semibold mb-4 text-gray-800">Payment Details</h3>
              <PaymentForm selectedMethod={selectedMethod} />
            </motion.div>
          </AnimatePresence>

          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Lock className="h-4 w-4" />
            <span>Your payment information is encrypted and secure</span>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-md p-6 backdrop-blur-sm bg-opacity-80">
            <h3 className="text-2xl font-semibold mb-4 text-gray-800">Order Summary</h3>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-medium">$99.00</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Tax</span>
                <span className="font-medium">$9.90</span>
              </div>
              <div className="border-t pt-4 mt-4">
                <div className="flex justify-between">
                  <span className="text-lg font-semibold text-gray-800">Total</span>
                  <span className="text-lg font-semibold text-indigo-600">$108.90</span>
                </div>
              </div>
            </div>
            <button
              className={`w-full mt-6 py-3 px-4 rounded-lg text-white font-semibold transition-all duration-300 ${
                isProcessing
                  ? "bg-indigo-400 cursor-not-allowed"
                  : "bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800"
              }`}
              onClick={handlePayment}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <span className="flex items-center justify-center gap-2">
                  <svg
                    className="animate-spin h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Processing...
                </span>
              ) : (
                "Pay Now"
              )}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3 bg-white rounded-xl p-4 shadow-md">
              <Shield className="h-6 w-6 text-indigo-600" />
              <div>
                <h4 className="font-semibold text-gray-800">Secure</h4>
                <p className="text-sm text-gray-500">256-bit encryption</p>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-white rounded-xl p-4 shadow-md">
              <CheckCircle className="h-6 w-6 text-indigo-600" />
              <div>
                <h4 className="font-semibold text-gray-800">Guaranteed</h4>
                <p className="text-sm text-gray-500">Safe checkout</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

