import { Link } from "react-router-dom"

export default function CallToAction() {
  return (
    <section className="mb-16">
      <div className="bg-gradient-to-b from-blue-800 to-indigo-800 shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6 text-center">
          <h2 className="text-2xl font-bold text-white mb-2">Join Our Community</h2>
          <p className="text-indigo-100 mb-4">
            Whether you're a video editor looking for exciting projects or a content creator in need of top-tier editing talent, we've got you covered.
          </p>
          <div className="flex justify-center space-x-4">
            <Link href="/signup" className="inline-flex items-center px-4 py-2 border border-transparent text-base font-medium rounded-md text-indigo-700 bg-white hover:bg-indigo-50">
              Sign Up
            </Link>
            <Link href="/how-it-works" className="inline-flex items-center px-4 py-2 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700">
              Learn More
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}

