import { useState } from 'react'
import { Heart, Play, Film, Star, Clock, Search } from 'lucide-react'

export function EmptySavedJobs() {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <div className="flex flex-col items-center justify-center py-16">
      <div 
        className="relative mb-8"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Animated illustration */}
        <div className="relative h-64 w-64">
          {/* Central circle with pulsing effect */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <div className="absolute -inset-4 animate-pulse rounded-full bg-blue-100/50"></div>
            <div className="relative rounded-full bg-white p-6 shadow-lg">
              <Heart className={`h-12 w-12 transition-all duration-500 ${
                isHovered ? 'fill-blue-600 text-blue-600 scale-110' : 'text-blue-400'
              }`} />
            </div>
          </div>

          {/* Orbiting elements */}
          <div className="absolute inset-0 animate-[spin_10s_linear_infinite]">
            <div className="absolute left-1/2 top-0 -translate-x-1/2">
              <div className="rounded-lg bg-white p-3 shadow-md">
                <Film className="h-6 w-6 text-purple-400" />
              </div>
            </div>
          </div>
          <div className="absolute inset-0 animate-[spin_15s_linear_infinite_reverse]">
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2">
              <div className="rounded-lg bg-white p-3 shadow-md">
                <Play className="h-6 w-6 text-green-400" />
              </div>
            </div>
          </div>
          <div className="absolute inset-0 animate-[spin_12s_linear_infinite]">
            <div className="absolute left-0 top-1/2 -translate-y-1/2">
              <div className="rounded-lg bg-white p-3 shadow-md">
                <Star className="h-6 w-6 text-yellow-400" />
              </div>
            </div>
          </div>
          <div className="absolute inset-0 animate-[spin_8s_linear_infinite_reverse]">
            <div className="absolute right-0 top-1/2 -translate-y-1/2">
              <div className="rounded-lg bg-white p-3 shadow-md">
                <Clock className="h-6 w-6 text-blue-400" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <h3 className="text-center text-2xl font-semibold text-gray-900">
        Your Saved Jobs Collection is Empty
      </h3>
      
      <p className="mt-4 max-w-md text-center text-gray-600">
        Save interesting video editing opportunities to build your personalized job collection. 
        Click the heart icon <Heart className="mx-1 inline-block h-4 w-4" /> on any job post to add it here.
      </p>

      <div className="mt-8 flex flex-col items-center gap-4">
        <button className="group flex items-center gap-2 rounded-full bg-blue-600 px-6 py-3 text-white transition-all duration-200 hover:bg-blue-700">
          <Search className="h-4 w-4 transition-transform duration-200 group-hover:scale-110" />
          Explore Available Jobs
        </button>
        
        <div className="mt-4 flex items-center gap-2 text-sm text-gray-500">
          <div className="flex -space-x-2">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="relative h-8 w-8 rounded-full border-2 border-white bg-gray-100 shadow-sm"
              >
                <Film className="absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 text-gray-500" />
              </div>
            ))}
          </div>
          <span>Join 1,000+ video editors who found their perfect projects</span>
        </div>
      </div>
    </div>
  )
}

