export default function UPIForm() {
    return (
      <div className="space-y-4">
        <div>
          <label htmlFor="upi-id" className="mb-1.5 block text-sm font-medium text-gray-700">
            UPI ID
          </label>
          <input
            type="text"
            id="upi-id"
            placeholder="yourname@upi"
            className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-gray-900 shadow-sm transition-colors placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>
        <p className="text-sm text-gray-600">
          You will receive a payment request on your UPI app. Please complete the payment there.
        </p>
      </div>
    )
  }
  
  