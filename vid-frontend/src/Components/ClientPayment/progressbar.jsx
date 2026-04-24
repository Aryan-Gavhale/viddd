
  export default function ProgressBar({ currentStep, totalSteps }) {
    return (
      <div className="mb-8">
        <div className="relative h-2 rounded-full bg-gray-100">
          <div
            className="absolute left-0 h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-300"
            style={{ width: `${(currentStep / totalSteps) * 100}%` }}
          />
        </div>
        <div className="mt-2 flex justify-between text-xs text-gray-600">
          <span>Cart</span>
          <span>Payment</span>
          <span>Confirmation</span>
        </div>
      </div>
    )
  }
  
  