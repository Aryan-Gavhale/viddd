import { Star } from "lucide-react"

export default function TestimonialSection() {
  const testimonials = [
    {
      id: 1,
      name: "Alex Johnson",
      role: "Marketing Director",
      company: "CreativeMinds",
      image: "/placeholder.svg?height=100&width=100",
      content:
        "The video editing service exceeded all my expectations. The team transformed our raw footage into a professional marketing video that helped us increase conversions by 40%.",
      rating: 5,
    },
    {
      id: 2,
      name: "Sarah Williams",
      role: "Content Creator",
      company: "TechTalks",
      image: "/placeholder.svg?height=100&width=100",
      content:
        "I've worked with many editors before, but this team truly understands how to make YouTube content shine. My engagement rates have doubled since I started using their services.",
      rating: 5,
    },
    {
      id: 3,
      name: "Michael Chen",
      role: "Indie Filmmaker",
      company: "VisualStories",
      image: "/placeholder.svg?height=100&width=100",
      content:
        "The animation work they did for my short film was absolutely stunning. They captured exactly what I was looking for and delivered ahead of schedule.",
      rating: 4.5,
    },
  ]

  return (
    <section className="py-16 px-4 md:px-8 bg-gradient-to-b from-gray-50 to-white text-gray-800 relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute top-0 left-1/4 w-1/2 h-1/2 bg-gradient-to-b from-purple-50 to-pink-50 rounded-full opacity-50 blur-3xl"></div>

      <div className="container mx-auto max-w-7xl relative z-10">
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-1 bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700 font-medium rounded-md mb-4">
            Testimonials
          </span>
          <h2 className="text-4xl md:text-5xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-600">
            What Our Clients Say
          </h2>
          <p className="text-lg md:text-xl text-gray-600 max-w-3xl mx-auto">
            Don't just take our word for it. Here's what our clients have to say about our services.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((testimonial) => (
            <div
              key={testimonial.id}
              className="bg-white p-8 rounded-md shadow-lg border border-gray-100 hover:border-purple-200 hover:shadow-xl transition-all relative overflow-hidden group"
            >
              <div className="absolute -right-6 -top-6 text-purple-100 opacity-30 group-hover:opacity-50 transition-opacity">
                <svg width="80" height="80" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M11.3 5.2c-3.7.9-6.5 5.3-6.3 9.4v.9h3.7v-.8c0-1.8 1.2-3.5 2.9-4.1.4-.1.8-.2 1.3-.2 1.5 0 2.8.8 3.5 2.1.6 1.1.7 2.2.4 3.5-.4 1.5-1.5 2.6-2.9 3.2-.4.1-.7.2-1.2.2-.5 0-.9-.1-1.4-.2l-.1.8c0 .6 0 1.2.1 1.8 0 .1.1.2.2.3.5.1 1 .2 1.5.2 1.9 0 3.5-.7 4.9-2 1.7-1.7 2.4-4.1 2-6.5-.4-2.1-1.7-3.9-3.4-5-.9-.5-1.8-.8-2.8-.9-.8-.2-1.6-.1-2.4.1zM4.4 6.2c-1.4.7-2.5 1.9-3.1 3.3-.5 1.2-.6 2.5-.4 3.7.3 1.6 1.2 3 2.5 4 .9.6 1.9 1 2.9 1.1.5.1 1.1.1 1.6 0 .4 0 .5-.1.5-.5v-1.2c0-.4 0-.4-.3-.3-.9.2-1.8.1-2.7-.4-1.1-.6-1.9-1.6-2.1-2.8-.2-1.3.1-2.5.9-3.5.8-.9 1.7-1.4 2.9-1.5.4 0 .5-.1.5-.5V6.4c0-.4 0-.4-.4-.4-.7 0-1.4.1-2 .4-.3.1-.5.1-.8-.2z" />
                </svg>
              </div>

              <div className="flex items-center gap-1 text-yellow-500 mb-6">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    size={18}
                    fill={i < Math.floor(testimonial.rating) ? "currentColor" : "none"}
                    className={i < Math.floor(testimonial.rating) ? "" : "text-gray-300"}
                  />
                ))}
                {testimonial.rating % 1 > 0 && <Star size={18} fill="currentColor" className="text-yellow-500" />}
              </div>

              <p className="text-gray-600 mb-6 italic relative z-10">"{testimonial.content}"</p>

              <div className="flex items-center gap-4">
                <div className="relative w-12 h-12 rounded-full overflow-hidden border-2 border-purple-100">
                  <img
                    src={testimonial.image || "/placeholder.svg"}
                    alt={testimonial.name}
                    fill
                    className="object-cover"
                  />
                </div>
                <div>
                  <h4 className="font-bold text-gray-800">{testimonial.name}</h4>
                  <p className="text-sm text-purple-600">
                    {testimonial.role}, {testimonial.company}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
