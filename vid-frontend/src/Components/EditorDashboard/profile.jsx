import { Mail, MapPin, Star, Edit } from 'lucide-react'

export default function ProfileCard() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <img
            src="/placeholder.svg?height=80&width=80"
            alt="Profile"
            className="h-20 w-20 rounded-full object-cover"
          />
          <div>
            <h2 className="text-xl font-semibold text-gray-900">John Doe</h2>
            <p className="text-sm text-gray-600">Senior Video Editor & Motion Designer</p>
            <div className="mt-2 flex items-center gap-2 text-sm text-gray-600">
              <MapPin className="h-4 w-4" />
              <span>New York, USA</span>
            </div>
          </div>
        </div>
        <button className="rounded-full bg-blue-100 p-2 text-blue-600 transition-colors hover:bg-blue-200">
          <Edit className="h-5 w-5" />
        </button>
      </div>
      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
          <span className="font-medium text-gray-900">4.9</span>
          <span className="text-sm text-gray-600">(120 reviews)</span>
        </div>
        <button className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700">
          <Mail className="mr-2 inline-block h-4 w-4" />
          Contact
        </button>
      </div>
    </div>
  )
}

