import { useState, useEffect } from "react";
import { Heart } from "lucide-react";

export const LikedSection = ({ initialItems = [] }) => {
  const [likedItems, setLikedItems] = useState(initialItems);
  const [isOpen, setIsOpen] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    const savedItems = sessionStorage.getItem("likedItems");
    if (savedItems) {
      try {
        setLikedItems(JSON.parse(savedItems));
      } catch (e) {
        console.error("Failed to parse liked items", e);
      }
    }
  }, []);

  const handleHeartClick = () => {
    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 1000);
    setIsOpen(!isOpen);
  };

  const removeItem = (id) => {
    const newItems = likedItems.filter((item) => item.id !== id);
    setLikedItems(newItems);
    sessionStorage.setItem("likedItems", JSON.stringify(newItems));
  };

  return (
    <div className="relative ml-2">
      <button
        className="relative flex items-center justify-center w-10 h-10 rounded-full hover:bg-purple-50 transition-colors"
        onClick={handleHeartClick}
        aria-label="Liked items"
      >
        <Heart
          className={`w-5 h-5 transition-all duration-300 ${
            isAnimating
              ? "text-red-500 scale-125 animate-heartbeat"
              : likedItems.length > 0
              ? "text-red-500"
              : "text-gray-500 hover:text-red-400"
          }`}
          fill={likedItems.length > 0 ? "currentColor" : "none"}
        />

        {likedItems.length > 0 && (
          <span className="absolute -top-1 -right-1 flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full">
            {likedItems.length}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-gray-200">
          <div className="p-3 border-b border-gray-100">
            <h3 className="font-medium text-gray-900">Liked Items</h3>
            <p className="text-xs text-gray-500">Items you've saved</p>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {likedItems.length > 0 ? (
              <div className="py-2">
                {likedItems.map((item) => (
                  <div key={item.id} className="flex items-center px-3 py-2 hover:bg-purple-50">
                    <div className="w-10 h-10 rounded-md bg-purple-100 flex items-center justify-center text-lg mr-3">
                      {item.image ? (
                        <img
                          src={item.image || "/placeholder.svg"}
                          alt={item.title}
                          className="w-full h-full object-cover rounded-md"
                        />
                      ) : (
                        item.title.charAt(0)
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{item.title}</p>
                      <p className="text-xs text-gray-500">{item.type}</p>
                    </div>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="ml-2 text-gray-400 hover:text-red-500 transition-colors"
                      aria-label="Remove from liked"
                    >
                      <Heart className="w-4 h-4" fill="currentColor" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center">
                <Heart className="w-12 h-12 mx-auto text-gray-300" />
                <p className="mt-2 text-sm text-gray-500">No liked items yet</p>
                <p className="text-xs text-gray-400">Items you like will appear here</p>
              </div>
            )}
          </div>

          {likedItems.length > 0 && (
            <div className="p-3 border-t border-gray-100">
              <button className="w-full py-2 text-sm font-medium text-white bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg hover:from-purple-700 hover:to-blue-700 transition-colors">
                View All Liked Items
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
