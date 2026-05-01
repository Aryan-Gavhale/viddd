import { CheckCircle, AlertCircle } from "lucide-react"

function PreviewSection({ title, children }) {
  return (
    <div className="border-b border-gray-200 pb-6 mb-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-3">{title}</h3>
      <div className="space-y-2">{children}</div>
    </div>
  )
}

function FieldError({ error }) {
  if (!error) return null;
  return (
    <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
      <AlertCircle className="w-3 h-3 shrink-0" />
      {error}
    </p>
  );
}

export default function Preview({ data, onEdit, onSubmit, submitting, submitError, fieldErrors = {} }) {
  const hasErrors = Object.keys(fieldErrors).length > 0;
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
                    <div className={`p-3 rounded-lg ${fieldErrors.city ? "bg-red-50 border border-red-200" : "bg-gray-50"}`}>
                      <p className="text-sm font-medium text-gray-500">City</p>
                      <p className="text-gray-900">{data.city || "Not specified"}</p>
                      <FieldError error={fieldErrors.city} />
                    </div>
                    <div className={`p-3 rounded-lg ${fieldErrors.state ? "bg-red-50 border border-red-200" : "bg-gray-50"}`}>
                      <p className="text-sm font-medium text-gray-500">State</p>
                      <p className="text-gray-900">{data.state || "Not specified"}</p>
                      <FieldError error={fieldErrors.state} />
                    </div>
                    <div className={`p-3 rounded-lg ${fieldErrors.pinCode ? "bg-red-50 border border-red-200" : "bg-gray-50"}`}>
                      <p className="text-sm font-medium text-gray-500">PIN Code</p>
                      <p className="text-gray-900">{data.pinCode || "Not specified"}</p>
                      <FieldError error={fieldErrors.pinCode} />
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
              <div className={`p-3 rounded-lg ${fieldErrors.jobTitle ? "bg-red-50 border border-red-200" : "bg-gray-50"}`}>
                <p className="text-sm font-medium text-gray-500">Job Title</p>
                <p className="text-gray-900">{data.jobTitle || "Not specified"}</p>
                <FieldError error={fieldErrors.jobTitle} />
              </div>
              <div className={`p-3 rounded-lg ${fieldErrors.overview ? "bg-red-50 border border-red-200" : "bg-gray-50"}`}>
                <p className="text-sm font-medium text-gray-500">Overview</p>
                <p className="text-gray-900 whitespace-pre-line">{data.overview || "Not specified"}</p>
                <FieldError error={fieldErrors.overview} />
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
                <div className={`p-3 rounded-lg mt-3 ${fieldErrors.certifications ? "bg-red-50 border border-red-200" : "bg-gray-50"}`}>
                  <p className="text-sm font-medium text-gray-500">Certifications</p>
                  {Array.isArray(data.certifications) ? (
                    <div className="flex flex-wrap gap-2 mt-1">
                      {data.certifications.map((cert) => (
                        <span key={cert} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">{cert}</span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-900">{data.certifications}</p>
                  )}
                  <FieldError error={fieldErrors.certifications} />
                </div>
              )}
            </PreviewSection>

            <PreviewSection title="Rates & Availability">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className={`p-3 rounded-lg ${fieldErrors.minimumRate ? "bg-red-50 border border-red-200" : "bg-gray-50"}`}>
                  <p className="text-sm font-medium text-gray-500">Minimum Rate</p>
                  <p className="text-gray-900">${data.minimumRate || "Not specified"}</p>
                  <FieldError error={fieldErrors.minimumRate} />
                </div>
                <div className={`p-3 rounded-lg ${fieldErrors.maximumRate ? "bg-red-50 border border-red-200" : "bg-gray-50"}`}>
                  <p className="text-sm font-medium text-gray-500">Maximum Rate</p>
                  <p className="text-gray-900">${data.maximumRate || "Not specified"}</p>
                  <FieldError error={fieldErrors.maximumRate} />
                </div>
                <div className={`p-3 rounded-lg ${fieldErrors.hourlyRate ? "bg-red-50 border border-red-200" : "bg-gray-50"}`}>
                  <p className="text-sm font-medium text-gray-500">Hourly Rate</p>
                  <p className="text-gray-900">${data.hourlyRate || "Not specified"}</p>
                  <FieldError error={fieldErrors.hourlyRate} />
                </div>
                <div className={`p-3 rounded-lg ${fieldErrors.weeklyHours ? "bg-red-50 border border-red-200" : "bg-gray-50"}`}>
                  <p className="text-sm font-medium text-gray-500">Weekly Hours</p>
                  <p className="text-gray-900">{data.weeklyHours || "Not specified"}</p>
                  <FieldError error={fieldErrors.weeklyHours} />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                <div className={`p-3 rounded-lg ${fieldErrors.availabilityStatus ? "bg-red-50 border border-red-200" : "bg-gray-50"}`}>
                  <p className="text-sm font-medium text-gray-500">Availability</p>
                  <p className="text-gray-900">{data.availabilityStatus || "Not specified"}</p>
                  <FieldError error={fieldErrors.availabilityStatus} />
                </div>
                <div className={`p-3 rounded-lg ${fieldErrors.experienceLevel ? "bg-red-50 border border-red-200" : "bg-gray-50"}`}>
                  <p className="text-sm font-medium text-gray-500">Experience Level</p>
                  <p className="text-gray-900">{data.experienceLevel || "Not specified"}</p>
                  <FieldError error={fieldErrors.experienceLevel} />
                </div>
              </div>
            </PreviewSection>
          </div>

          {submitError && (
            <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-red-700 mb-1">Submission Failed</p>
                  {hasErrors ? (
                    <ul className="text-sm text-red-600 space-y-1 list-disc list-inside">
                      {Object.entries(fieldErrors).map(([field, msg]) => (
                        <li key={field}><span className="font-medium">{field}</span>: {msg}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-red-600">{submitError}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="mt-8 flex justify-between">
            <button
              onClick={onEdit}
              disabled={submitting}
              className="py-2 px-4 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50"
            >
              Edit
            </button>
            <button
              onClick={onSubmit}
              disabled={submitting}
              className="py-2 px-4 border border-transparent rounded-md text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 flex items-center gap-2"
            >
              {submitting ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                  Saving...
                </>
              ) : "Submit"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
