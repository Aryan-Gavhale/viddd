export default function Timeline() {
    const milestones = [
      { year: 2015, event: 'Founders meet at film festival' },
      { year: 2016, event: 'Platform concept developed' },
      { year: 2017, event: 'Beta launch with 100 editors' },
      { year: 2018, event: 'Official launch, 1,000 projects completed' },
      { year: 2019, event: 'Secured Series A funding' },
      { year: 2020, event: 'Expanded to 50 countries' },
      { year: 2021, event: 'Launched AI-powered matching algorithm' },
      { year: 2022, event: '100,000 projects milestone' },
      { year: 2023, event: 'Introduced real-time collaboration features' },
    ]
  
    return (
      <section className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-600 transform skew-y-3 -z-10"></div>
        <div className="relative bg-white shadow-xl rounded-lg overflow-hidden">
          <div className="px-4 py-8 sm:p-10">
            <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">Our Journey</h2>
            <div className="flex flex-col space-y-8">
              {milestones.map((milestone, index) => (
                <div key={index} className="flex items-center space-x-4">
                  <div className="flex-shrink-0 w-24 text-right font-bold text-2xl text-indigo-600">
                    {milestone.year}
                  </div>
                  <div className="flex-shrink-0 w-4 h-4 rounded-full bg-indigo-600"></div>
                  <div className="flex-grow">
                    <p className="text-lg text-gray-700">{milestone.event}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    )
  }
  
  