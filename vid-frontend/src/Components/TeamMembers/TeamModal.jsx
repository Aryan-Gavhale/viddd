import React from "react"
import { Trophy, Briefcase, Mail, Twitter, Linkedin } from "lucide-react"



export function TeamModal({ member, isOpen, onClose }) {
  if (!member || !isOpen) return null

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={member.name ? `Team member: ${member.name}` : "Team member"}
    >
      <div className="bg-gray-900 w-full max-w-5xl max-h-[90vh] overflow-hidden rounded-lg shadow-xl flex flex-col md:flex-row">
        {/* Left Section - Image */}
        <div className="w-full md:w-2/5 relative">
          <img src={member.image || "/placeholder.svg"} alt={member.name} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-gray-900 to-transparent" />
          <div className="absolute bottom-0 left-0 p-6 z-10">
            <h2 className="text-3xl font-bold text-white mb-2">{member.name}</h2>
            <div className="flex items-center gap-2 text-gray-300">
              <Briefcase className="w-4 h-4" />
              <span>{member.role}</span>
            </div>
            <div className="flex gap-4 mt-4">
              <a href={`mailto:${member.email}`} className="text-white hover:text-blue-400 transition-colors">
                <Mail className="w-5 h-5" />
              </a>
              {member.twitter && (
                <a
                  href={member.twitter}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white hover:text-blue-400 transition-colors"
                >
                  <Twitter className="w-5 h-5" />
                </a>
              )}
              {member.linkedin && (
                <a
                  href={member.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white hover:text-blue-400 transition-colors"
                >
                  <Linkedin className="w-5 h-5" />
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Right Section - Content */}
        <div className="w-full md:w-3/5 p-6 overflow-y-auto bg-gray-800">
          <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white">
            &times;
          </button>
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-semibold mb-3 text-gray-100">About</h3>
              <p className="text-gray-300 leading-relaxed">{member.bio}</p>
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-4 text-gray-100">Achievements</h3>
              <div className="space-y-4">
                {member.achievements.map((achievement) => (
                  <div key={achievement.id} className="bg-gray-700 rounded-lg p-4 border border-gray-600">
                    <div className="flex items-start gap-3">
                      <div className="mt-1">
                        <Trophy className="w-5 h-5 text-yellow-500" />
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-100">{achievement.title}</h4>
                        <p className="text-sm text-gray-300 mt-1">{achievement.description}</p>
                        <span className="inline-block mt-2 px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-300 rounded">
                          {achievement.year}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

