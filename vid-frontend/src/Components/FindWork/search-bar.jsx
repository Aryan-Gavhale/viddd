
import { useState, useEffect } from 'react'
import { Search } from 'lucide-react'

const suggestions = [
  'Video Editing',
  'Motion Graphics',
  'Color Grading',
  'Sound Design',
  'VFX',
  'Animation',
]

export function SearchBar() {
  const [query, setQuery] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!(event.target ).closest('#search-container')) {
        setShowSuggestions(false)
      }
    }

    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [])

  const filteredSuggestions = suggestions.filter(suggestion =>
    suggestion.toLowerCase().includes(query.toLowerCase())
  )

  return (
    <div id="search-container" className="relative w-full max-w-2xl">
      <div className="relative">
        <input
          type="text"
          className="w-full rounded-full border border-gray-300 bg-white py-2 pl-4 pr-10 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          placeholder="Search for video editing jobs..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setShowSuggestions(true)}
        />
        <button className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-500">
          <Search className="h-5 w-5" />
        </button>
      </div>
      {showSuggestions && filteredSuggestions.length > 0 && (
        <ul className="absolute z-10 mt-1 w-full rounded-md bg-white shadow-lg">
          {filteredSuggestions.map((suggestion, index) => (
            <li
              key={index}
              className="cursor-pointer px-4 py-2 hover:bg-blue-50"
              onClick={() => {
                setQuery(suggestion)
                setShowSuggestions(false)
              }}
            >
              {suggestion}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

