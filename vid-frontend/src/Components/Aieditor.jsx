import { Sparkles, Bot, Zap, Users } from "lucide-react"
import img2 from "../assets/img2.png"

export default function AiMatchingSection() {
  return (
    <div className="py-16 px-4 sm:px-6 lg:px-8 bg-white">
      <div className="max-w-7xl mx-auto">
        <div className="rounded-[32px] bg-gradient-to-br from-gray-900 via-gray-900 to-purple-900/90 p-8 md:p-12 overflow-hidden relative">
          {/* Gradient orbs */}
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-3xl" />

          <div className="grid items-center gap-12 lg:grid-cols-2 relative">
            <div className="space-y-8">
              <div className="space-y-4">
                <h2 className="text-3xl font-bold tracking-tight text-white lg:text-5xl">
                  Find Your Perfect Editor with <span className="text-purple-400">AI</span>
                </h2>
                <p className="text-lg text-gray-300">
                  Leverage the power of artificial intelligence to discover the best editor for your project. Our
                  AI-driven tool analyzes your requirements and matches you with top-tier professionals, ensuring
                  excellence in every detail.
                </p>
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-purple-400" />
                    <h3 className="font-semibold text-white">Smart Matching</h3>
                  </div>
                  <p className="text-sm text-gray-400">
                    AI-powered algorithm finds the perfect editor for your specific needs
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Bot className="h-5 w-5 text-purple-400" />
                    <h3 className="font-semibold text-white">AI Analysis</h3>
                  </div>
                  <p className="text-sm text-gray-400">Intelligent project requirement analysis and skill matching</p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Zap className="h-5 w-5 text-purple-400" />
                    <h3 className="font-semibold text-white">Quick Match</h3>
                  </div>
                  <p className="text-sm text-gray-400">Get matched with the right professional in minutes</p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-purple-400" />
                    <h3 className="font-semibold text-white">Vetted Talent</h3>
                  </div>
                  <p className="text-sm text-gray-400">Access to pre-verified, experienced video editors</p>
                </div>
              </div>

              <button className="inline-flex items-center rounded-lg bg-purple-500 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-purple-600">
                Find Best Editors
              </button>
            </div>

            <div className="relative aspect-[3/4] overflow-hidden rounded-xl lg:ml-auto">
              <img
                src={img2}
                alt="AI-Powered Editor Matching"
                width={450}
                height={600}
                className="object-cover"
              />
              
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

