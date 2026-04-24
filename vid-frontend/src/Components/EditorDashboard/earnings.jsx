import { DollarSign, TrendingUp, BarChart } from 'lucide-react'

export default function EarningsCard() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Earnings</h3>
        <DollarSign className="h-5 w-5 text-gray-500" />
      </div>
      <div className="mb-4 flex items-baseline justify-between">
        <p className="text-3xl font-bold text-gray-900">$2,450.00</p>
        <p className="flex items-center text-sm text-green-600">
          <TrendingUp className="mr-1 h-4 w-4" />
          +15% this month
        </p>
      </div>
      <div className="mb-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Completed Projects</span>
          <span className="font-medium text-gray-900">12</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Pending Payments</span>
          <span className="font-medium text-gray-900">$500.00</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Average Project Value</span>
          <span className="font-medium text-gray-900">$204.17</span>
        </div>
      </div>
      <button className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-50 py-2 text-sm font-medium text-blue-600 transition-colors hover:bg-blue-100">
        <BarChart className="h-4 w-4" />
        View Detailed Report
      </button>
    </div>
  )
}

