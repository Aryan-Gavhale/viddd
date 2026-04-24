export function Stepper({ currentStep, steps }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {Array.from({ length: steps }, (_, i) => (
        <div key={i} className="flex items-center">
          <div className={`
            h-10 w-10 rounded-full flex items-center justify-center
            transition-all duration-300 font-medium
            ${i + 1 === currentStep 
              ? 'bg-blue-600 text-white' 
              : i + 1 < currentStep 
                ? 'bg-green-500 text-white'
                : 'bg-gray-200 text-gray-600'
            }
          `}>
            {i + 1 < currentStep ? '✓' : i + 1}
          </div>
          {i < steps - 1 && (
            <div className={`
              w-16 h-1 mx-2
              ${currentStep > i + 1 ? 'bg-green-500' : 'bg-gray-200'}
              transition-all duration-300
            `} />
          )}
        </div>
      ))}
    </div>
  )
}

