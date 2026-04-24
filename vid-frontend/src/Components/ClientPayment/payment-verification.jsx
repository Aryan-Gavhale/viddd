import { useState } from 'react'
import { ChevronLeft, CreditCard } from 'lucide-react'
import ProgressBar from "./progressbar"
import PaymentMethodCard from "./payment-method"
import PayPalForm from "./paypal"
import DebitCardForm from "./debitcard"
import UPIForm from "./upiform"

export default function PaymentVerification() {
  const [selectedMethod, setSelectedMethod] = useState(null)

  const paymentMethods = [
    {
      name: 'PayPal',
      icon: <img src="/placeholder.svg?height=24&width=24" alt="PayPal" className="h-6 w-6" />,
      description: 'Pay securely using your PayPal account',
      component: <PayPalForm />
    },
    {
      name: 'Debit Card',
      icon: <CreditCard className="h-6 w-6 text-blue-600" />,
      description: 'Pay using your debit card',
      component: <DebitCardForm />
    },
    {
      name: 'UPI',
      icon: <img src="/placeholder.svg?height=24&width=24" alt="UPI" className="h-6 w-6" />,
      description: 'Pay using UPI',
      component: <UPIForm />
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      <div className="mx-auto max-w-3xl px-4 py-12">
        <div className="mb-8 flex items-center justify-between">
          <button className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-all hover:bg-gray-50 hover:shadow">
            <ChevronLeft className="h-4 w-4" />
            Back to Cart
          </button>
          <div className="text-sm font-medium text-gray-600">Step 2 of 3</div>
        </div>

        <ProgressBar currentStep={2} totalSteps={3} />

        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <h1 className="mb-6 text-2xl font-bold text-gray-900">Choose Payment Method</h1>

          <div className="mb-8 space-y-4">
            {paymentMethods.map((method) => (
              <PaymentMethodCard
                key={method.name}
                icon={method.icon}
                name={method.name}
                description={method.description}
                isSelected={selectedMethod === method.name}
                onClick={() => setSelectedMethod(method.name)}
              />
            ))}
          </div>

          {selectedMethod && (
            <div className="mt-8">
              <h2 className="mb-4 text-lg font-semibold text-gray-900">
                {selectedMethod} Details
              </h2>
              {paymentMethods.find((method) => method.name === selectedMethod)?.component}
            </div>
          )}

          <div className="mt-8 flex justify-end">
            <button
              className="rounded-lg bg-blue-600 px-6 py-3 text-sm font-medium text-white shadow-sm transition-all hover:bg-blue-700 hover:shadow focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              disabled={!selectedMethod}
            >
              Proceed to Pay
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

