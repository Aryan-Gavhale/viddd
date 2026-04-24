import { useState, useEffect } from "react"
import { useParams, useNavigate, useLocation } from "react-router-dom"
import {
  CreditCardIcon,
  DevicePhoneMobileIcon,
  BuildingLibraryIcon,
  WalletIcon,
  ShieldCheckIcon,
  ClockIcon,
  TagIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline"


export default function PaymentPage() {
  const navigate = useNavigate();
  const { gigId, pkgName } = useParams();

  const location = useLocation();
  const gig = location.state?.gig;
  const pkg = location.state?.pkg;
  const orderId = location.state?.orderId;
  const orderNumber = location.state?.orderNumber;
  const totalPrice = location.state?.totalPrice;
  const addSubtitles = location.state?.addSubtitles ?? false;
  const expressDelivery = location.state?.expressDelivery ?? false;
  
  console.log("Gig ID:", gigId);
  console.log("Package Name:", pkgName);

  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("card")
  const [promoCode, setPromoCode] = useState("")
  const [promoApplied, setPromoApplied] = useState(false)
  const [formData, setFormData] = useState({
    cardNumber: "",
    expiryDate: "",
    cvv: "",
    cardholderName: "",
    upiId: "",
    bankName: "",
    walletProvider: "",
  })

  if (!gig || !pkg) {
    // fallback to fetch if someone visits directly
    return <div>Loading package...</div>;
  }

  const orderDetails = {
    planName: pkg.name,
    basePrice: Number(pkg.price),
    addOns: {
      subtitles: { selected: addSubtitles, price: 200 },
      expressDelivery: { selected: expressDelivery, price: 500 },
    },
    taxes: 0,
    discount: promoApplied ? 100 : 0,
    estimatedDelivery: "3 Days",
  }

  const totalAmount =
    orderDetails.basePrice +
    (orderDetails.addOns.subtitles.selected ? orderDetails.addOns.subtitles.price : 0) +
    (orderDetails.addOns.expressDelivery.selected ? orderDetails.addOns.expressDelivery.price : 0) +
    orderDetails.taxes -
    orderDetails.discount

  const paymentMethods = [
    {
      id: "card" ,
      name: "Credit/Debit Card",
      icon: CreditCardIcon,
      description: "Visa, Mastercard, RuPay",
    },
    {
      id: "upi" ,
      name: "UPI",
      icon: DevicePhoneMobileIcon,
      description: "Pay using any UPI app",
    },
    {
      id: "netbanking" ,
      name: "Net Banking",
      icon: BuildingLibraryIcon,
      description: "All major banks supported",
    },
    {
      id: "wallet" ,
      name: "Wallets",
      icon: WalletIcon,
      description: "Paytm, PhonePe, Google Pay",
    },
  ]

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handlePromoApply = () => {
    if (promoCode.toLowerCase() === "welcome10") {
      setPromoApplied(true)
    }
  }

  const formatCardNumber = (value) => {
    const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "")
    const matches = v.match(/\d{4,16}/g)
    const match = (matches && matches[0]) || ""
    const parts = []
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4))
    }
    if (parts.length) {
      return parts.join(" ")
    } else {
      return v
    }
  }

  const formatExpiryDate = (value) => {
    const v = value.replace(/\D/g, "")
    if (v.length >= 2) {
      return `${v.slice(0, 2)}/${v.slice(2, 4)}`
    }
    return v
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-8 px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Complete Your Order</h1>
          <p className="text-gray-600">Secure payment to start your video editing project</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Side - Order Summary */}
          <div className="lg:col-span-1 order-2 lg:order-1">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sticky top-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <ShieldCheckIcon className="w-5 h-5 mr-2 text-green-500" />
                Order Summary
              </h3>

              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">{orderDetails.planName}</span>
                  <span className="font-medium">₹{orderDetails.basePrice}</span>
                </div>

                {orderDetails.addOns.subtitles.selected && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">+ Subtitles</span>
                    <span className="font-medium">₹{orderDetails.addOns.subtitles.price}</span>
                  </div>
                )}

                {orderDetails.addOns.expressDelivery.selected && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">+ Express Delivery</span>
                    <span className="font-medium">₹{orderDetails.addOns.expressDelivery.price}</span>
                  </div>
                )}

                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Taxes</span>
                  <span className="font-medium">₹{orderDetails.taxes}</span>
                </div>

                {promoApplied && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Discount (WELCOME10)</span>
                    <span className="font-medium">-₹{orderDetails.discount}</span>
                  </div>
                )}

                <div className="border-t pt-4">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold text-gray-900">Total</span>
                    <span className="text-2xl font-bold text-gray-900">₹{totalAmount}</span>
                  </div>
                </div>

                <div className="bg-purple-50 rounded-lg p-3 mt-4">
                  <div className="flex items-center text-sm text-purple-700">
                    <ClockIcon className="w-4 h-4 mr-2" />
                    <span className="font-medium">Estimated Delivery: {orderDetails.estimatedDelivery}</span>
                  </div>
                </div>

                <div className="bg-green-50 rounded-lg p-3">
                  <div className="flex items-start text-sm text-green-700">
                    <CheckCircleIcon className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium">100% Satisfaction Guarantee</p>
                      <p className="text-xs mt-1">Free revisions until you're happy</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side - Payment Form */}
          <div className="lg:col-span-2 order-1 lg:order-2">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Secure Your Project</h2>
                <p className="text-gray-600 text-sm">Choose your preferred payment method</p>
              </div>

              <form className="space-y-6">
                {/* Payment Methods */}
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-4 block">Payment Method</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {paymentMethods.map((method) => (
                      <label
                        key={method.id}
                        className={`relative flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 ${
                          selectedPaymentMethod === method.id
                            ? "border-purple-500 bg-purple-50"
                            : "border-gray-200 hover:border-purple-300 hover:bg-gray-50"
                        }`}
                      >
                        <input
                          type="radio"
                          name="paymentMethod"
                          value={method.id}
                          checked={selectedPaymentMethod === method.id}
                          onChange={(e) => setSelectedPaymentMethod(e.target.value )}
                          className="sr-only"
                        />
                        <method.icon className="w-6 h-6 text-gray-600 mr-3" />
                        <div>
                          <p className="font-medium text-gray-900">{method.name}</p>
                          <p className="text-xs text-gray-500">{method.description}</p>
                        </div>
                        {selectedPaymentMethod === method.id && (
                          <CheckCircleIcon className="w-5 h-5 text-purple-500 absolute top-2 right-2" />
                        )}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Payment Form Fields */}
                <div className="space-y-4">
                  {selectedPaymentMethod === "card" && (
                    <>
                      <div>
                        <label className="text-sm font-medium text-gray-700 mb-2 block">Card Number</label>
                        <input
                          type="text"
                          value={formData.cardNumber}
                          onChange={(e) => handleInputChange("cardNumber", formatCardNumber(e.target.value))}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                          placeholder="1234 5678 9012 3456"
                          maxLength={19}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium text-gray-700 mb-2 block">Expiry Date</label>
                          <input
                            type="text"
                            value={formData.expiryDate}
                            onChange={(e) => handleInputChange("expiryDate", formatExpiryDate(e.target.value))}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                            placeholder="MM/YY"
                            maxLength={5}
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-700 mb-2 block">CVV</label>
                          <input
                            type="text"
                            value={formData.cvv}
                            onChange={(e) => handleInputChange("cvv", e.target.value.replace(/\D/g, ""))}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                            placeholder="123"
                            maxLength={4}
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700 mb-2 block">Cardholder Name</label>
                        <input
                          type="text"
                          value={formData.cardholderName}
                          onChange={(e) => handleInputChange("cardholderName", e.target.value)}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                          placeholder="John Doe"
                        />
                      </div>
                    </>
                  )}

                  {selectedPaymentMethod === "upi" && (
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-2 block">UPI ID</label>
                      <input
                        type="text"
                        value={formData.upiId}
                        onChange={(e) => handleInputChange("upiId", e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                        placeholder="yourname@paytm"
                      />
                    </div>
                  )}

                  {selectedPaymentMethod === "netbanking" && (
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-2 block">Select Bank</label>
                      <select
                        value={formData.bankName}
                        onChange={(e) => handleInputChange("bankName", e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                      >
                        <option value="">Choose your bank</option>
                        <option value="sbi">State Bank of India</option>
                        <option value="hdfc">HDFC Bank</option>
                        <option value="icici">ICICI Bank</option>
                        <option value="axis">Axis Bank</option>
                        <option value="kotak">Kotak Mahindra Bank</option>
                      </select>
                    </div>
                  )}

                  {selectedPaymentMethod === "wallet" && (
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-2 block">Select Wallet</label>
                      <select
                        value={formData.walletProvider}
                        onChange={(e) => handleInputChange("walletProvider", e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                      >
                        <option value="">Choose wallet</option>
                        <option value="paytm">Paytm</option>
                        <option value="phonepe">PhonePe</option>
                        <option value="googlepay">Google Pay</option>
                        <option value="amazonpay">Amazon Pay</option>
                      </select>
                    </div>
                  )}
                </div>

                {/* Promo Code */}
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block flex items-center">
                    <TagIcon className="w-4 h-4 mr-2" />
                    Promo Code (Optional)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                      className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                      placeholder="Enter promo code"
                      disabled={promoApplied}
                    />
                    <button
                      type="button"
                      onClick={handlePromoApply}
                      disabled={promoApplied || !promoCode}
                      className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                        promoApplied
                          ? "bg-green-100 text-green-700 cursor-not-allowed"
                          : promoCode
                            ? "bg-purple-600 text-white hover:bg-purple-700"
                            : "bg-gray-200 text-gray-500 cursor-not-allowed"
                      }`}
                    >
                      {promoApplied ? "Applied" : "Apply"}
                    </button>
                  </div>
                  {promoApplied && (
                    <p className="text-sm text-green-600 mt-2 flex items-center">
                      <CheckCircleIcon className="w-4 h-4 mr-1" />
                      Promo code applied successfully!
                    </p>
                  )}
                </div>

                {/* Legal Text */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs text-gray-600 leading-relaxed">
                    By proceeding, you agree to Vidlancer's{" "}
                    <a href="#" className="text-purple-600 hover:text-purple-700 underline">
                      Terms of Service
                    </a>{" "}
                    and{" "}
                    <a href="#" className="text-purple-600 hover:text-purple-700 underline">
                      Refund Policy
                    </a>
                    . Your payment information is encrypted and secure.
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t">
                  <button
                    type="button"
                    className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                  >
                    Go Back
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-6 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg font-semibold text-lg hover:from-purple-700 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                  >
                    Pay ₹{totalAmount} & Start Project
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}