import { useState } from "react"
import { motion } from "framer-motion"
import {
  Sliders,
  Star,
  Clock,
  DollarSign,
  Award,
  Briefcase,
  Video,
  Palette,
  Sparkles,
  Clapperboard,
  Wand2,
  Camera,
} from "lucide-react"

const specialties = [
  {
    id: "video-editing",
    label: "Video Editing",
    icon: Clapperboard,
    bgColor: "bg-blue-50",
    iconColor: "text-blue-500",
  },
  {
    id: "motion-graphics",
    label: "Motion Graphics",
    icon: Video,
    bgColor: "bg-purple-50",
    iconColor: "text-purple-500",
  },
  {
    id: "color-grading",
    label: "Color Grading",
    icon: Wand2,
    bgColor: "bg-pink-50",
    iconColor: "text-pink-500",
  },
  {
    id: "vfx",
    label: "VFX",
    icon: Sparkles,
    bgColor: "bg-amber-50",
    iconColor: "text-amber-500",
  },
  {
    id: "sound-design",
    label: "Sound Design",
    icon: Camera,
    bgColor: "bg-green-50",
    iconColor: "text-green-500",
  },
  {
    id: "animation",
    label: "Animation",
    icon: Video,
    bgColor: "bg-red-50",
    iconColor: "text-red-500",
  },
  {
    id: "3d-modeling",
    label: "3D Modeling",
    icon: Camera,
    bgColor: "bg-blue-50",
    iconColor: "text-blue-500",
  },
  {
    id: "compositing",
    label: "Compositing",
    icon: Palette,
    bgColor: "bg-orange-50",
    iconColor: "text-orange-500",
  },
]

const experienceOptions = [
  { value: "1", label: "1+ years" },
  { value: "2", label: "2+ years" },
  { value: "5", label: "5+ years" },
  { value: "10", label: "10+ years" },
]

const availabilityOptions = [
  { value: "now", label: "Available Now" },
  { value: "week", label: "Within a week" },
  { value: "month", label: "Within a month" },
]

export default function EditorFilters() {
  const [selectedSpecialties, setSelectedSpecialties] = useState([])
  const [priceRange, setPriceRange] = useState([20, 200])
  const [selectedExperience, setSelectedExperience] = useState([])
  const [selectedAvailability, setSelectedAvailability] = useState("")

  const toggleSpecialty = (specialtyId) => {
    setSelectedSpecialties((prev) =>
      prev.includes(specialtyId) ? prev.filter((id) => id !== specialtyId) : [...prev, specialtyId],
    )
  }

  return (
    <motion.div
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      className="w-72 bg-white p-6 rounded-2xl shadow-lg"
    >
      <div className="mb-8">
        <h2 className="text-gray-600 text-sm font-semibold tracking-wider uppercase">Categories</h2>
      </div>

      {/* Specialties */}
      <div className="space-y-2 mb-8">
        {specialties.map((specialty) => (
          <button
            key={specialty.id}
            onClick={() => toggleSpecialty(specialty.id)}
            className={`w-full flex items-center gap-3 p-2 rounded-lg text-sm transition-all hover:bg-gray-50 ${
              selectedSpecialties.includes(specialty.id) ? "bg-gray-50" : ""
            }`}
          >
            <span className={`w-8 h-8 flex items-center justify-center rounded-lg ${specialty.bgColor}`}>
              <specialty.icon className={`w-4 h-4 ${specialty.iconColor}`} />
            </span>
            <span
              className={`font-medium ${
                selectedSpecialties.includes(specialty.id) ? "text-gray-900" : "text-gray-600"
              }`}
            >
              {specialty.label}
            </span>
          </button>
        ))}
      </div>

      {/* Hourly Rate Range */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-gray-900">Hourly Rate</h3>
          <span className="text-sm text-gray-500">
            ${priceRange[0]} - ${priceRange[1]}
          </span>
        </div>
        <input
          type="range"
          min="20"
          max="200"
          step="10"
          value={priceRange[1]}
          onChange={(e) => setPriceRange([priceRange[0], Number.parseInt(e.target.value)])}
          className="w-full accent-indigo-600"
        />
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>$20</span>
          <span>$200</span>
        </div>
      </div>

      {/* Experience */}
      <div className="mb-8">
        <h3 className="text-sm font-medium text-gray-900 mb-3">Experience Level</h3>
        <div className="space-y-2">
          {experienceOptions.map((option) => (
            <label key={option.value} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={selectedExperience.includes(option.value)}
                onChange={() => {
                  setSelectedExperience((prev) =>
                    prev.includes(option.value) ? prev.filter((v) => v !== option.value) : [...prev, option.value],
                  )
                }}
                className="rounded text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-sm text-gray-600">{option.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Availability */}
      <div className="mb-8">
        <h3 className="text-sm font-medium text-gray-900 mb-3">Availability</h3>
        <div className="space-y-2">
          {availabilityOptions.map((option) => (
            <label key={option.value} className="flex items-center gap-2">
              <input
                type="radio"
                name="availability"
                value={option.value}
                checked={selectedAvailability === option.value}
                onChange={(e) => setSelectedAvailability(e.target.value)}
                className="text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-sm text-gray-600">{option.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Apply Filters Button */}
      <button className="w-full bg-gradient-to-r from-indigo-600 to-indigo-500 text-white py-2.5 rounded-lg hover:from-indigo-700 hover:to-indigo-600 transition-all duration-300 font-medium shadow-sm hover:shadow-md">
        Apply Filters
      </button>
    </motion.div>
  )
}

