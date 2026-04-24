import { LightBulbIcon, HeartIcon, SparklesIcon, ScaleIcon } from '@heroicons/react/24/outline'

export default function CoreValues() {
  const values = [
    { name: 'Innovation', description: 'Constantly pushing the boundaries of whats possible in video editing', icon: LightBulbIcon },
    { name: 'Integrity', description: 'Building trust through transparency and ethical practices', icon: HeartIcon },
    { name: 'Creativity', description: 'Fostering an environment that nurtures and celebrates creative expression', icon: SparklesIcon },
    { name: 'Fairness', description: 'Ensuring equal opportunities and fair compensation for all our users', icon: ScaleIcon },
  ]

  return (
    <section className="relative">
      <div className="absolute inset-0 bg-gradient-to-l from-indigo-500 to-purple-600 transform -skew-y-3 -z-10"></div>
      <div className="relative bg-white shadow-xl rounded-lg overflow-hidden">
        <div className="px-4 py-8 sm:p-10">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">Our Core Values</h2>
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {values.map((value) => (
              <div key={value.name} className="flex flex-col items-center text-center bg-gradient-to-b from-indigo-50 to-purple-50 p-6 rounded-lg shadow-md">
                <div className="flex items-center justify-center h-16 w-16 rounded-full bg-indigo-600 text-white mb-4">
                  <value.icon className="h-8 w-8" aria-hidden="true" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{value.name}</h3>
                <p className="text-gray-600">{value.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

