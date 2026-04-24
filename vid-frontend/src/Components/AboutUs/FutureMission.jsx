export default function FutureGoals() {
    const goals = [
      'Expand our AI-powered matching algorithm to provide even more accurate editor recommendations',
      'Introduce advanced project management tools to streamline the collaboration process',
      'Launch a mentorship program to support emerging talent in the video editing industry',
      'Develop cutting-edge virtual reality editing capabilities to stay ahead of industry trends',
      'Establish partnerships with leading software providers to offer exclusive tools and resources to our community',
    ]
  
    return (
      <section className="relative">
        <div className="absolute inset-0 bg-gradient-to-l from-indigo-500 to-purple-600 transform -skew-y-3 -z-10"></div>
        <div className="relative bg-white shadow-xl rounded-lg overflow-hidden">
          <div className="px-4 py-8 sm:p-10">
            <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">Looking Ahead</h2>
            <h3 className="text-2xl font-semibold text-indigo-700 mb-6 text-center">Our Future Goals</h3>
            <ul className="space-y-4">
              {goals.map((goal, index) => (
                <li key={index} className="flex items-start">
                  <svg className="h-6 w-6 text-indigo-600 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-gray-700">{goal}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    )
  }
  
  