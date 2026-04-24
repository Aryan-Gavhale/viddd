"use client"

import { useState } from "react"
import { X, FileText, Check, Download, Send } from "lucide-react"

export default function InvoiceModal({ project, onClose }) {
  const [invoiceStatus, setInvoiceStatus] = useState("draft")

  const totalHours = project.tasks.reduce((sum, task) => sum + task.hours, 0)
  const totalCost = project.tasks.reduce((sum, task) => sum + task.cost, 0)
  const commission = Math.round(totalCost * 0.1)
  const grandTotal = totalCost + commission

  const handleSendInvoice = () => {
    setInvoiceStatus("pending")
    setTimeout(() => {
      setInvoiceStatus("paid")
    }, 2000)
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
              <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">Invoice Generator</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">Create professional invoices</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="overflow-y-auto max-h-[calc(90vh-80px)]">
          <div className="p-8">
            {/* Invoice Header */}
            <div className="flex justify-between items-start mb-8">
              <div>
                <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">{project.name}</h2>
                <div className="space-y-1 text-slate-600 dark:text-slate-400">
                  <p className="font-medium">Invoice #{project.id.replace("proj-", "INV-")}</p>
                  <p>Date: {new Date().toLocaleDateString()}</p>
                  <p>Due: {new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString()}</p>
                </div>
              </div>
              <div className="text-right">
                <div className="bg-gradient-to-br from-blue-500 to-purple-600 text-white p-6 rounded-xl shadow-lg">
                  <h3 className="font-bold text-lg mb-1">Freelancer Studio</h3>
                  <div className="text-sm opacity-90">
                    <p>123 Creative Street</p>
                    <p>Design City, DC 12345</p>
                    <p>hello@freelancer.studio</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Client Info */}
            <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-6 mb-8">
              <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">Bill To:</h4>
              <div className="text-slate-600 dark:text-slate-400">
                <p className="font-medium">
                  {project.postedBy ? `${project.postedBy.firstname} ${project.postedBy.lastname}` : "Client Name"}
                </p>
                <p>Client Company</p>
                <p>456 Business Ave</p>
                <p>Commerce City, CC 54321</p>
              </div>
            </div>

            {/* Invoice Table */}
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden mb-8 shadow-sm">
              <table className="w-full">
                <thead className="bg-slate-100 dark:bg-slate-700">
                  <tr>
                    <th className="text-left p-4 font-semibold text-slate-900 dark:text-slate-100">Description</th>
                    <th className="text-center p-4 font-semibold text-slate-900 dark:text-slate-100">Hours</th>
                    <th className="text-right p-4 font-semibold text-slate-900 dark:text-slate-100">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {project.tasks.map((task, index) => (
                    <tr key={task.id} className={index % 2 === 0 ? "bg-slate-50 dark:bg-slate-800/50" : ""}>
                      <td className="p-4 text-slate-900 dark:text-slate-100">{task.name}</td>
                      <td className="p-4 text-center text-slate-600 dark:text-slate-400">{task.hours}</td>
                      <td className="p-4 text-right font-medium text-slate-900 dark:text-slate-100">
                        ${task.cost.toFixed(2)}
                      </td>
                    </tr>
                  ))}

                  {/* Subtotal */}
                  <tr className="border-t border-slate-200 dark:border-slate-600 bg-slate-100 dark:bg-slate-700">
                    <td className="p-4 font-semibold text-slate-900 dark:text-slate-100">Subtotal</td>
                    <td className="p-4 text-center font-medium text-slate-600 dark:text-slate-400">{totalHours}</td>
                    <td className="p-4 text-right font-semibold text-slate-900 dark:text-slate-100">
                      ${totalCost.toFixed(2)}
                    </td>
                  </tr>

                  {/* Commission */}
                  <tr>
                    <td className="p-4 text-slate-600 dark:text-slate-400">Platform Commission (10%)</td>
                    <td className="p-4 text-center text-slate-600 dark:text-slate-400">-</td>
                    <td className="p-4 text-right text-slate-600 dark:text-slate-400">${commission.toFixed(2)}</td>
                  </tr>

                  {/* Total */}
                  <tr className="border-t-2 border-slate-300 dark:border-slate-600 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20">
                    <td className="p-4 text-xl font-bold text-slate-900 dark:text-slate-100">Total</td>
                    <td className="p-4 text-center text-slate-600 dark:text-slate-400">-</td>
                    <td className="p-4 text-right text-2xl font-bold text-slate-900 dark:text-slate-100">
                      ${grandTotal.toFixed(2)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Payment Details */}
            <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-6 mb-8">
              <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-4">Payment Information</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Payment Methods</p>
                  <p className="text-slate-900 dark:text-slate-100">Credit Card, PayPal, Bank Transfer</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Payment Terms</p>
                  <p className="text-slate-900 dark:text-slate-100">Net 14 days</p>
                </div>
              </div>
            </div>

            {/* Status and Actions */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex items-center">
                {invoiceStatus === "paid" && (
                  <div className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-4 py-3 rounded-xl flex items-center shadow-sm">
                    <Check className="w-5 h-5 mr-2" />
                    <span className="font-medium">Payment Received</span>
                  </div>
                )}
                {invoiceStatus === "pending" && (
                  <div className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-4 py-3 rounded-xl flex items-center shadow-sm">
                    <div className="w-2 h-2 bg-amber-500 rounded-full mr-3 animate-pulse"></div>
                    <span className="font-medium">Payment Pending</span>
                  </div>
                )}
                {invoiceStatus === "draft" && (
                  <div className="bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-4 py-3 rounded-xl flex items-center shadow-sm">
                    <FileText className="w-5 h-5 mr-2" />
                    <span className="font-medium">Draft Invoice</span>
                  </div>
                )}
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={onClose}
                  className="px-6 py-3 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-xl font-medium transition-colors"
                >
                  Close
                </button>

                <button className="px-6 py-3 bg-slate-200 dark:bg-slate-600 hover:bg-slate-300 dark:hover:bg-slate-500 text-slate-700 dark:text-slate-300 rounded-xl font-medium transition-colors flex items-center space-x-2">
                  <Download className="w-4 h-4" />
                  <span>Download PDF</span>
                </button>

                {invoiceStatus === "draft" && (
                  <button
                    onClick={handleSendInvoice}
                    className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl font-medium transition-all duration-200 shadow-lg hover:shadow-xl flex items-center space-x-2"
                  >
                    <Send className="w-4 h-4" />
                    <span>Send Invoice</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
