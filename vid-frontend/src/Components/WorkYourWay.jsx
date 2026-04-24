import { useState } from "react"
import { DollarSign, Clock, Target, Milestone } from "lucide-react"

export default function PaymentOptions() {
  const [expandedOption, setExpandedOption] = useState(0) // 0 is the index for "Fixed Price"

  const paymentOptions = [
    {
      icon: <DollarSign className="w-5 h-5" />,
      title: "Fixed Price",
      description: "Perfect for defined video projects with clear scope",
      details:
        "Set a fixed budget for your entire video project upfront. Ideal for music videos, commercials, or event highlights with clear requirements. Secure payments released upon project completion.",
    },
    {
      icon: <Clock className="w-5 h-5" />,
      title: "Hourly Rate",
      description: "Flexible pricing for dynamic editing needs",
      details:
        "Pay only for the actual time spent on your edits. Great for projects requiring multiple revisions or ongoing collaboration. Time tracking and regular progress updates included.",
    },
    {
      icon: <Target className="w-5 h-5" />,
      title: "Contract Based",
      description: "Long-term collaboration with dedicated editors",
      details:
        "Establish a contract for recurring video editing needs. Perfect for YouTube channels, social media agencies, or corporate clients needing consistent editing support.",
    },
    {
      icon: <Milestone className="w-5 h-5" />,
      title: "Milestone Based",
      description: "Break down large projects into manageable phases",
      details:
        "Split your project into key milestones with separate deliverables and payments. Ideal for documentary editing, series production, or complex video projects requiring phased approach.",
    },
  ]

  return (
    <section className="py-12 px-4 sm:px-6 lg:px-8 bg-white">
      <div className="max-w-7xl mx-auto">
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-[32px] p-6 md:p-8 overflow-hidden relative">
          <div className="grid lg:grid-cols-2 gap-6 items-center">
            {/* Image Side - Left */}
            <div className="relative p-6 lg:p-8">
              <img
                src="/placeholder.svg?height=400&width=600"
                alt="Payment options interface"
                width={600}
                height={450}
                className=""
              />
            </div>

            {/* Content Side - Right */}
            <div className="p-6 lg:p-8">
              <h2 className="text-5xl font-bold text-gray-100 mb-2">
                Flexible Payments on <span className="text-amber-400">Vidlancing</span>
              </h2>
              <p className="text-gray-300 mb-6">
                Choose the payment structure that works best for your video editing projects
              </p>

              <div className="space-y-3">
                {paymentOptions.map((option, index) => (
                  <div
                    key={index}
                    className={`group rounded-xl transition-all duration-300 ${
                      expandedOption === index ? "bg-gray-700" : "hover:bg-gray-800"
                    }`}
                  >
                    <button
                      onClick={() => setExpandedOption(expandedOption === index ? null : index)}
                      className="w-full text-left p-4"
                    >
                      <div className="flex items-start space-x-4">
                        <div className="w-10 h-10 rounded-lg bg-amber-400/20 flex items-center justify-center flex-shrink-0 text-amber-400">
                          {option.icon}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-gray-100">{option.title}</h3>
                            <svg
                              className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${
                                expandedOption === index ? "transform rotate-180" : ""
                              }`}
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                          <p className="text-gray-300 text-sm">{option.description}</p>
                          <div
                            className={`mt-3 text-sm text-gray-300 bg-gray-600/50 p-3 rounded-lg ${expandedOption === index ? "block" : "hidden"}`}
                          >
                            {option.details}
                          </div>
                        </div>
                      </div>
                    </button>
                  </div>
                ))}
              </div>

              <button className="mt-6 px-6 py-2.5 bg-amber-500 text-gray-900 text-sm font-medium rounded-xl hover:bg-amber-600 transition-colors duration-300 shadow-lg shadow-amber-500/20">
                Explore Payment Options
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

