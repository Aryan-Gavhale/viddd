export default function FoundersStory() {
    return (
      <section className="relative">
        <div className="absolute inset-0 bg-gradient-to-l from-indigo-500 to-purple-600 transform -skew-y-3 -z-10"></div>
        <div className="relative bg-white shadow-xl rounded-lg overflow-hidden">
          <div className="px-4 py-8 sm:p-10">
            <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">Our Story</h2>
            <div className="flex flex-col md:flex-row items-center md:items-start space-y-8 md:space-y-0 md:space-x-10">
              <div className="flex-shrink-0">
                <img
                  className="h-64 w-64 rounded-full object-cover shadow-lg"
                  src="/founders-placeholder.jpg"
                  alt="Founders"
                  width={256}
                  height={256}
                />
              </div>
              <div className="flex-1">
                <h3 className="text-2xl font-semibold text-indigo-700 mb-4">How It All Began</h3>
                <p className="text-gray-700 leading-relaxed mb-4">
                  Our journey began when co-founders Alex and Jamie, both passionate about video production, met at a film festival in 2015. Frustrated by the challenges of finding reliable editors for their projects, they envisioned a platform that would bridge the gap between talented editors and content creators.
                </p>
                <p className="text-gray-700 leading-relaxed">
                  What started as a small community of editors and creators has now grown into a global platform, connecting thousands of professionals and pushing the boundaries of video editing collaboration.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    )
  }
  
  