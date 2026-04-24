"use client"

import { useState } from "react"
import { Download, Filter, CreditCard, Calendar, DollarSign, TrendingUp, Plus } from "lucide-react"

export default function PaymentsSection() {
  const [selectedPeriod, setSelectedPeriod] = useState("all")

  const payments = [
    {
      id: "PAY-001",
      projectTitle: "Corporate Brand Video",
      editorName: "Sarah Johnson",
      amount: 2500,
      date: "2024-01-10",
      method: "Credit Card",
      status: "Completed",
    },
    {
      id: "PAY-002",
      projectTitle: "Wedding Highlight Reel",
      editorName: "Mike Chen",
      amount: 1800,
      date: "2024-01-08",
      method: "PayPal",
      status: "Completed",
    },
    {
      id: "PAY-003",
      projectTitle: "Product Advertisement",
      editorName: "Alex Rivera",
      amount: 3200,
      date: "2024-01-05",
      method: "Bank Transfer",
      status: "Pending",
    },
  ]

  const paymentMethods = [
    {
      id: 1,
      type: "Credit Card",
      last4: "4242",
      brand: "Visa",
      isDefault: true,
    },
    {
      id: 2,
      type: "PayPal",
      email: "john@company.com",
      isDefault: false,
    },
  ]

  const totalSpent = payments.reduce((sum, payment) => sum + payment.amount, 0)
  const thisMonthSpent = payments
    .filter((p) => new Date(p.date).getMonth() === new Date().getMonth())
    .reduce((sum, payment) => sum + payment.amount, 0)

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100">Total Spent</p>
              <p className="text-3xl font-bold mt-2">${totalSpent.toLocaleString()}</p>
              <p className="text-blue-100 text-sm mt-1">All time</p>
            </div>
            <DollarSign className="w-8 h-8 text-blue-200" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-2xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100">This Month</p>
              <p className="text-3xl font-bold mt-2">${thisMonthSpent.toLocaleString()}</p>
              <p className="text-green-100 text-sm mt-1">+15% from last month</p>
            </div>
            <TrendingUp className="w-8 h-8 text-green-200" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-2xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100">Avg. Project Cost</p>
              <p className="text-3xl font-bold mt-2">${Math.round(totalSpent / payments.length).toLocaleString()}</p>
              <p className="text-purple-100 text-sm mt-1">Per project</p>
            </div>
            <Calendar className="w-8 h-8 text-purple-200" />
          </div>
        </div>
      </div>

      {/* Payment History */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/50">
        <div className="p-6 border-b border-gray-200/50">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Payment History</h2>
              <p className="text-gray-600 mt-1">Track all your payments and invoices</p>
            </div>
            <div className="flex space-x-3">
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Time</option>
                <option value="month">This Month</option>
                <option value="quarter">This Quarter</option>
              </select>
              <button className="flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                <Filter className="w-4 h-4 mr-2" />
                Filter
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50/50">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">Payment ID</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">Project</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">Editor</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">Amount</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">Date</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">Method</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">Status</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">Invoice</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200/50">
              {payments.map((payment) => (
                <tr key={payment.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{payment.id}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{payment.projectTitle}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{payment.editorName}</td>
                  <td className="px-6 py-4 text-sm font-semibold text-gray-900">${payment.amount.toLocaleString()}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{payment.date}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{payment.method}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                        payment.status === "Completed" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {payment.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button className="flex items-center text-blue-600 hover:text-blue-700 transition-colors">
                      <Download className="w-4 h-4 mr-1" />
                      Download
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payment Methods */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/50">
        <div className="p-6 border-b border-gray-200/50">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Payment Methods</h2>
              <p className="text-gray-600 mt-1">Manage your saved payment methods</p>
            </div>
            <button className="flex items-center px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-lg hover:shadow-lg transition-all duration-200">
              <Plus className="w-4 h-4 mr-2" />
              Add Method
            </button>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {paymentMethods.map((method) => (
            <div key={method.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-xl">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-gray-100 rounded-lg">
                  <CreditCard className="w-6 h-6 text-gray-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">
                    {method.type} {method.last4 && `****${method.last4}`}
                  </p>
                  <p className="text-sm text-gray-500">{method.brand || method.email}</p>
                </div>
                {method.isDefault && (
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">Default</span>
                )}
              </div>
              <button className="text-gray-400 hover:text-gray-600 transition-colors">
                <span className="text-sm">Edit</span>
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
