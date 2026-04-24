"use client"

import { useState } from "react"

export function FeedbackSection({ job }) {
  const [feedback, setFeedback] = useState(job.feedback || "")
  const [rating, setRating] = useState(job.rating || 0)
  const [submitted, setSubmitted] = useState(!!job.feedback)
  const [hoveredRating, setHoveredRating] = useState(0)

  const handleSubmit = () => {
    if (feedback.trim() === "") return
    setSubmitted(true)
    // In a real app, you would save this feedback to your backend
  }

  const handleEdit = () => {
    setSubmitted(false)
  }

  return (
    <div className="h-full flex flex-col">
      <div className="mb-4">
        <h3 className="font-medium mb-1 text-gray-900 dark:text-white">Project Feedback</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Provide feedback for the editor after the project is completed.
        </p>

        {job.status.toLowerCase() !== "completed" && !submitted ? (
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-6 text-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mx-auto mb-2 text-gray-400"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <p className="text-gray-500 dark:text-gray-400">
              Feedback can be submitted once the project is marked as completed.
            </p>
          </div>
        ) : submitted ? (
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800 shadow-sm">
            <div className="flex mb-3">
              {[1, 2, 3, 4, 5].map((star) => (
                <svg
                  key={star}
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill={star <= rating ? "currentColor" : "none"}
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={star <= rating ? "text-amber-500" : "text-gray-300 dark:text-gray-600"}
                >
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
              ))}
            </div>
            <p className="whitespace-pre-wrap text-gray-900 dark:text-white">{feedback}</p>
            <div className="mt-4">
              <button
                onClick={handleEdit}
                className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Edit Feedback
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex justify-center mb-3">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  className="focus:outline-none p-1"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="28"
                    height="28"
                    viewBox="0 0 24 24"
                    fill={star <= (hoveredRating || rating) ? "currentColor" : "none"}
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={`transition-colors ${
                      star <= (hoveredRating || rating) ? "text-amber-500" : "text-gray-300 dark:text-gray-600"
                    }`}
                  >
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                </button>
              ))}
            </div>
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden mb-4">
              <textarea
                placeholder="Write your feedback about the project and the editor's work..."
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                className="w-full min-h-[150px] p-4 bg-white dark:bg-gray-700 border-0 focus:outline-none focus:ring-0 dark:text-white resize-none"
              />
            </div>
            <button
              onClick={handleSubmit}
              className="w-full px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-md flex items-center justify-center transition-colors"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="mr-2"
              >
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
              Submit Feedback
            </button>
          </>
        )}
      </div>
    </div>
  )
}
