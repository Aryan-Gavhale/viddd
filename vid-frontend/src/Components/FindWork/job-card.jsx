import { memo } from 'react'
import { Clock, DollarSign, MapPin, Heart, Play } from 'lucide-react'



export const JobCard = memo(function JobCard({
  id,
  title,
  description,
  budget,
  postedTime,
  skills,
  clientInfo,
  location,
  proposals,
  thumbnail,
  experienceLevel,
  isSaved = false,
  onSaveToggle,
  onClick,
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition-all hover:shadow-md">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <span className="text-sm text-gray-500">Posted {postedTime}</span>
            {clientInfo.verified && (
              <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                Verified Client
              </span>
            )}
          </div>
          <h3 className="mb-2 text-xl font-semibold text-gray-900">
            <button onClick={onClick} className="hover:text-blue-600">
              {title}
            </button>
          </h3>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onSaveToggle(id)
          }}
          className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
        >
          <Heart className={`h-5 w-5 ${isSaved ? 'fill-blue-600 text-blue-600' : ''}`} />
        </button>
      </div>

      <div className="mb-4 flex items-start gap-4">
        {thumbnail && (
          <div className="relative h-24 w-40 flex-shrink-0 overflow-hidden rounded-md">
            <img src={thumbnail} alt={title ? `Thumbnail for ${title}` : "Job thumbnail"} loading="lazy" className="h-full w-full object-cover" />
            <button className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity hover:opacity-100">
              <Play className="h-8 w-8 text-white" />
            </button>
          </div>
        )}
        <div className="flex-1">
          <p className="mb-4 text-gray-600 line-clamp-2">{description}</p>
          <div className="mb-4 flex flex-wrap gap-2">
            {skills.map((skill) => (
              <span
                key={skill}
                className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 border-t pt-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-gray-400" />
            <span className="font-medium text-gray-900">
              {budget.type === 'hourly' ? `${budget.amount}/hr` : budget.amount}
            </span>
            {budget.duration && (
              <span className="text-sm text-gray-500">Est. Time: {budget.duration}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-gray-400" />
            <span className="text-sm text-gray-500">{experienceLevel}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-gray-400" />
            <span className="text-sm text-gray-500">{location}</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-500">
            <span className="font-medium text-gray-900">${clientInfo.spent}K+</span> spent
          </div>
          <div className="text-sm text-gray-500">
            <span className="font-medium text-gray-900">{proposals}</span>{' '}
            {proposals === 1 ? 'proposal' : 'proposals'}
          </div>
        </div>
      </div>
    </div>
  )
})

