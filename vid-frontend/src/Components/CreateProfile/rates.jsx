import { useState } from "react"

export default function RatesAvailability({ onPrev, onSubmit, data }) {
  const [formData, setFormData] = useState({
    minimumRate: data.minimumRate || "",
    maximumRate: data.maximumRate || "",
    weeklyHours: data.weeklyHours || "",
    availabilityStatus: data.availabilityStatus || "UNAVAILABLE",
    hourlyRate: data.hourlyRate || "",
    experienceLevel: data.experienceLevel || "ENTRY",
  })
  const [errors, setErrors] = useState({})

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData({ ...formData, [name]: value })
    if (errors[name]) {
      setErrors({ ...errors, [name]: "" })
    }
  }

  const validateForm = () => {
    const newErrors = {}
    if (!formData.minimumRate || isNaN(formData.minimumRate))
      newErrors.minimumRate = "Minimum rate is required and must be a number"
    if (!formData.maximumRate || isNaN(formData.maximumRate))
      newErrors.maximumRate = "Maximum rate is required and must be a number"
    if (!formData.hourlyRate || isNaN(formData.hourlyRate))
      newErrors.hourlyRate = "Hourly rate is required and must be a number"
    if (Number.parseFloat(formData.minimumRate) > Number.parseFloat(formData.maximumRate))
      newErrors.maximumRate = "Maximum rate must be greater than minimum rate"
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = () => {
    if (validateForm()) {
      onSubmit({
        minimumRate: Number.parseFloat(formData.minimumRate),
        maximumRate: Number.parseFloat(formData.maximumRate),
        weeklyHours: Number.parseInt(formData.weeklyHours) || null,
        availabilityStatus: formData.availabilityStatus,
        hourlyRate: Number.parseFloat(formData.hourlyRate),
        experienceLevel: formData.experienceLevel,
      })
    }
  }

  return (
    <div className="space-y-6">
      <div className="border-b pb-4 mb-6">
        <h2 className="text-xl font-semibold text-gray-800">Rates & Availability</h2>
        <p className="text-gray-600 text-sm mt-1">
          Set your rates and availability to help clients find you for projects.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label htmlFor="minimumRate" className="block text-sm font-medium text-gray-700 mb-1">
            Minimum Rate ($) <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            id="minimumRate"
            name="minimumRate"
            value={formData.minimumRate}
            onChange={handleInputChange}
            className={`w-full px-3 py-2 border ${
              errors.minimumRate ? "border-red-300" : "border-gray-300"
            } rounded-md focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500`}
            placeholder="e.g., 50"
            min="0"
            required
          />
          {errors.minimumRate ? (
            <p className="text-red-500 text-xs mt-1">{errors.minimumRate}</p>
          ) : (
            <p className="text-gray-500 text-xs mt-1">The minimum amount you charge for projects</p>
          )}
        </div>

        <div>
          <label htmlFor="maximumRate" className="block text-sm font-medium text-gray-700 mb-1">
            Maximum Rate ($) <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            id="maximumRate"
            name="maximumRate"
            value={formData.maximumRate}
            onChange={handleInputChange}
            className={`w-full px-3 py-2 border ${
              errors.maximumRate ? "border-red-300" : "border-gray-300"
            } rounded-md focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500`}
            placeholder="e.g., 100"
            min="0"
            required
          />
          {errors.maximumRate ? (
            <p className="text-red-500 text-xs mt-1">{errors.maximumRate}</p>
          ) : (
            <p className="text-gray-500 text-xs mt-1">The maximum amount you charge for projects</p>
          )}
        </div>

        <div>
          <label htmlFor="hourlyRate" className="block text-sm font-medium text-gray-700 mb-1">
            Hourly Rate ($) <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            id="hourlyRate"
            name="hourlyRate"
            value={formData.hourlyRate}
            onChange={handleInputChange}
            className={`w-full px-3 py-2 border ${
              errors.hourlyRate ? "border-red-300" : "border-gray-300"
            } rounded-md focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500`}
            placeholder="e.g., 75"
            min="0"
            required
          />
          {errors.hourlyRate ? (
            <p className="text-red-500 text-xs mt-1">{errors.hourlyRate}</p>
          ) : (
            <p className="text-gray-500 text-xs mt-1">Your standard hourly rate for services</p>
          )}
        </div>

        <div>
          <label htmlFor="weeklyHours" className="block text-sm font-medium text-gray-700 mb-1">
            Weekly Hours Available
          </label>
          <input
            type="number"
            id="weeklyHours"
            name="weeklyHours"
            value={formData.weeklyHours}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
            placeholder="e.g., 20"
            min="0"
          />
          <p className="text-gray-500 text-xs mt-1">How many hours per week you're available to work</p>
        </div>

        <div>
          <label htmlFor="availabilityStatus" className="block text-sm font-medium text-gray-700 mb-1">
            Availability Status
          </label>
          <select
            id="availabilityStatus"
            name="availabilityStatus"
            value={formData.availabilityStatus}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
          >
            <option value="FULL_TIME">Full-Time</option>
            <option value="PART_TIME">Part-Time</option>
            <option value="UNAVAILABLE">Unavailable</option>
          </select>
          <p className="text-gray-500 text-xs mt-1">Your current availability for new projects</p>
        </div>

        <div>
          <label htmlFor="experienceLevel" className="block text-sm font-medium text-gray-700 mb-1">
            Experience Level
          </label>
          <select
            id="experienceLevel"
            name="experienceLevel"
            value={formData.experienceLevel}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
          >
            <option value="ENTRY">Entry</option>
            <option value="INTERMEDIATE">Intermediate</option>
            <option value="EXPERT">Expert</option>
          </select>
          <p className="text-gray-500 text-xs mt-1">Your level of professional experience</p>
        </div>
      </div>

      <div className="flex justify-between pt-6 border-t mt-8">
        <button
          onClick={onPrev}
          className="py-2 px-4 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
        >
          Previous
        </button>
        <button
          onClick={handleSubmit}
          className="py-2 px-4 border border-transparent rounded-md text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
        >
          Preview
        </button>
      </div>
    </div>
  )
}
