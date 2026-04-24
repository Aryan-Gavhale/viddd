import { CheckCircle } from "lucide-react"

function PreviewSection({ title, children }) {
  return (
    <div className="border-b border-gray-200 pb-6 mb-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-3">{title}</h3>
      <div className="space-y-2">{children}</div>
    </div>
  )
}

export default function Preview({ data, onEdit, onSubmit }) {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Profile Preview</h1>
          <div className="flex items-center text-green-600">
            <CheckCircle className="w-5 h-5 mr-2" />
            <span className="font-medium">Ready to submit</span>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-8">
          <div className="space-y-6">
            <PreviewSection title="Personal Details">
              <div className="flex items-start">
                {data.profilePicture && (
                  <img
                    src={data.profilePicture || "/placeholder.svg"}
                    alt="Profile"
                    className="w-24 h-24 rounded-full object-cover border-4 border-purple-100 mr-4"
                  />
                )}
                <div className="flex-1">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-sm font-medium text-gray-500">City</p>
                      <p className="text-gray-900">{data.city || "Not specified"}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-sm font-medium text-gray-500">State</p>
                      <p className="text-gray-900">{data.state || "Not specified"}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-sm font-medium text-gray-500">PIN Code</p>
                      <p className="text-gray-900">{data.pinCode || "Not specified"}</p>
                    </div>
                  </div>
                </div>
              </div>
              {data.bio && (
                <div className="bg-gray-50 p-3 rounded-lg mt-4">
                  <p className="text-sm font-medium text-gray-500">Bio</p>
                  <p className="text-gray-900 whitespace-pre-line">{data.bio}</p>
                </div>
              )}
            </PreviewSection>

            <PreviewSection title="Professional Overview">
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-sm font-medium text-gray-500">Job Title</p>
                <p className="text-gray-900">{data.jobTitle || "Not specified"}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-sm font-medium text-gray-500">Overview</p>
                <p className="text-gray-900 whitespace-pre-line">{data.overview || "Not specified"}</p>
              </div>
              {data.languages?.length > 0 && (
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-sm font-medium text-gray-500">Languages</p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {data.languages.map((lang) => (
                      <span
                        key={lang}
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800"
                      >
                        {lang}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </PreviewSection>

            <PreviewSection title="Skills & Portfolio">
              {data.skills?.length > 0 && (
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-sm font-medium text-gray-500">Skills</p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {data.skills.map((skill) => (
                      <span
                        key={skill}
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {data.portfolioVideos?.length > 0 && (
                <div className="space-y-3 mt-3">
                  <p className="text-sm font-medium text-gray-500">Portfolio Videos</p>
                  {data.portfolioVideos.map(
                    (video, index) =>
                      video.title && (
                        <div key={index} className="bg-gray-50 p-3 rounded-lg">
                          <p className="font-medium text-gray-900">{video.title}</p>
                          {video.videoUrl && <p className="text-sm text-gray-600">URL: {video.videoUrl}</p>}
                          {video.description && <p className="text-sm text-gray-600 mt-1">{video.description}</p>}
                        </div>
                      ),
                  )}
                </div>
              )}
            </PreviewSection>

            <PreviewSection title="Tools, Equipment & Certifications">
              {data.tools?.length > 0 && (
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-sm font-medium text-gray-500">Tools</p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {data.tools.map((tool) => (
                      <span
                        key={tool}
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800"
                      >
                        {tool}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                {data.equipmentCameras && (
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-sm font-medium text-gray-500">Cameras</p>
                    <p className="text-gray-900">{data.equipmentCameras}</p>
                  </div>
                )}
                {data.equipmentLenses && (
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-sm font-medium text-gray-500">Lenses</p>
                    <p className="text-gray-900">{data.equipmentLenses}</p>
                  </div>
                )}
                {data.equipmentLighting && (
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-sm font-medium text-gray-500">Lighting</p>
                    <p className="text-gray-900">{data.equipmentLighting}</p>
                  </div>
                )}
                {data.equipmentOther && (
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-sm font-medium text-gray-500">Other Equipment</p>
                    <p className="text-gray-900">{data.equipmentOther}</p>
                  </div>
                )}
              </div>
              {data.certifications && (
                <div className="bg-gray-50 p-3 rounded-lg mt-3">
                  <p className="text-sm font-medium text-gray-500">Certifications</p>
                  <p className="text-gray-900">{data.certifications}</p>
                </div>
              )}
            </PreviewSection>

            <PreviewSection title="Rates & Availability">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-sm font-medium text-gray-500">Minimum Rate</p>
                  <p className="text-gray-900">${data.minimumRate || "Not specified"}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-sm font-medium text-gray-500">Maximum Rate</p>
                  <p className="text-gray-900">${data.maximumRate || "Not specified"}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-sm font-medium text-gray-500">Hourly Rate</p>
                  <p className="text-gray-900">${data.hourlyRate || "Not specified"}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-sm font-medium text-gray-500">Weekly Hours</p>
                  <p className="text-gray-900">{data.weeklyHours || "Not specified"}</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-sm font-medium text-gray-500">Availability</p>
                  <p className="text-gray-900">{data.availabilityStatus || "Not specified"}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-sm font-medium text-gray-500">Experience Level</p>
                  <p className="text-gray-900">{data.experienceLevel || "Not specified"}</p>
                </div>
              </div>
            </PreviewSection>
          </div>

          <div className="mt-8 flex justify-between">
            <button
              onClick={onEdit}
              className="py-2 px-4 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
            >
              Edit
            </button>
            <button
              onClick={onSubmit}
              className="py-2 px-4 border border-transparent rounded-md text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
            >
              Submit
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
