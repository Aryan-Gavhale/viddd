import { ArrowRight } from "lucide-react"

export default function Suite() {
  return (
    <div className="py-12 px-4 sm:px-6 lg:px-8 bg-gray-50">
      <div className="mx-auto max-w-7xl">
        <div className="rounded-[32px] bg-[#0A1A1A] p-8 md:p-12">
          <div className="grid items-center gap-8 lg:grid-cols-2">
            <div className="space-y-6">
              <p className="text-emerald-400 text-sm font-medium">Project Management Suite</p>
              <h2 className="text-3xl font-bold tracking-tight text-white lg:text-4xl">
                This is how great projects come to life
              </h2>
              <p className="text-lg text-gray-300">
                Access our elite network of video professionals and track your projects in real-time. Experience
                seamless collaboration with Vidlancing.
              </p>
              <ul className="space-y-4 text-gray-300">
                <li className="flex items-center gap-3">
                  <span className="rounded-full bg-emerald-500/10 p-1">
                    <svg className="h-5 w-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                  Real-time project updates and milestone tracking
                </li>
                <li className="flex items-center gap-3">
                  <span className="rounded-full bg-emerald-500/10 p-1">
                    <svg className="h-5 w-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                  Direct communication with your creative team
                </li>
                <li className="flex items-center gap-3">
                  <span className="rounded-full bg-emerald-500/10 p-1">
                    <svg className="h-5 w-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                  Comprehensive project management dashboard
                </li>
              </ul>
              <button className="inline-flex items-center rounded-lg bg-emerald-500 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-emerald-600">
                Learn more
                <ArrowRight className="ml-2 h-4 w-4" />
              </button>
            </div>
            <div className="relative aspect-[4/3] overflow-hidden rounded-xl lg:ml-auto">
              <img
                src="/placeholder.svg?height=400&width=500"
                alt="Project Management Dashboard"
                width={500}
                height={400}
                className="object-cover"
              />
              <div className="absolute inset-0 rounded-xl ring-1 ring-inset ring-white/10" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

