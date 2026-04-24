import { motion } from "framer-motion"
import { Star, Clock, CheckCircle, Award, Heart, MessageCircle } from "lucide-react"
import { Link } from "react-router-dom"




export default function EditorCard({ editor, onLike, isSaved }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="group bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300"
    >
      <div className="relative">
        <img
          src={editor.portfolio[0] || "/placeholder.svg"}
          alt={`${editor.name}'s work`}
          className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute top-4 right-4 flex gap-2">
          {editor.featured && (
            <span className="px-3 py-1 bg-gradient-to-r from-yellow-400 to-orange-400 text-white text-xs font-medium rounded-full shadow-lg">
              Featured
            </span>
          )}
          <motion.button
            onClick={() => onLike(editor.id)}
            whileTap={{ scale: 0.9 }}
            className={`p-2.5 rounded-full transition-all duration-300 ${
              isSaved ? "bg-red-500 text-white hover:bg-red-600" : "bg-white/90 backdrop-blur-sm hover:bg-white"
            }`}
          >
            <Heart className={`w-4 h-4 ${isSaved ? "fill-current" : ""}`} />
          </motion.button>
        </div>
      </div>

      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <img
              src={editor.avatar || "/placeholder.svg"}
              alt={editor.name}
              className="w-12 h-12 rounded-full object-cover ring-2 ring-white shadow-lg"
            />
            <div>
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                {editor.name}
                {editor.verified && (
                  <motion.span whileHover={{ scale: 1.1 }}>
                    <CheckCircle className="w-4 h-4 text-blue-500" />
                  </motion.span>
                )}
              </h3>
              <p className="text-sm text-gray-600">{editor.title}</p>
            </div>
          </div>
          <div className="flex items-center gap-1 bg-yellow-50 px-2 py-1 rounded-lg">
            <Star className="w-4 h-4 text-yellow-400 fill-current" />
            <span className="font-medium text-yellow-700">{editor.rating}</span>
            <span className="text-yellow-600 text-sm">({editor.reviews})</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          {editor.skills.map((skill, index) => (
            <span
              key={index}
              className="px-3 py-1 bg-gray-50 text-gray-700 text-xs rounded-full border border-gray-100"
            >
              {skill}
            </span>
          ))}
        </div>

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-gray-600">
            <Clock className="w-4 h-4" />
            <span className="text-sm">{editor.availability}</span>
          </div>
          <div className="text-right">
            <span className="text-sm text-gray-500">Starting at</span>
            <p className="font-semibold text-gray-900">${editor.hourlyRate}/hr</p>
          </div>
        </div>

        <div className="flex gap-3">
          <Link to={`/users/profile/${editor.id}`}>
          <button className="flex-1 bg-gradient-to-r from-indigo-600 to-indigo-500 text-white py-2.5 px-4 rounded-lg hover:from-indigo-700 hover:to-indigo-600 transition-all duration-300 shadow-md hover:shadow-lg font-medium">
            View Profile
          </button>
          </Link>
          <button className="flex-1 bg-white border-2 border-indigo-600 text-indigo-600 py-2.5 px-4 rounded-lg hover:bg-indigo-50 transition-all duration-300 flex items-center justify-center gap-2 font-medium">
            <MessageCircle className="w-4 h-4" />
            Contact
          </button>
        </div>
      </div>
    </motion.div>
  )
}

