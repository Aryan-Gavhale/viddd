import { Camera, Star, Clock, Award } from "lucide-react"
import { Link } from "react-router-dom";

export default function WhySection() {
  return (
    <div className="py-12 px-4 sm:px-6 lg:px-8 bg-white"> {/* Reduced padding on top and bottom */}
      <div className="max-w-7xl mx-auto">
        <div className="rounded-[32px] bg-gradient-to-br from-gray-900 via-blue-950 to-gray-900 p-6 md:p-8 overflow-hidden relative"> {/* Reduced padding here */}
          {/* Gradient accents */}
          <div className="absolute top-0 left-0 w-[400px] h-[400px] bg-blue-500/5 rounded-full blur-3xl" /> {/* Reduced size of gradient */}
          <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-indigo-500/5 rounded-full blur-3xl" /> {/* Reduced size of gradient */}

          <div className="grid items-center gap-12 lg:grid-cols-2 relative">
            <div className="relative overflow-hidden rounded-xl">
              <img
                src="/placeholder.svg?height=600&width=450"
                alt="Professional Videographer"
                width={450}
                height={450} 
                className="object-cover w-full h-full"
              />
            </div>

            <div className="space-y-8">
              <div className="space-y-4">
                <h2 className="text-3xl font-bold tracking-tight text-white lg:text-5xl ppoppins-bold"> {/* Reduced size of title */}
                  Why <span className="text-blue-400">Vidlancing</span>?
                </h2>
                <p className="text-lg text-gray-300">
                  At Vidlancing, we empower creators with top-tier video production and editing services that bring
                  their stories to life. Our experienced professionals transform raw footage into stunning visual
                  experiences, ensuring every frame tells your story perfectly.
                </p>
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                {[ 
                  {
                    icon: Camera,
                    title: "Expert Team",
                    description: "Access to professional videographers and editors with years of industry experience",
                  },
                  {
                    icon: Star,
                    title: "Quality First",
                    description: "Cinematic quality production and post-production for every project",
                  },
                  {
                    icon: Clock,
                    title: "Fast Turnaround",
                    description: "Quick delivery without compromising on quality or attention to detail",
                  },
                  {
                    icon: Award,
                    title: "Satisfaction Guaranteed",
                    description: "Dedicated to exceeding expectations with every project we deliver",
                  },
                ].map((feature, index) => (
                  <div key={index} className="space-y-3">
                    <div className="flex items-center gap-2">
                      <feature.icon className="h-5 w-5 text-blue-400" />
                      <h3 className="font-semibold text-white">{feature.title}</h3>
                    </div>
                    <p className="text-sm text-gray-400">{feature.description}</p>
                  </div>
                ))}
              </div>

              <Link to="/portfolio">

              <button className="inline-flex items-center rounded-md bg-blue-600 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-700 mt-12">
                View Our Portfolio
              </button>
              </Link>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
