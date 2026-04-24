
import { motion } from "framer-motion"
import { Video, Link2, FileText, UserCircle2, Shield, ChevronLeft } from "lucide-react"

export default function OnboardingPage() {
  return (
    <div className="h-screen bg-gradient-to-br from-violet-50 to-blue-50 flex items-center">
      <div className="max-w-7xl mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid md:grid-cols-2 gap-8 items-center"
        >
          {/* Left Column - Image */}
          <div className="relative h-[300px] md:h-[400px] rounded-3xl overflow-hidden">
            <img
              src="/placeholder.svg?height=600&width=800"
              alt="Video editor working"
              fill
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
          </div>

          {/* Right Column - Content */}
          <div className="space-y-4">
            <div className="space-y-2">
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-3xl md:text-4xl font-bold text-gray-900"
              >
                What makes a successful Vidlancing profile?
              </motion.h1>
              <p className="text-lg text-gray-600">
                Your creative portfolio matters! Stand out in the video editing community.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                {
                  icon: Video,
                  title: "Showcase Your Best Work",
                  description: "Upload your finest video edits",
                },
                {
                  icon: Link2,
                  title: "Connect Portfolio",
                  description: "Link to YouTube, Vimeo & more",
                },
                {
                  icon: FileText,
                  title: "Detail Expertise",
                  description: "List your skills and specialties",
                },
                {
                  icon: UserCircle2,
                  title: "Professional Presence",
                  description: "Add your photo and bio",
                },
                {
                  icon: Shield,
                  title: "Verify Identity",
                  description: "Build trust with verification",
                },
              ].map((item, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + index * 0.1 }}
                  className="flex items-start gap-3 p-3 rounded-xl bg-white/60 backdrop-blur-sm border border-white/80 hover:bg-white/80 transition-colors"
                >
                  <div className="p-2 rounded-lg bg-gradient-to-br from-violet-500 to-blue-500 text-white shrink-0">
                    <item.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 text-sm">{item.title}</h3>
                    <p className="text-gray-600 text-xs">{item.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-4">
              <button className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors">
                <ChevronLeft className="w-4 h-4" />
                Back
              </button>
              <button className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 text-white font-medium hover:from-violet-700 hover:to-blue-700 transition-colors">
                Continue
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

