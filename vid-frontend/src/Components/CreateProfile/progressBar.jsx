import { CheckCircle } from "lucide-react"

export default function ProgressBar({ steps, currentStep, completedSteps }) {
  return (
    <div className="relative">
      <div className="overflow-hidden h-1 mb-6 text-xs flex rounded bg-gray-200">
        <div
          style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
          className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-purple-600 transition-all duration-500"
        ></div>
      </div>
      <div className="flex justify-between">
        {steps.map((step, index) => (
          <div key={step.id} className="text-center">
            <div className="relative">
              <div
                className={`w-10 h-10 mx-auto rounded-full text-lg flex items-center justify-center ${
                  index === currentStep
                    ? "bg-purple-600 text-white"
                    : index < currentStep
                      ? "bg-purple-100 text-purple-600 border border-purple-200"
                      : "bg-gray-50 border-2 border-gray-200 text-gray-400"
                }`}
              >
                {completedSteps.includes(step.id) ? <CheckCircle className="w-5 h-5" /> : <span>{index + 1}</span>}
              </div>
            </div>
            <div className={`text-xs mt-2 font-medium ${index === currentStep ? "text-purple-600" : "text-gray-500"}`}>
              {step.title}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
