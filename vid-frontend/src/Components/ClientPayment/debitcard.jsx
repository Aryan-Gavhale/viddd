import { CreditCard, Lock } from 'lucide-react'

export default function DebitCardForm() {
  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="card-number" className="mb-1.5 block text-sm font-medium text-gray-700">
          Card Number
        </label>
        <div className="relative">
          <input
            type="text"
            id="card-number"
            placeholder="1234 5678 9012 3456"
            className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 pl-10 text-gray-900 shadow-sm transition-colors placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
          <CreditCard className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="expiry" className="mb-1.5 block text-sm font-medium text-gray-700">
            Expiry Date
          </label>
          <input
            type="text"
            id="expiry"
            placeholder="MM / YY"
            className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-gray-900 shadow-sm transition-colors placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>
        <div>
          <label htmlFor="cvv" className="mb-1.5 block text-sm font-medium text-gray-700">
            CVV
          </label>
          <input
            type="text"
            id="cvv"
            placeholder="123"
            className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-gray-900 shadow-sm transition-colors placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>
      </div>
      <div>
        <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-gray-700">
          Name on Card
        </label>
        <input
          type="text"
          id="name"
          placeholder="John Doe"
          className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-gray-900 shadow-sm transition-colors placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        />
      </div>
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <Lock className="h-4 w-4" />
        <span>Your payment information is secure and encrypted</span>
      </div>
    </div>
  )
}

