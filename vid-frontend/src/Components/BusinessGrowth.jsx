import { TrendingUp, Users, Globe, Target } from "lucide-react"

export default function GrowthSection() {
  return (
    <div className="py-16 px-4 sm:px-6 lg:px-8 bg-white">
      <div className="max-w-7xl mx-auto">
        <div className="rounded-[32px] bg-gradient-to-br from-teal-950 via-emerald-950 to-gray-900 p-8 md:p-12 overflow-hidden relative">
          {/* Gradient accents */}
          <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-teal-500/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-3xl" />

          <div className="grid items-center gap-12 lg:grid-cols-2 relative">
            <div className="relative aspect-[8/9] overflow-hidden rounded-xl">
              <img
                src="{img2}"
                alt="Business Growth Visualization"
                width={450}
                height={600}
                className="object-cover"
              />
              <div />
            </div>

            <div className="space-y-8">
              <div className="space-y-4 ">
                <h2 className="text-3xl font-bold tracking-tight text-white lg:text-5xl">
                  Grow Your Business with <span className="text-teal-400">Vidlancing</span>
                </h2>
                <p className="text-lg text-gray-300">
                  Take your business to new heights with Vidlancing. Reach a wider audience, boost your visibility, and
                  engage with the right people using our powerful platform tailored for growth.
                </p>
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-teal-400" />
                    <h3 className="font-semibold text-white">Scale Fast</h3>
                  </div>
                  <p className="text-sm text-gray-400">Accelerate your growth with professional video content</p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-teal-400" />
                    <h3 className="font-semibold text-white">Wider Reach</h3>
                  </div>
                  <p className="text-sm text-gray-400">Connect with your target audience effectively</p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Globe className="h-5 w-5 text-teal-400" />
                    <h3 className="font-semibold text-white">Global Access</h3>
                  </div>
                  <p className="text-sm text-gray-400">Work with top talent from around the world</p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-teal-400" />
                    <h3 className="font-semibold text-white">Strategic Growth</h3>
                  </div>
                  <p className="text-sm text-gray-400">Data-driven insights to guide your success</p>
                </div>
              </div>

              <button className="inline-flex items-center rounded-lg bg-teal-500 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-teal-600">
                Get Started
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

