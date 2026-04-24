import { FileVideo, Users, Film, CreditCard } from "lucide-react";

export default function HowItWorks() {
  return (
    <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white">
      <div className="max-w-7xl mx-auto">
        <div className="bg-gradient-to-br from-[#2C1A1D] via-[#1B1011] to-black
rounded-3xl overflow-hidden border border-gray-800">
          <div className="grid lg:grid-cols-2 gap-8 items-center">
            {/* Content Side */}
            <div className="p-8 lg:p-12">
              <h2 className="text-3xl lg:text-5xl font-bold text-white mb-3 tracking-tight">
                How <span className="text-[#C2F8CB]">Vidlancing</span> Works
              </h2>
              <p className="text-base text-gray-300 mb-10">
                Your journey to professional video edits in four simple steps.
              </p>

              <div className="grid sm:grid-cols-2 gap-8">
                {[
                  {
                    icon: <FileVideo className="w-6 h-6" />,
                    title: "1. Post Your Project",
                    description:
                      "Share your raw footage and project details. Describe your vision, style preferences, and any specific requirements for your video edit.",
                  },
                  {
                    icon: <Users className="w-6 h-6" />,
                    title: "2. Connect with Editor",
                    description:
                      "Get matched with top-tier video editors who specialize in your project type. Discuss your needs and choose the perfect collaborator.",
                  },
                  {
                    icon: <Film className="w-6 h-6" />,
                    title: "3. Track the Project",
                    description:
                      "Stay updated on your project's progress. Provide feedback, request revisions, and watch your vision come to life in real-time.",
                  },
                  {
                    icon: <CreditCard className="w-6 h-6" />,
                    title: "4. Get Your Final Cut",
                    description:
                      "Receive your polished, professional-grade video edit. Download in your preferred format and resolution, ready for your audience.",
                  },
                ].map((step, index) => (
                  <div key={index} className="flex items-start space-x-4 group">
                    <div className="w-12 h-12 rounded-xl bg-[#C2F8CB]/20 flex items-center justify-center flex-shrink-0 group-hover:bg-gray-700 transition-colors duration-300">
                      <div className="text-gray-100">{step.icon}</div>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-2">{step.title}</h3>
                      <p className="text-sm text-gray-400 leading-relaxed">
                        {step.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <button className="mt-10 px-6 py-3 bg-[#C2F8CB] text-black text-sm font-medium rounded-xl hover:[#C2F8CB]/20 transition-colors duration-300  shadow-blue-500/20">
                Get Started Now
              </button>
            </div>

            {/* Image Side */}
            <div className="relative h-full min-h-[400px] lg:min-h-[500px]">
              <div className="absolute inset-0 flex items-center justify-center p-8">
                <img
                  src="/placeholder.svg?height=500&width=600"
                  alt="Video editing process visualization"
                  width={600}
                  height={500}
                  className=""
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
