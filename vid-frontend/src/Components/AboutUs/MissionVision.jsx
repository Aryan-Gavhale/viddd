export default function MissionVision() {
    return (
      <section className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-600 transform skew-y-3 -z-10"></div>
        <div className="relative bg-white shadow-xl rounded-lg overflow-hidden">
          <div className="px-4 py-8 sm:p-10">
            <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">Our Mission & Vision</h2>
            <div className="grid grid-cols-1 gap-10 sm:grid-cols-2">
              <div className="bg-gradient-to-b from-indigo-50 to-purple-50 p-6 rounded-lg">
                <h3 className="text-2xl font-semibold text-indigo-700 mb-4">Mission</h3>
                <p className="text-gray-700 leading-relaxed">
                  Our mission is to revolutionize the video editing industry by connecting talented editors with clients worldwide, fostering creativity, and streamlining the collaboration process.
                </p>
              </div>
              <div className="bg-gradient-to-b from-indigo-50 to-purple-50 p-6 rounded-lg">
                <h3 className="text-2xl font-semibold text-indigo-700 mb-4">Vision</h3>
                <p className="text-gray-700 leading-relaxed">
                  We envision a future where every content creator has access to top-tier editing talent, and every editor can showcase their skills to a global audience, pushing the boundaries of visual storytelling.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    )
  }
  
  