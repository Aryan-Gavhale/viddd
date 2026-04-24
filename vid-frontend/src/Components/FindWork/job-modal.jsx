

import { useState } from 'react'
import { X, DollarSign, Clock, User } from 'lucide-react'



export function JobModal({ job, onClose }) {
  const [message, setMessage] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    // Handle application submission
    console.log('Application submitted:', { message })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="w-full max-w-2xl rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b p-4">
          <h2 className="text-xl font-semibold">{job.title}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="h-6 w-6" />
          </button>
        </div>
        <div className="max-h-[calc(100vh-200px)] overflow-y-auto p-4">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <span className="flex items-center text-gray-600">
                <DollarSign className="mr-1 h-5 w-5" />
                {job.budget}
              </span>
              <span className="flex items-center text-gray-600">
                <Clock className="mr-1 h-5 w-5" />
                {job.deadline}
              </span>
            </div>
            <div className="flex items-center text-gray-600">
              <User className="mr-1 h-5 w-5" />
              <span>{job.client.name}</span>
              <span className="ml-2 rounded bg-green-100 px-2 py-1 text-xs font-semibold text-green-800">
                {job.client.rating.toFixed(1)}★
              </span>
            </div>
          </div>
          <p className="mb-6 text-gray-700">{job.description}</p>
          <form onSubmit={handleSubmit}>
            <label htmlFor="message" className="mb-2 block font-medium text-gray-700">
              Cover Letter
            </label>
            <textarea
              id="message"
              rows={4}
              className="mb-4 w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              placeholder="Introduce yourself and explain why you're a great fit for this job..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
            ></textarea>
            <div className="flex justify-end">
              <button
                type="submit"
                className="rounded-md bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700"
              >
                Submit Application
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

