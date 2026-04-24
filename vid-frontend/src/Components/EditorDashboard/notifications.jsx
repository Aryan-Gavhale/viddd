import { Bell, X } from 'lucide-react'

export default function NotificationsCard() {
  const notifications = [
    { id: 1, message: 'New message from Client A about project revisions', time: '2 hours ago', type: 'message' },
    { id: 2, title: 'Editing Challenge', message: '24-hour video editing contest starts tomorrow!', time: '1 day ago', type: 'event' },
    { id: 3, message: 'Your application was shortlisted for the documentary project', time: '2 days ago', type: 'application' },
  ]

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
        <Bell className="h-5 w-5 text-gray-500" />
      </div>
      <div className="space-y-4">
        {notifications.map((notification) => (
          <div key={notification.id} className="flex items-start gap-4 rounded-lg bg-gray-50 p-3">
            <div className={`mt-1 h-2 w-2 flex-shrink-0 rounded-full ${
              notification.type === 'message' ? 'bg-blue-500' :
              notification.type === 'event' ? 'bg-green-500' : 'bg-yellow-500'
            }`}></div>
            <div className="flex-grow">
              {notification.title && (
                <p className="text-sm font-medium text-gray-900">{notification.title}</p>
              )}
              <p className="text-sm text-gray-700">{notification.message}</p>
              <p className="text-xs text-gray-500">{notification.time}</p>
            </div>
            <button className="text-gray-400 hover:text-gray-600">
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

