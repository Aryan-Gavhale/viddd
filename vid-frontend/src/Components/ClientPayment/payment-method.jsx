import { Check } from 'lucide-react'



export default function PaymentMethodCard({
  icon,
  name,
  description,
  isSelected,
  onClick
}) {
  return (
    <div
      className={`relative cursor-pointer rounded-lg border p-4 transition-all ${
        isSelected
          ? 'border-blue-500 bg-blue-50 shadow-sm'
          : 'border-gray-200 bg-white hover:border-blue-200 hover:bg-blue-50/50'
      }`}
      onClick={onClick}
    >
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
          {icon}
        </div>
        <div>
          <h3 className="font-medium text-gray-900">{name}</h3>
          <p className="text-sm text-gray-500">{description}</p>
        </div>
      </div>
      {isSelected && (
        <div className="absolute right-4 top-4 text-blue-500">
          <Check className="h-5 w-5" />
        </div>
      )}
    </div>
  )
}

