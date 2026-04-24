'use client'

import { useState } from 'react'
import { Play, Plus } from 'lucide-react'


export default function PortfolioCard() {
  const [selectedVideo, setSelectedVideo] = useState(null)

  const portfolioItems= [
    { id: '1', title: 'Corporate Promo', thumbnail: '/placeholder.svg?height=120&width=200', videoUrl: 'https://example.com/video1.mp4', category: 'Corporate' },
    { id: '2', title: 'Wedding Highlights', thumbnail: '/placeholder.svg?height=120&width=200', videoUrl: 'https://example.com/video2.mp4', category: 'Events' },
    { id: '3', title: 'Product Showcase', thumbnail: '/placeholder.svg?height=120&width=200', videoUrl: 'https://example.com/video3.mp4', category: 'Commercial' },
    { id: '4', title: 'Music Video', thumbnail: '/placeholder.svg?height=120&width=200', videoUrl: 'https://example.com/video4.mp4', category: 'Music' },
    { id: '5', title: 'Travel Vlog', thumbnail: '/placeholder.svg?height=120&width=200', videoUrl: 'https://example.com/video5.mp4', category: 'Vlog' },
  ]

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Portfolio</h3>
        <button className="flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1 text-sm font-medium text-white transition-colors hover:bg-blue-700">
          <Plus className="h-4 w-4" />
          Add New
        </button>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {portfolioItems.map((item) => (
          <div key={item.id} className="group relative overflow-hidden rounded-lg">
            <img
              src={item.thumbnail}
              alt={item.title}
              className="h-32 w-full object-cover transition-transform group-hover:scale-110"
            />
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
              <button
                onClick={() => setSelectedVideo(item.videoUrl)}
                className="mb-2 rounded-full bg-white p-2 text-gray-900"
              >
                <Play className="h-6 w-6" />
              </button>
              <p className="text-xs font-medium text-white">{item.title}</p>
              <p className="text-xs text-gray-300">{item.category}</p>
            </div>
          </div>
        ))}
      </div>
      {selectedVideo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75">
          <div className="relative w-full max-w-4xl">
            <video src={selectedVideo} controls className="rounded-lg" />
            <button
              onClick={() => setSelectedVideo(null)}
              className="absolute -top-10 right-0 text-white hover:text-gray-300"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

