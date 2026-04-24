import { Link } from 'react-router-dom'
import { MessageCircle } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-white">
      <div className="container mx-auto px-4 py-12 text-center">
        <div className="mx-auto max-w-lg">
          <h3 className="mb-4 text-2xl font-semibold text-gray-900">
            Still need help?
          </h3>
          <p className="mb-8 text-gray-600">
            Can't find what you're looking for? Our support team is here to help you with any questions or concerns.
          </p>
          <Link
            href="/support"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-blue-600 px-8 py-3 text-base font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:ring-offset-2"
          >
            <MessageCircle className="h-5 w-5" />
            Contact Support
          </Link>
        </div>
      </div>
    </footer>
  )
}

