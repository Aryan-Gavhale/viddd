import { useState, useEffect, useRef } from "react";
import { Star, Clock, ChevronDown, Heart, ChevronRight, ChevronLeft, Filter, Check, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useSearchParams, useNavigate } from "react-router-dom"; // Added useNavigate
import { toast } from "react-toastify";
import axiosInstance from "../../utils/axios";

// Service categories with modern icons
const serviceCategories = [
  { id: "all", name: "All Services", icon: "all" },
  { id: "ads", name: "Advertising", icon: "ads" },
  { id: "youtube", name: "YouTube", icon: "youtube" },
  { id: "corporate", name: "Corporate", icon: "corporate" },
  { id: "gaming", name: "Gaming", icon: "gaming" },
  { id: "family", name: "Family", icon: "family" },
  { id: "music", name: "Music", icon: "music" },
];

export default function PremiumMarketplace() {
  const [activeTab, setActiveTab] = useState("gigs");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedVideoType, setSelectedVideoType] = useState(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [gigs, setGigs] = useState([]);
  const [editors, setEditors] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilters, setActiveFilters] = useState({
    serviceOptions: false,
    sellerDetails: false,
    budget: false,
    deliveryTime: false,
  });
  const [appliedFilters, setAppliedFilters] = useState({
    serviceOptions: [],
    sellerDetails: [],
    budget: { min: null, max: null },
    deliveryTime: null,
  });
  const [sortBy, setSortBy] = useState("Best selling");
  const [isSortOpen, setIsSortOpen] = useState(false);
  const sectionRef = useRef(null);
  const categoryRef = useRef(null);
  const [scrollPosition, setScrollPosition] = useState(0);
  const [maxScroll, setMaxScroll] = useState(0);
  const dropdownRefs = useRef({});
  const [searchParams] = useSearchParams();
  const navigate = useNavigate(); // Initialize useNavigate

  // Handle category from query params
  useEffect(() => {
    const category = searchParams.get("category")?.toLowerCase();
    if (category) {
      const normalizedCategory = category === "all" ? "all" : category.replace(/\s+/g, "_");
      setSelectedVideoType(normalizedCategory);
      setSelectedCategory(normalizedCategory);
      setSortBy(normalizedCategory === "all" ? "Best selling" : sortBy);
    }
  }, [searchParams]);

  // Handle responsive design
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
      updateScrollLimits();
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Handle clicks outside dropdowns
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isSortOpen && !event.target.closest('[data-dropdown="sort"]')) {
        setIsSortOpen(false);
      }

      Object.keys(activeFilters).forEach((key) => {
        if (activeFilters[key] && !event.target.closest(`[data-dropdown="${key}"]`)) {
          setActiveFilters((prev) => ({ ...prev, [key]: false }));
        }
      });
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isSortOpen, activeFilters]);

  // Update scroll limits for categories
  const updateScrollLimits = () => {
    if (categoryRef.current) {
      const container = categoryRef.current;
      setMaxScroll(container.scrollWidth - container.clientWidth);
    }
  };

  // Handle horizontal scrolling for categories
  const handleScroll = (direction) => {
    if (categoryRef.current) {
      const container = categoryRef.current;
      const scrollAmount = container.clientWidth * 0.8;

      if (direction === "left") {
        container.scrollBy({ left: -scrollAmount, behavior: "smooth" });
      } else {
        container.scrollBy({ left: scrollAmount, behavior: "smooth" });
      }

      setTimeout(() => {
        setScrollPosition(container.scrollLeft);
      }, 300);
    }
  };

  // Update scroll position when scrolling manually
  useEffect(() => {
    const container = categoryRef.current;
    if (!container) return;

    const handleScrollUpdate = () => {
      setScrollPosition(container.scrollLeft);
    };

    container.addEventListener("scroll", handleScrollUpdate);
    updateScrollLimits();

    return () => container.removeEventListener("scroll", handleScrollUpdate);
  }, [categoryRef.current]);

  // Fetch gigs and editors from backend
  useEffect(() => {
    const category = searchParams.get("category") || "all";
    setSelectedVideoType(category);

    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch gigs (unchanged)
        const gigResponse = await axiosInstance.get("/gigs/all");
        const fetchedGigs = gigResponse.data.data.gigs;

        let savedLookup = { GIG: new Set(), FREELANCER: new Set() };
        try {
          const savedRes = await axiosInstance.get("/saved-items", { params: { limit: 50 } });
          const savedItems = savedRes.data?.data?.items || [];
          savedLookup = {
            GIG: new Set(savedItems.filter((s) => s.entityType === "GIG").map((s) => Number(s.entityId))),
            FREELANCER: new Set(savedItems.filter((s) => s.entityType === "FREELANCER").map((s) => Number(s.entityId))),
          };
        } catch {
          // Anonymous users can still browse; they will be asked to log in when saving.
        }

        const formattedGigs = fetchedGigs.map((gig) => ({
          id: gig.id,
          title: gig.title,
          seller: gig.seller?.name || "Freelancer",
          sellerBadge: gig.seller?.badge || "",
          level: gig.seller?.level || 1,
          image:
            gig.sampleMedia.find((media) => media.mediaType === "thumbnail")?.mediaUrl ||
            "/placeholder.svg?height=400&width=600",
          category: gig.category || "uncategorized",
          // Real values come from the gig payload; default to neutral
          // placeholders (no rating, 0 reviews) instead of random demo numbers
          // so customers don't see fabricated review counts.
          rating: typeof gig.rating === "number" ? gig.rating : 0,
          reviews: typeof gig.reviews === "number" ? gig.reviews : 0,
          price: gig.pricing[0]?.price || 0,
          deliveryTime: `${gig.deliveryTime || 1} ${gig.deliveryTime === 1 ? "minute" : "minutes"}`,
          isFavorite: savedLookup.GIG.has(Number(gig.id)),
          offersConsultation: Boolean(gig.offersConsultation),
        }));
        setGigs(formattedGigs);

        // Build query params for freelancers
        const queryParams = new URLSearchParams();
        if (category && category !== "all") {
          queryParams.append("skills", category);
        }
        queryParams.append("page", "1");
        queryParams.append("limit", "10");

        // Fetch editors
        const editorsResponse = await axiosInstance.get(`/users/freelancers?${queryParams.toString()}`);
        console.log("Editors response:", editorsResponse.data);
        const fetchedEditors = editorsResponse.data.data.freelancers.map((editor) => ({
          id: editor.id,
          name: editor.name || "Unnamed Freelancer",
          specialty: editor.jobTitle || editor.skills[0] || "Video Editing",
          rating: typeof editor.rating === "number" ? editor.rating : 0,
          reviews: typeof editor.reviewCount === "number" ? editor.reviewCount : 0,
          hourlyRate: editor.hourlyRate || 50,
          image: editor.profilePicture || "/placeholder.svg?height=400&width=400",
          level: editor.experienceLevel
            ? {
                ENTRY: "Level 1",
                INTERMEDIATE: "Level 2",
                EXPERT: "Level 3",
              }[editor.experienceLevel]
            : "Level 1",
          availability: editor.availabilityStatus
            ? {
                FULL_TIME: "Available Now",
                PART_TIME: "Part-Time",
                UNAVAILABLE: "Currently Unavailable",
              }[editor.availabilityStatus]
            : "Available Now",
          isFavorite: savedLookup.FREELANCER.has(Number(editor.id)),
          category: editor.skills[0]?.toLowerCase().replace(/\s+/g, "_") || "all",
        }));

        console.log("Fetched editors:", fetchedEditors);
        setEditors(fetchedEditors);
        toast.success("Freelancers loaded successfully!");

        // Set categories
        const uniqueCategories = [
          "all",
          ...new Set([...fetchedGigs.map((gig) => gig.category), ...fetchedEditors.map((editor) => editor.category)]),
        ];
        const categoryList = uniqueCategories.map((cat) => ({
          id: cat,
          name: cat === "all" ? "All Services" : cat.split("_").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" "),
        }));
        setCategories(categoryList);

        toast.success("Data loaded successfully!");
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error(error.response?.data?.message || "Failed to load gigs and editors. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [searchParams]);

  // Handle filter changes
  const handleFilterChange = (filterType, value) => {
    if (filterType === "serviceOptions" || filterType === "sellerDetails") {
      setAppliedFilters((prev) => {
        const currentValues = [...prev[filterType]];
        const index = currentValues.indexOf(value);

        if (index === -1) {
          currentValues.push(value);
        } else {
          currentValues.splice(index, 1);
        }

        return { ...prev, [filterType]: currentValues };
      });
    } else if (filterType === "budget") {
      setAppliedFilters((prev) => ({
        ...prev,
        budget: { ...prev.budget, ...value },
      }));
    } else if (filterType === "deliveryTime") {
      setAppliedFilters((prev) => ({
        ...prev,
        deliveryTime: prev.deliveryTime === value ? null : value,
      }));
    }
  };

  // Apply filters
  const applyFilters = () => {
    setActiveFilters({
      serviceOptions: false,
      sellerDetails: false,
      budget: false,
      deliveryTime: false,
    });
  };

  // Clear all filters
  const clearFilters = () => {
    setAppliedFilters({
      serviceOptions: [],
      sellerDetails: [],
      budget: { min: null, max: null },
      deliveryTime: null,
    });
  };

  // Filter gigs/editors based on selected category, video type, and applied filters
  const filteredGigs = gigs.filter((gig) => {
    if (selectedVideoType && selectedVideoType !== "all" && gig.category !== selectedVideoType) return false;
    if (selectedCategory !== "all" && gig.category !== selectedCategory) return false;

    if (appliedFilters.serviceOptions.length > 0 && !appliedFilters.serviceOptions.includes(gig.serviceType)) return false;

    if (appliedFilters.sellerDetails.length > 0) {
      const sellerLevel = gig.sellerBadge.toLowerCase().replace(/\s+/g, "");
      if (!appliedFilters.sellerDetails.includes(sellerLevel)) return false;
    }

    if (appliedFilters.budget.min && gig.price < appliedFilters.budget.min) return false;
    if (appliedFilters.budget.max && gig.price > appliedFilters.budget.max) return false;

    if (appliedFilters.deliveryTime) {
      const deliveryDays = Number.parseInt(gig.deliveryTime.split(" ")[0]);
      if (appliedFilters.deliveryTime === "express" && deliveryDays > 1) return false;
      if (appliedFilters.deliveryTime === "3days" && deliveryDays > 3) return false;
      if (appliedFilters.deliveryTime === "7days" && deliveryDays > 7) return false;
    }

    return true;
  });

  const filteredEditors = editors.filter((editor) => {
    if (selectedVideoType && selectedVideoType !== "all" && editor.category !== selectedVideoType) return false;
    if (selectedCategory !== "all" && editor.category !== selectedCategory) return false;

    if (appliedFilters.serviceOptions.length > 0 && !appliedFilters.serviceOptions.includes(editor.specialty)) return false;

    if (appliedFilters.sellerDetails.length > 0) {
      const editorLevel = editor.level.toLowerCase().replace(/\s+/g, "");
      if (!appliedFilters.sellerDetails.includes(editorLevel)) return false;
    }

    if (appliedFilters.budget.min && editor.hourlyRate < appliedFilters.budget.min) return false;
    if (appliedFilters.budget.max && editor.hourlyRate > appliedFilters.budget.max) return false;

    return true;
  });

  // Sort gigs/editors based on selected sort option
  const sortedGigs = [...filteredGigs].sort((a, b) => {
    switch (sortBy) {
      case "Best selling":
        return b.reviews - a.reviews;
      case "Newest":
        return new Date(b.date || Date.now()) - new Date(a.date || Date.now());
      case "Best rating":
        return b.rating - a.rating;
      case "Price: Low to High":
        return a.price - b.price;
      case "Price: High to Low":
        return b.price - a.price;
      default:
        return 0;
    }
  });

  const sortedEditors = [...filteredEditors].sort((a, b) => {
    switch (sortBy) {
      case "Best selling":
        return b.reviews - a.reviews;
      case "Newest":
        return new Date(b.createdAt || Date.now()) - new Date(a.createdAt || Date.now());
      case "Best rating":
        return b.rating - a.rating;
      case "Price: Low to High":
        return a.hourlyRate - b.hourlyRate;
      case "Price: High to Low":
        return b.hourlyRate - a.hourlyRate;
      default:
        return 0;
    }
  });

  // Toggle favorite status
  const toggleFavorite = async (id, type) => {
    try {
      if (type === "gig") {
        const gig = gigs.find((g) => g.id === id);
        if (gig.isFavorite) {
          await axiosInstance.delete(`/saved-items/GIG/${id}`);
        } else {
          await axiosInstance.post("/saved-items", { entityType: "GIG", entityId: id });
        }
        setGigs(gigs.map((gig) => (gig.id === id ? { ...gig, isFavorite: !gig.isFavorite } : gig)));
        toast.success(`Gig ${gig.isFavorite ? "removed from" : "added to"} favorites`);
      } else {
        const editor = editors.find((e) => e.id === id);
        if (editor.isFavorite) {
          await axiosInstance.delete(`/saved-items/FREELANCER/${id}`);
        } else {
          await axiosInstance.post("/saved-items", { entityType: "FREELANCER", entityId: id });
        }
        setEditors(editors.map((editor) => (editor.id === id ? { ...editor, isFavorite: !editor.isFavorite } : editor)));
        toast.success(`Editor ${editor.isFavorite ? "removed from" : "added to"} favorites`);
      }
      window.dispatchEvent(new CustomEvent("saved-items:changed"));
    } catch (error) {
      console.error("Error toggling favorite:", error);
      toast.error(error.response?.status === 401 ? "Please log in to save items" : "Failed to update favorite status");
    }
  };

  // Toggle filter dropdown
  const toggleFilter = (filterName) => {
    const newFilters = Object.keys(activeFilters).reduce((acc, key) => {
      acc[key] = key === filterName ? !activeFilters[key] : false;
      return acc;
    }, {});
    setActiveFilters(newFilters);
  };

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.05 },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { type: "spring", stiffness: 100, damping: 12 },
    },
  };

  return (
    <section ref={sectionRef} className="relative overflow-hidden bg-gradient-to-b from-violet-50 to-white">
      {/* Tab Selector */}
      <div className="border-b border-slate-200 bg-white sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex">
            <motion.button
              className={`relative py-4 px-6 text-base font-medium transition-colors ${
                activeTab === "gigs" ? "text-violet-600" : "text-slate-600 hover:text-slate-900"
              }`}
              onClick={() => setActiveTab("gigs")}
            >
              Explore Gigs
              {activeTab === "gigs" && (
                <motion.div
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-violet-500 to-fuchsia-500"
                  layoutId="activeTab"
                  initial={false}
                />
              )}
            </motion.button>
            <motion.button
              className={`relative py-4 px-6 text-base font-medium transition-colors ${
                activeTab === "editors" ? "text-violet-600" : "text-slate-600 hover:text-slate-900"
              }`}
              onClick={() => setActiveTab("editors")}
            >
              Explore Editors
              {activeTab === "editors" && (
                <motion.div
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-violet-500 to-fuchsia-500"
                  layoutId="activeTab"
                  initial={false}
                />
              )}
            </motion.button>
          </div>
        </div>
      </div>

      {/* Category Selection */}
      <div className="bg-white py-6 border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="flex items-center justify-between mb-5"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-xl font-semibold text-slate-800 flex items-center">
              <Sparkles className="w-5 h-5 mr-2 text-violet-500" />
              Categories
            </h2>
            <div className="text-sm text-violet-600 font-medium">
              {selectedVideoType
                ? `Viewing: ${
                    selectedVideoType === "all"
                      ? "All Services"
                      : selectedVideoType.split("_").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" ")
                  }`
                : "All Categories"}
            </div>
          </motion.div>

          <div className="relative">
            {scrollPosition > 10 && (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white rounded-full shadow-md p-2 border border-slate-200"
                onClick={() => handleScroll("left")}
                aria-label="Scroll left"
              >
                <ChevronLeft className="w-5 h-5 text-slate-600" />
              </motion.button>
            )}

            <div
              ref={categoryRef}
              className="flex overflow-x-auto gap-4 pb-2 scrollbar-hide relative"
              onScroll={() => setScrollPosition(categoryRef.current?.scrollLeft || 0)}
            >
              {serviceCategories.map((type) => (
                <button
                  key={type.id}
                  onClick={() => {
                    setSelectedVideoType(type.id === selectedVideoType ? null : type.id);
                    setSortBy(type.id === "all" ? "Best selling" : sortBy);
                  }}
                  className={`flex flex-col items-center justify-center min-w-[120px] py-4 px-3 rounded-xl ${
                    selectedVideoType === type.id
                      ? "bg-gradient-to-br from-violet-50 to-fuchsia-50 text-violet-700 border-2 border-violet-200"
                      : "bg-white border border-slate-200 text-slate-700 hover:border-violet-200 hover:bg-slate-50"
                  } transition-all duration-200`}
                >
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 ${
                      selectedVideoType === type.id
                        ? "bg-gradient-to-br from-violet-100 to-fuchsia-100"
                        : "bg-slate-100"
                    }`}
                  >
                    <CategoryIcon type={type.icon} isSelected={selectedVideoType === type.id} />
                  </div>
                  <span className="font-medium text-sm">{type.name}</span>
                </button>
              ))}
            </div>

            {scrollPosition < maxScroll - 10 && (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white rounded-full shadow-md p-2 border border-slate-200"
                onClick={() => handleScroll("right")}
                aria-label="Scroll right"
              >
                <ChevronRight className="w-5 h-5 text-slate-600" />
              </motion.button>
            )}
          </div>
        </div>
      </div>

      {/* Filters and Sort Section */}
      <motion.div
        className="bg-white sticky top-[57px] z-10 border-b border-slate-200 shadow-sm"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center text-slate-500 mr-1">
                <Filter className="w-4 h-4 mr-1" />
                <span className="text-sm font-medium">Filters:</span>
              </div>

              <FilterDropdown
                label="Service options"
                isOpen={activeFilters.serviceOptions}
                onToggle={() => toggleFilter("serviceOptions")}
                options={[
                  { id: "video_editing", label: "Video Editing" },
                  { id: "animation", label: "Animation" },
                  { id: "motion_graphics", label: "Motion Graphics" },
                  { id: "color_grading", label: "Color Grading" },
                ]}
                selectedValues={appliedFilters.serviceOptions}
                onChange={(value) => handleFilterChange("serviceOptions", value)}
                onApply={applyFilters}
                onClear={() => setAppliedFilters((prev) => ({ ...prev, serviceOptions: [] }))}
                dropdownRef={(el) => (dropdownRefs.current.serviceOptions = el)}
              />

              <FilterDropdown
                label="Seller details"
                isOpen={activeFilters.sellerDetails}
                onToggle={() => toggleFilter("sellerDetails")}
                options={[
                  { id: "top_rated", label: "Top Rated" },
                  { id: "level_2", label: "Level 2" },
                  { id: "level_1", label: "Level 1" },
                  { id: "new_seller", label: "New Seller" },
                ]}
                selectedValues={appliedFilters.sellerDetails}
                onChange={(value) => handleFilterChange("sellerDetails", value)}
                onApply={applyFilters}
                onClear={() => setAppliedFilters((prev) => ({ ...prev, sellerDetails: [] }))}
                dropdownRef={(el) => (dropdownRefs.current.sellerDetails = el)}
              />

              <FilterDropdown
                label="Budget"
                isOpen={activeFilters.budget}
                onToggle={() => toggleFilter("budget")}
                type="range"
                budgetValues={appliedFilters.budget}
                onChange={(value) => handleFilterChange("budget", value)}
                onApply={applyFilters}
                onClear={() => setAppliedFilters((prev) => ({ ...prev, budget: { min: null, max: null } }))}
                dropdownRef={(el) => (dropdownRefs.current.budget = el)}
              />

              <FilterDropdown
                label="Delivery time"
                isOpen={activeFilters.deliveryTime}
                onToggle={() => toggleFilter("deliveryTime")}
                options={[
                  { id: "express", label: "Express 24H" },
                  { id: "3days", label: "Up to 3 days" },
                  { id: "7days", label: "Up to 7 days" },
                  { id: "anytime", label: "Anytime" },
                ]}
                selectedValues={appliedFilters.deliveryTime ? [appliedFilters.deliveryTime] : []}
                type="radio"
                onChange={(value) => handleFilterChange("deliveryTime", value)}
                onApply={applyFilters}
                onClear={() => setAppliedFilters((prev) => ({ ...prev, deliveryTime: null }))}
                dropdownRef={(el) => (dropdownRefs.current.deliveryTime = el)}
              />

              {(appliedFilters.serviceOptions.length > 0 ||
                appliedFilters.sellerDetails.length > 0 ||
                appliedFilters.budget.min ||
                appliedFilters.budget.max ||
                appliedFilters.deliveryTime) && (
                <button
                  onClick={clearFilters}
                  className="px-3 py-1.5 text-xs bg-violet-100 text-violet-700 rounded-lg hover:bg-violet-200 transition-colors flex items-center gap-1"
                >
                  <span>Clear All</span>
                </button>
              )}
            </div>

            {/* Sort Dropdown */}
            <div className="relative" data-dropdown="sort">
              <button
                className="flex items-center gap-2 text-slate-700 font-medium bg-white border border-slate-200 rounded-lg px-4 py-2 hover:border-violet-300 transition-colors"
                onClick={() => setIsSortOpen(!isSortOpen)}
              >
                <span className="text-sm">Sort by:</span> <span className="font-semibold text-sm">{sortBy}</span>
                <ChevronDown
                  className={`w-4 h-4 transition-transform duration-200 ${isSortOpen ? "rotate-180" : ""}`}
                />
              </button>

              <AnimatePresence>
                {isSortOpen && (
                  <motion.div
                    className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg z-20 border border-slate-200 overflow-hidden"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                  >
                    {["Best selling", "Newest", "Best rating", "Price: Low to High", "Price: High to Low"].map(
                      (option) => (
                        <motion.button
                          key={option}
                          className={`block w-full text-left px-4 py-2.5 text-sm ${
                            sortBy === option
                              ? "bg-gradient-to-r from-violet-50 to-fuchsia-50 text-violet-700"
                              : "text-slate-700 hover:bg-slate-50"
                          }`}
                          onClick={() => {
                            setSortBy(option);
                            setIsSortOpen(false);
                          }}
                        >
                          <div className="flex items-center">
                            {sortBy === option && <Check className="w-4 h-4 mr-2 text-violet-600" />}
                            <span className={sortBy === option ? "ml-0" : "ml-6"}>{option}</span>
                          </div>
                        </motion.button>
                      ),
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Results Section */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          className="flex flex-wrap items-center justify-between mb-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <div className="text-slate-600">
            <span className="font-semibold">{activeTab === "gigs" ? sortedGigs.length : sortedEditors.length}</span>{" "}
            {activeTab === "gigs" ? "services" : "editors"} found
          </div>
        </motion.div>

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-violet-500"></div>
          </div>
        ) : activeTab === "gigs" && sortedGigs.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl shadow-sm">
            <div className="inline-flex justify-center items-center w-16 h-16 rounded-full bg-violet-100 mb-4">
              <Filter className="w-8 h-8 text-violet-400" />
            </div>
            <p className="text-xl text-slate-600 mb-4">No services found matching your criteria.</p>
            <button
              onClick={clearFilters}
              className="px-6 py-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white rounded-lg hover:from-violet-700 hover:to-fuchsia-700 transition-colors"
            >
              Clear filters
            </button>
          </div>
        ) : activeTab === "gigs" ? (
          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {sortedGigs.map((gig) => (
              <motion.div
                key={gig.id}
                variants={itemVariants}
                className="group bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer"
                whileHover={{
                  boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)",
                  transition: { duration: 0.2 },
                }}
                onClick={() => navigate(`/gigs/${gig.id}`)}
              >
                <div className="relative aspect-[16/9] overflow-hidden">
                  <img
                    src={gig.image || "/placeholder.svg"}
                    alt={gig.title}
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />

                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <motion.div
                      className="w-12 h-12 rounded-full bg-black/60 flex items-center justify-center"
                      whileHover={{
                        scale: 1.1,
                        backgroundColor: "rgba(0, 0, 0, 0.75)",
                      }}
                    >
                      <div className="w-0 h-0 border-t-[6px] border-t-transparent border-l-[10px] border-l-white border-b-[6px] border-b-transparent ml-0.5"></div>
                    </motion.div>
                  </div>

                  <motion.button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      toggleFavorite(gig.id, "gig");
                    }}
                    className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-sm hover:bg-white transition-all duration-200"
                    aria-label={gig.isFavorite ? "Remove from favorites" : "Add to favorites"}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <Heart
                      className={`w-4 h-4 ${gig.isFavorite ? "fill-rose-500 text-rose-500" : "text-slate-600"}`}
                      style={{
                        filter: gig.isFavorite ? "drop-shadow(0 0 1px rgba(239, 68, 68, 0.5))" : "none",
                      }}
                    />
                  </motion.button>
                </div>

                <div className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-5 h-5 rounded-full bg-gradient-to-br from-violet-400 to-fuchsia-600 overflow-hidden flex items-center justify-center text-white text-xs font-bold">
                      {gig.seller.charAt(0)}
                    </div>
                    <span className="text-xs font-medium text-slate-700">{gig.seller}</span>
                    {gig.sellerBadge && (
                      <span className="text-xs px-1.5 py-0.5 bg-violet-100 text-violet-800 rounded-sm">
                        {gig.sellerBadge}
                      </span>
                    )}
                  </div>

                  <h3 className="text-sm font-medium text-slate-800 mb-2 line-clamp-2 min-h-[40px] group-hover:text-violet-700 transition-colors">
                    {gig.title}
                  </h3>

                  <div className="flex items-center gap-1 mb-3">
                    <Star className={`w-3.5 h-3.5 ${gig.reviews > 0 ? "text-amber-400 fill-amber-400" : "text-slate-300"}`} />
                    {gig.reviews > 0 ? (
                      <>
                        <span className="font-medium text-xs text-slate-800">{Number(gig.rating).toFixed(1)}</span>
                        <span className="text-xs text-slate-500">({gig.reviews})</span>
                      </>
                    ) : (
                      <span className="text-xs text-slate-500">No reviews yet</span>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <div className="flex items-center gap-1 text-slate-600">
                      <Clock className="w-3.5 h-3.5" />
                      <span className="text-xs">{gig.deliveryTime}</span>
                    </div>

                    <div className="text-right">
                      <div className="text-xs text-slate-500">From</div>
                      <div className="font-bold text-slate-900">₹{gig.price.toLocaleString()}</div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {sortedEditors.map((editor) => (
              <motion.div
                key={editor.id}
                variants={itemVariants}
                className="group bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer"
                whileHover={{
                  boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)",
                  transition: { duration: 0.2 },
                }}
                onClick={() => navigate(`/freelancers/${editor.id}`)} // Navigate to freelancer profile
              >
                <div className="relative p-6">
                  <motion.button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      toggleFavorite(editor.id, "editor");
                    }}
                    className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm hover:bg-slate-50 transition-all duration-200 border border-slate-200"
                    aria-label={editor.isFavorite ? "Remove from favorites" : "Add to favorites"}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <Heart
                      className={`w-4 h-4 ${editor.isFavorite ? "fill-rose-500 text-rose-500" : "text-slate-600"}`}
                    />
                  </motion.button>

                  <div className="flex items-start gap-4">
                    <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-violet-100">
                      <img
                        src={editor.image || "/placeholder.svg"}
                        alt={editor.name}
                        loading="lazy"
                        className="w-full h-full object-cover"
                      />
                    </div>

                    <div className="flex-1">
                      <h3 className="text-base font-semibold text-slate-800 group-hover:text-violet-700 transition-colors">
                        {editor.name}
                      </h3>
                      <p className="text-sm text-slate-600 mb-1">{editor.specialty}</p>

                      <div className="flex items-center gap-1 mb-2">
                        <Star className={`w-3.5 h-3.5 ${editor.reviews > 0 ? "text-amber-400 fill-amber-400" : "text-slate-300"}`} />
                        {editor.reviews > 0 ? (
                          <>
                            <span className="font-medium text-xs text-slate-800">{Number(editor.rating).toFixed(1)}</span>
                            <span className="text-xs text-slate-500">({editor.reviews})</span>
                          </>
                        ) : (
                          <span className="text-xs text-slate-500">No reviews yet</span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 bg-violet-100 text-violet-800 rounded text-xs font-medium">
                          {editor.level}
                        </span>
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded text-xs font-medium">
                          {editor.availability}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                    <button 
                      className="px-3 py-1.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-sm rounded-lg hover:from-violet-700 hover:to-fuchsia-700 transition-colors"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        // Add contact functionality if needed
                      }}
                    >
                      Contact
                    </button>
                    <div className="text-right">
                      <div className="text-xs text-slate-500">Hourly Rate</div>
                      <div className="font-bold text-slate-900">₹{editor.hourlyRate}/hr</div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>

      <style jsx global>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { transform: translateY(10px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
        .animate-pulse {
          animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
      `}</style>
    </section>
  );
}

// CategoryIcon component
function CategoryIcon({ type, isSelected }) {
  const iconColor = isSelected ? "#7c3aed" : "#475569";

  const icons = {
    all: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
          stroke={iconColor}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
    ads: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M16 8.99998V6.99998C16 5.89541 15.1046 4.99998 14 4.99998H5C3.89543 4.99998 3 5.89541 3 6.99998V17C3 18.1046 3.89543 19 5 19H14C15.1046 19 16 18.1046 16 17V15"
          stroke={iconColor}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M19 12H8M19 12L16 9M19 12L16 15"
          stroke={iconColor}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
    youtube: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M14 12L10.5 14V10L14 12Z"
          fill={iconColor}
          stroke={iconColor}
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path
          d="M2 12.7075V11.2924C2 8.39705 2 6.94939 2.90549 6.01792C3.8109 5.08645 5.23656 5.04613 8.08651 4.96576C9.43077 4.92916 10.8239 4.89999 12 4.89999C13.1761 4.89999 14.5692 4.92916 15.9135 4.96576C18.7634 5.04613 20.189 5.08645 21.0945 6.01792C22 6.94939 22 8.39705 22 11.2924V12.7075C22 15.6028 22 17.0505 21.0945 17.9819C20.189 18.9134 18.7635 18.9537 15.9135 19.0341C14.5692 19.0707 13.1761 19.0999 12 19.0999C10.8239 19.0999 9.43077 19.0707 8.08651 19.0341C5.23656 18.9537 3.8109 18.9134 2.90549 17.9819C2 17.0505 2 15.6028 2 12.7075Z"
          stroke={iconColor}
          strokeWidth="1.5"
        />
      </svg>
    ),
    corporate: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M7 9.01L7.01 8.99889"
          stroke={iconColor}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M11 9.01L11.01 8.99889"
          stroke={iconColor}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M7 13.01L7.01 12.9989"
          stroke={iconColor}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M11 13.01L11.01 12.9989"
          stroke={iconColor}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M7 17.01L7.01 16.9989"
          stroke={iconColor}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M11 17.01L11.01 16.9989"
          stroke={iconColor}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M15 21H3.6C3.26863 21 3 20.7314 3 20.4V5.6C3 5.26863 3.26863 5 3.6 5H20.4C20.7314 5 21 5.26863 21 5.6V14"
          stroke={iconColor}
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <path
          d="M17.5 17.5L19 19L22 16"
          stroke={iconColor}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
    gaming: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M6 11H10" stroke={iconColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M8 9L8 13" stroke={iconColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M15 12H15.01" stroke={iconColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M18 10H18.01" stroke={iconColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path
          d="M17.32 5H6.68C5.69028 5 4.91102 5.83873 4.99274 6.82584L5.91894 16.8258C6.01352 17.9652 6.97584 18.84 8.12 18.84H15.88C17.0242 18.84 17.9865 17.9652 18.0811 16.8258L19.0073 6.82584C19.089 5.83873 18.3097 5 17.32 5Z"
          stroke={iconColor}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
    family: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M8 9C9.10457 9 10 8.10457 10 7C10 5.89543 9.10457 5 8 5C6.89543 5 6 5.89543 6 7C6 8.10457 6.89543 9 8 9Z"
          stroke={iconColor}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M16 9C17.1046 9 18 8.10457 18 7C18 5.89543 17.1046 5 16 5C14.8954 5 14 5.89543 14 7C14 8.10457 14.8954 9 16 9Z"
          stroke={iconColor}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M19 15L18 14C17.5 13.5 16.5 13 16 13C15.5 13 14.5 13.5 14 14L13 15"
          stroke={iconColor}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M11 15L10 14C9.5 13.5 8.5 13 8 13C7.5 13 6.5 13.5 6 14L5 15"
          stroke={iconColor}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M8 13V19" stroke={iconColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M16 13V19" stroke={iconColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path
          d="M12 10C13.1046 10 14 9.10457 14 8C14 6.89543 13.1046 6 12 6C10.8954 6 10 6.89543 10 8C10 9.10457 10.8954 10 12 10Z"
          stroke={iconColor}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M12 10V16" stroke={iconColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M12 16L14 19" stroke={iconColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M12 16L10 19" stroke={iconColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    music: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M9 18V6C9 4.34315 10.3431 3 12 3H16.5C17.8807 3 19 4.11929 19 5.5C19 6.88071 17.8807 8 16.5 8H12"
          stroke={iconColor}
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <path
          d="M6 18C7.65685 18 9 16.6569 9 15C9 13.3431 7.65685 12 6 12C4.34315 12 3 13.3431 3 15C3 16.6569 4.34315 18 6 18Z"
          stroke={iconColor}
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <path
          d="M17 18C18.6569 18 20 16.6569 20 15C20 13.3431 18.6569 12 17 12C15.3431 12 14 13.3431 14 15C14 16.6569 15.3431 18 17 18Z"
          stroke={iconColor}
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <path d="M14 15V6" stroke={iconColor} strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  };

  return icons[type] || null;
}

// FilterDropdown component
function FilterDropdown({
  label,
  isOpen,
  onToggle,
  options = [],
  type = "checkbox",
  selectedValues = [],
  budgetValues = { min: null, max: null },
  onChange,
  onApply,
  onClear,
  dropdownRef,
}) {
  const [minBudget, setMinBudget] = useState(budgetValues.min || "");
  const [maxBudget, setMaxBudget] = useState(budgetValues.max || "");

  useEffect(() => {
    setMinBudget(budgetValues.min || "");
    setMaxBudget(budgetValues.max || "");
  }, [budgetValues]);

  const handleBudgetApply = () => {
    onChange({ min: minBudget ? Number.parseInt(minBudget) : null, max: maxBudget ? Number.parseInt(maxBudget) : null });
    onApply();
  };

  const handleBudgetClear = () => {
    setMinBudget("");
    setMaxBudget("");
    onClear();
  };

  return (
    <div className="relative" data-dropdown={label.toLowerCase().replace(/\s+/g, "-")} ref={dropdownRef}>
      <motion.button
        onClick={onToggle}
        className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm ${
          isOpen
            ? "bg-gradient-to-r from-violet-100 to-fuchsia-100 text-violet-700"
            : "bg-white border border-slate-200 text-slate-700 hover:border-violet-300"
        } transition-all duration-200`}
      >
        <span>{label}</span>
        {type === "checkbox" && selectedValues.length > 0 && (
          <span className="flex items-center justify-center w-4 h-4 text-xs bg-violet-600 text-white rounded-full">
            {selectedValues.length}
          </span>
        )}
        {type === "radio" && selectedValues.length > 0 && <span className="w-2 h-2 bg-violet-600 rounded-full"></span>}
        {type === "range" && (budgetValues.min || budgetValues.max) && (
          <span className="w-2 h-2 bg-violet-600 rounded-full"></span>
        )}
        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="absolute left-0 mt-2 w-60 bg-white rounded-lg shadow-lg z-20 border border-slate-200 p-3"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <div className="space-y-3">
              <h3 className="font-medium text-sm text-slate-800">{label}</h3>

              {type === "range" ? (
                <div className="space-y-3">
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>Min</span>
                    <span>Max</span>
                  </div>
                  <div className="flex gap-3">
                    <input
                      type="number"
                      placeholder="₹"
                      className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-md focus:border-violet-400 focus:ring focus:ring-violet-100 focus:outline-none"
                      value={minBudget}
                      onChange={(e) => setMinBudget(e.target.value)}
                    />
                    <input
                      type="number"
                      placeholder="₹"
                      className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-md focus:border-violet-400 focus:ring focus:ring-violet-100 focus:outline-none"
                      value={maxBudget}
                      onChange={(e) => setMaxBudget(e.target.value)}
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {options.map((option) => (
                    <label key={option.id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type={type}
                        name={type === "radio" ? label.toLowerCase().replace(/\s+/g, "-") : undefined}
                        className={`${type === "checkbox" ? "rounded" : "rounded-full"} border-slate-300 text-violet-600 focus:ring-violet-500`}
                        checked={selectedValues.includes(option.id)}
                        onChange={() => onChange(option.id)}
                      />
                      <span className="text-sm text-slate-700">{option.label}</span>
                    </label>
                  ))}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <motion.button
                  className="px-3 py-1 text-xs text-slate-600 hover:text-slate-800"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={type === "range" ? handleBudgetClear : onClear}
                >
                  Clear
                </motion.button>
                <motion.button
                  className="px-3 py-1 text-xs bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white rounded hover:from-violet-700 hover:to-fuchsia-700"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={type === "range" ? handleBudgetApply : onApply}
                >
                  Apply
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}