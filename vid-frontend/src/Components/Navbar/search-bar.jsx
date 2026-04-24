import { useState, useRef, useEffect } from "react"
import { Search, X, ChevronDown } from "lucide-react"


export const SearchBar = ({ role, onSearch }) => {
  const [searchQuery, setSearchQuery] = useState("")
  const [isFocused, setIsFocused] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)

  const searchInputRef = useRef(null)
  const searchContainerRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
        setIsFocused(false)
        setShowSuggestions(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const getSearchPlaceholder = () => {
    if (role === "FREELANCER") return "Search for jobs..."
    if (role === "CLIENT") return "Search for editors, gigs..."
    return "Search for services..."
  }

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    onSearch(searchQuery)
    setShowSuggestions(false)
  }

  const handleInputFocus = () => {
    setIsFocused(true)
    if (searchQuery) {
      setShowSuggestions(true)
    }
  }

  const handleInputChange = (e) => {
    setSearchQuery(e.target.value)
    setShowSuggestions(e.target.value.length > 0)
  }

  const clearSearch = () => {
    setSearchQuery("")
    setShowSuggestions(false)
    if (searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }

  const selectSuggestion = (suggestion) => {
    setSearchQuery(suggestion)
    setShowSuggestions(false)
    onSearch(suggestion)
  }

  // Sample suggestions based on role
  const getSuggestions = () => {
    if (role === "FREELANCER") {
      return [
        { title: "Video Editing Job", subtitle: "Remote • Full-time" },
        { title: "Motion Graphics Project", subtitle: "Contract • 2 weeks" },
        { title: "Color Grading Gig", subtitle: "Remote • Per project" },
      ]
    } else if (role === "CLIENT") {
      return [
        { title: "Professional Video Editor", subtitle: "5-star rating • Available now" },
        { title: "Motion Graphics Expert", subtitle: "4.9-star rating • 24h response" },
        { title: "Color Grading Specialist", subtitle: "4.8-star rating • Premium" },
      ]
    } else {
      return [
        { title: "Video Production Services", subtitle: "Full-service video creation" },
        { title: "Post-Production Package", subtitle: "Editing and finishing" },
        { title: "Animation Services", subtitle: "2D and 3D animation" },
      ]
    }
  }

  return (
    <div ref={searchContainerRef} className="relative">
      <form onSubmit={handleSearchSubmit} className="relative">
        <div
          className={`relative flex items-center transition-all duration-500 ease-in-out ${
            isFocused ? "w-64" : "w-56"
          }`}
        >
          {/* Gradient background effect */}
          <div
            className={`absolute inset-0 bg-gradient-to-r from-purple-500/10 to-blue-500/10 rounded-full transition-all duration-300 ${
              isFocused ? "opacity-100" : "opacity-0"
            }`}
          ></div>

          {/* Animated border */}
          <div
            className={`absolute inset-0 border-2 rounded-full transition-all duration-300 ${
              isFocused
                ? "border-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.35)]"
                : "border-gray-200 hover:border-gray-300"
            }`}
          ></div>

          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={handleInputChange}
            onFocus={handleInputFocus}
            placeholder={getSearchPlaceholder()}
            className={`w-full h-10 pl-12 pr-10 bg-transparent rounded-full outline-none transition-all duration-300 text-sm cursor-text ${
              isFocused ? "text-gray-800" : "text-gray-600"
            }`}
            aria-label="Search"
          />

          {/* Search icon */}
          <div
            className={`absolute left-0 top-0 flex items-center justify-center w-12 h-10 text-gray-500 transition-all duration-300 ${
              isFocused ? "text-purple-600" : ""
            }`}
          >
            <Search className={`w-5 h-5 transition-all duration-300 ${isFocused ? "scale-110" : "scale-100"}`} />
          </div>

          {/* Clear button */}
          {searchQuery && (
            <button
              type="button"
              onClick={clearSearch}
              className="absolute right-10 top-0 flex items-center justify-center w-10 h-10 text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          {/* Submit button */}
          <button
            type="submit"
            className={`absolute right-0 top-0 flex items-center justify-center w-10 h-10 rounded-full transition-all duration-300 ${
              searchQuery
                ? "bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700 cursor-pointer"
                : "text-gray-400 cursor-default"
            }`}
            disabled={!searchQuery}
            aria-label="Submit search"
          >
            <ChevronDown
              className={`w-4 h-4 transform rotate-270 transition-transform duration-300 ${
                searchQuery ? "scale-110" : "scale-100"
              }`}
            />
          </button>
        </div>

        {/* Animated underline effect */}
        <div
          className={`absolute bottom-0 left-1/2 -translate-x-1/2 h-0.5 bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-500 ${
            isFocused ? "w-[calc(100%-20px)]" : "w-0"
          }`}
        ></div>
      </form>

      {/* Search suggestions */}
      {showSuggestions && (
        <div className="absolute top-full left-0 w-full mt-2 bg-white rounded-xl shadow-xl border border-gray-200 py-2 z-50 transform origin-top transition-all duration-200 animate-fadeIn">
          <div className="px-3 py-1 text-xs font-semibold text-gray-500 uppercase">Suggestions</div>
          {getSuggestions().map((item, index) => (
            <div
              key={index}
              className="px-3 py-2 hover:bg-purple-50 cursor-pointer transition-colors"
              onClick={() => selectSuggestion(item.title)}
            >
              <div className="text-sm font-medium text-gray-800">{item.title}</div>
              <div className="text-xs text-gray-500">{item.subtitle}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

