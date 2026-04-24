export default function Testimonials() {
    const testimonials = [
      {
        name: 'Sarah Johnson',
        role: 'Freelance Video Editor',
        image: '/testimonial-1-placeholder.jpg',
        quote: 'This platform has transformed my career. Ive connected with clients from around the world and grown my skills exponentially.',
      },
      {
        name: 'Michael Chen',
        role: 'YouTube Content Creator',
        image: '/testimonial-2-placeholder.jpg',
        quote: 'Finding the right editor used to be a nightmare. Now, I can easily find talented professionals who understand my vision.',
      },
      {
        name: 'Emma Rodriguez',
        role: 'Corporate Video Producer',
        image: '/testimonial-3-placeholder.jpg',
        quote: 'The quality of work Ive received through this platform has consistently exceeded my expectations. It\'s a game-changer.',
      },
    ]
  
    return (
      <section className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-600 transform skew-y-3 -z-10"></div>
        <div className="relative bg-white shadow-xl rounded-lg overflow-hidden">
          <div className="px-4 py-8 sm:p-10">
            <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">What Our Users Say</h2>
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {testimonials.map((testimonial) => (
                <div key={testimonial.name} className="flex flex-col items-center text-center bg-gradient-to-b from-indigo-50 to-purple-50 p-6 rounded-lg shadow-md">
                  <img
                    className="h-24 w-24 rounded-full object-cover mb-4 border-4 border-white shadow-lg"
                    src={testimonial.image || "/placeholder.svg"}
                    alt={testimonial.name}
                    width={96}
                    height={96}
                  />
                  <h3 className="text-xl font-semibold text-gray-900 mb-1">{testimonial.name}</h3>
                  <p className="text-sm text-indigo-600 mb-4">{testimonial.role}</p>
                  <p className="text-gray-600 italic">"{testimonial.quote}"</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    )
  }