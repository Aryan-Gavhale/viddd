
import { CreditCard, Plus, CreditCardIcon, Receipt, FileText, AlertCircle } from "lucide-react"

export function PaymentSettings() {
  return (
    <div className="overflow-hidden rounded-xl border border-violet-200 dark:border-violet-800 bg-white dark:bg-slate-900">
      <div className="border-b border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-900/20 px-6 py-4">
        <h2 className="text-xl font-bold text-violet-900 dark:text-violet-100">Payment Settings</h2>
        <p className="text-violet-600 dark:text-violet-400 text-sm">Manage your payment methods and preferences</p>
      </div>
      <div className="p-6">
        <div className="mb-6 flex border-b border-violet-200 dark:border-violet-700">
          <button className="border-b-2 border-violet-600 px-4 py-2 text-sm font-medium text-violet-600 dark:border-violet-400 dark:text-violet-400">
            <span className="flex items-center gap-2">
              <CreditCardIcon className="h-4 w-4" />
              <span>Payment Methods</span>
            </span>
          </button>
          <button className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300">
            <span className="flex items-center gap-2">
              <Receipt className="h-4 w-4" />
              <span>Preferences</span>
            </span>
          </button>
          <button className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300">
            <span className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span>Tax Information</span>
            </span>
          </button>
        </div>

        <div className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border border-violet-100 p-4 transition-colors hover:bg-violet-50/50 dark:border-violet-800/50 dark:hover:bg-violet-900/10 bg-white dark:bg-slate-900">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50">
                  <svg className="h-6 w-6 text-blue-600 dark:text-blue-400" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M21.5 12a2.5 2.5 0 0 1-2.5 2.5H5a2.5 2.5 0 0 1 0-5h14a2.5 2.5 0 0 1 2.5 2.5Z" />
                    <path d="M16 8.5V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2v-1.5" />
                  </svg>
                </div>
                <div>
                  <h5 className="font-medium text-gray-900 dark:text-white">PayPal</h5>
                  <p className="text-sm text-gray-500 dark:text-gray-400">john.doe@example.com</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button className="rounded-md border border-violet-300 bg-white px-3 py-1.5 text-sm font-medium text-violet-700 transition-colors hover:bg-violet-50 dark:border-violet-700 dark:bg-violet-900/20 dark:text-violet-300 dark:hover:bg-violet-900/30">
                  Edit
                </button>
                <button className="rounded-md px-3 py-1.5 text-sm font-medium text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300">
                  Remove
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-violet-100 p-4 transition-colors hover:bg-violet-50/50 dark:border-violet-800/50 dark:hover:bg-violet-900/10 bg-white dark:bg-slate-900">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-100 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800/50">
                  <CreditCard className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                </div>
                <div>
                  <h5 className="font-medium text-gray-900 dark:text-white">Credit Card</h5>
                  <p className="text-sm text-gray-500 dark:text-gray-400">•••• •••• •••• 4242</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button className="rounded-md border border-violet-300 bg-white px-3 py-1.5 text-sm font-medium text-violet-700 transition-colors hover:bg-violet-50 dark:border-violet-700 dark:bg-violet-900/20 dark:text-violet-300 dark:hover:bg-violet-900/30">
                  Edit
                </button>
                <button className="rounded-md px-3 py-1.5 text-sm font-medium text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300">
                  Remove
                </button>
              </div>
            </div>

            <button className="flex w-full items-center justify-center rounded-md border border-violet-300 bg-white px-4 py-3 text-sm font-medium text-violet-700 transition-colors hover:bg-violet-50 dark:border-violet-700 dark:bg-violet-900/20 dark:text-violet-300 dark:hover:bg-violet-900/30">
              <Plus className="mr-2 h-4 w-4" />
              Add Payment Method
            </button>
          </div>

          <div className="rounded-lg border border-violet-100 p-4 dark:border-violet-800/50 bg-violet-50/50 dark:bg-violet-900/10">
            <div className="flex items-start">
              <AlertCircle className="mr-3 h-5 w-5 text-violet-600 dark:text-violet-400 mt-0.5" />
              <div>
                <h3 className="text-sm font-medium text-gray-900 dark:text-white">Payment Security</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  All payment information is encrypted and securely stored. We never store your full card details on our
                  servers.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
