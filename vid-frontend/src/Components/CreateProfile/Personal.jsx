import { useState } from "react"
import { Upload } from "lucide-react"

export default function PersonalDetails({ onNext, data }) {
  const [image, setImage] = useState(data.profilePicture || null)
  const [formData, setFormData] = useState({
    apartment: data.apartment || "",
    area: data.area || "",
    city: data.city || "",
    pinCode: data.pinCode || "",
    state: data.state || "",
    bio: data.bio || "",
  })
  const [errors, setErrors] = useState({})

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert("File size should not exceed 5MB")
        return
      }
      const reader = new FileReader()
      reader.onloadend = () => {
        setImage(reader.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData({ ...formData, [name]: value })
    if (errors[name]) {
      setErrors({ ...errors, [name]: "" })
    }
  }

  const validateForm = () => {
    const newErrors = {}
    if (!image) newErrors.image = "Profile picture is required"
    if (!formData.city) newErrors.city = "City is required"
    if (!formData.state) newErrors.state = "State is required"
    if (!formData.pinCode) newErrors.pinCode = "PIN code is required"
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = () => {
    if (validateForm()) {
      onNext({
        city: formData.city,
        state: formData.state,
        pinCode: formData.pinCode,
        bio: formData.bio,
        profilePicture: image,
      })
    }
  }

  return (
    <div className="space-y-6">
      <div className="border-b pb-4 mb-6">
        <h2 className="text-xl font-semibold text-gray-800">Personal Details</h2>
        <p className="text-gray-600 text-sm mt-1">Tell us about yourself and where you're located.</p>
      </div>

      <div className="text-center">
        <div className="relative w-32 h-32 mx-auto mb-4">
          {image ? (
            <img
              src={image || "/placeholder.svg"}
              alt="Profile"
              className="w-full h-full object-cover rounded-full border-4 border-purple-100"
            />
          ) : (
            <div className="w-full h-full rounded-full bg-purple-50 border-2 border-dashed border-purple-300 flex items-center justify-center">
              <Upload className="w-8 h-8 text-purple-400" />
            </div>
          )}
          <input
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <div className="absolute bottom-0 right-0 bg-purple-600 rounded-full p-2 shadow-md">
            <Upload className="w-4 h-4 text-white" />
          </div>
        </div>
        <p className="text-sm text-gray-500">Click to upload profile picture (max 5MB)</p>
        {errors.image && <p className="text-red-500 text-xs mt-1">{errors.image}</p>}
      </div>

      <div className="space-y-4">
        <div>
          <label htmlFor="apartment" className="block text-sm font-medium text-gray-700 mb-1">
            Apartment/House No.
          </label>
          <input
            type="text"
            id="apartment"
            name="apartment"
            value={formData.apartment}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
            placeholder="Enter your apartment or house number"
          />
          <p className="text-gray-500 text-xs mt-1">Your specific apartment or house identifier</p>
        </div>

        <div>
          <label htmlFor="area" className="block text-sm font-medium text-gray-700 mb-1">
            Area/Street
          </label>
          <input
            type="text"
            id="area"
            name="area"
            value={formData.area}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
            placeholder="Enter your area or street name"
          />
          <p className="text-gray-500 text-xs mt-1">The area or street where you live</p>
        </div>

        <div>
          <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">
            City <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="city"
            name="city"
            value={formData.city}
            onChange={handleInputChange}
            className={`w-full px-3 py-2 border ${
              errors.city ? "border-red-300" : "border-gray-300"
            } rounded-md focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500`}
            placeholder="Enter your city"
            required
          />
          {errors.city ? (
            <p className="text-red-500 text-xs mt-1">{errors.city}</p>
          ) : (
            <p className="text-gray-500 text-xs mt-1">The city where you're currently located</p>
          )}
        </div>

        <div>
          <label htmlFor="pinCode" className="block text-sm font-medium text-gray-700 mb-1">
            PIN Code <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            id="pinCode"
            name="pinCode"
            value={formData.pinCode}
            onChange={handleInputChange}
            className={`w-full px-3 py-2 border ${
              errors.pinCode ? "border-red-300" : "border-gray-300"
            } rounded-md focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500`}
            placeholder="Enter your PIN code"
            required
            min="0"
          />
          {errors.pinCode ? (
            <p className="text-red-500 text-xs mt-1">{errors.pinCode}</p>
          ) : (
            <p className="text-gray-500 text-xs mt-1">Your postal code for accurate location information</p>
          )}
        </div>

        <div>
          <label htmlFor="state" className="block text-sm font-medium text-gray-700 mb-1">
            State <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="state"
            name="state"
            value={formData.state}
            onChange={handleInputChange}
            className={`w-full px-3 py-2 border ${
              errors.state ? "border-red-300" : "border-gray-300"
            } rounded-md focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500`}
            placeholder="Enter your state"
            required
          />
          {errors.state ? (
            <p className="text-red-500 text-xs mt-1">{errors.state}</p>
          ) : (
            <p className="text-gray-500 text-xs mt-1">The state or province where you're located</p>
          )}
        </div>

        <div>
          <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-1">
            Bio
          </label>
          <textarea
            id="bio"
            name="bio"
            rows={4}
            value={formData.bio}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 resize-none"
            placeholder="Tell clients about yourself..."
          ></textarea>
          <p className="text-gray-500 text-xs mt-1">A brief description about yourself and your background</p>
        </div>
      </div>

      <div className="pt-6 border-t mt-8">
        <button
          onClick={handleSubmit}
          className="w-full py-2 px-4 border border-transparent rounded-md text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
        >
          Next
        </button>
      </div>
    </div>
  )
}
