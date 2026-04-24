import { useState } from "react"


export default function ExperienceEducation({ onNext, onPrev, data }) {
  const [experiences, setExperiences] = useState(
    data.experiences || [{ title: "", company: "", duration: "", description: "" }],
  )
  const [education, setEducation] = useState(data.education || [{ degree: "", institution: "", year: "" }])
  const [errors, setErrors] = useState({})

  const addExperience = () => {
    setExperiences([...experiences, { title: "", company: "", duration: "", description: "" }])
  }

  const addEducation = () => {
    setEducation([...education, { degree: "", institution: "", year: "" }])
  }

  const validateForm = () => {
    const newErrors = {}
    if (experiences.some((exp) => !exp.title || !exp.company)) {
      newErrors.experience = "All experience fields are required"
    }
    if (education.some((edu) => !edu.degree || !edu.institution)) {
      newErrors.education = "All education fields are required"
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = () => {
    if (validateForm()) {
      onNext({ experiences, education })
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-semibold mb-4">
          Work Experience <span className="text-red-500">*</span>
        </h3>
        {experiences.map((exp, index) => (
          <div key={index} className="space-y-4 mb-6 p-4 bg-gray-50 rounded-lg">
            <input
              type="text"
              placeholder="Job Title"
              value={exp.title}
              onChange={(e) => {
                const newExperiences = [...experiences]
                newExperiences[index].title = e.target.value
                setExperiences(newExperiences)
              }}
              className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              required
            />
            <input
              type="text"
              placeholder="Company"
              value={exp.company}
              onChange={(e) => {
                const newExperiences = [...experiences]
                newExperiences[index].company = e.target.value
                setExperiences(newExperiences)
              }}
              className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              required
            />
            <input
              type="text"
              placeholder="Duration (e.g., Jan 2020 - Present)"
              value={exp.duration}
              onChange={(e) => {
                const newExperiences = [...experiences]
                newExperiences[index].duration = e.target.value
                setExperiences(newExperiences)
              }}
              className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
            <textarea
              placeholder="Job Description"
              value={exp.description}
              onChange={(e) => {
                const newExperiences = [...experiences]
                newExperiences[index].description = e.target.value
                setExperiences(newExperiences)
              }}
              className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              rows={3}
            />
          </div>
        ))}
        <button
          onClick={addExperience}
          type="button"
          className="mt-2 w-full inline-flex justify-center items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Add Another Experience
        </button>
        {errors.experience && <p className="text-red-500 text-xs mt-1">{errors.experience}</p>}
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4">
          Education <span className="text-red-500">*</span>
        </h3>
        {education.map((edu, index) => (
          <div key={index} className="space-y-4 mb-6 p-4 bg-gray-50 rounded-lg">
            <input
              type="text"
              placeholder="Degree/Certification"
              value={edu.degree}
              onChange={(e) => {
                const newEducation = [...education]
                newEducation[index].degree = e.target.value
                setEducation(newEducation)
              }}
              className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              required
            />
            <input
              type="text"
              placeholder="Institution"
              value={edu.institution}
              onChange={(e) => {
                const newEducation = [...education]
                newEducation[index].institution = e.target.value
                setEducation(newEducation)
              }}
              className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              required
            />
            <input
              type="text"
              placeholder="Year"
              value={edu.year}
              onChange={(e) => {
                const newEducation = [...education]
                newEducation[index].year = e.target.value
                setEducation(newEducation)
              }}
              className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>
        ))}
        <button
          onClick={addEducation}
          type="button"
          className="mt-2 w-full inline-flex justify-center items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Add Another Education
        </button>
        {errors.education && <p className="text-red-500 text-xs mt-1">{errors.education}</p>}
      </div>

      <div className="flex justify-between">
        <button
          onClick={onPrev}
          className="py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Previous
        </button>
        <button
          onClick={handleSubmit}
          className="py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Next
        </button>
      </div>
    </div>
  )
}

