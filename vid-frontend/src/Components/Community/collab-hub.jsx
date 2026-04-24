import { useState } from "react";
import { Users, Plus, Search, Filter, Clock, DollarSign, Star, MapPin, Briefcase, GraduationCap, MessageCircle, Eye, Heart, Send } from "lucide-react";

const collaborations = [
  {
    id: 1,
    title: "Wedding Video Editor Needed - Urgent",
    description:
      "Looking for an experienced wedding video editor for a 3-day destination wedding. Need someone skilled in color grading and storytelling.",
    type: "Paid",
    budget: "$800-1200",
    deadline: "2 weeks",
    location: "Remote",
    author: "Jennifer Walsh",
    avatar: "/placeholder.svg?height=40&width=40",
    postedDate: "2 hours ago",
    applicants: 12,
    views: 89,
    likes: 5,
    requiredSkills: ["Premiere Pro", "Color Grading", "Wedding Videos", "Storytelling"],
    experience: "Intermediate",
    duration: "1-2 weeks",
    isUrgent: true,
    isVerified: true,
  },
  {
    id: 2,
    title: "YouTube Channel Collaboration - Tech Reviews",
    description:
      "Starting a tech review channel and looking for a long-term editing partner. Revenue sharing opportunity for the right person.",
    type: "Revenue Share",
    budget: "Revenue Share",
    deadline: "Ongoing",
    location: "Remote",
    author: "Alex Thompson",
    avatar: "/placeholder.svg?height=40&width=40",
    postedDate: "1 day ago",
    applicants: 8,
    views: 156,
    likes: 12,
    requiredSkills: ["YouTube Editing", "Motion Graphics", "Thumbnails", "After Effects"],
    experience: "Beginner to Intermediate",
    duration: "Long-term",
    isUrgent: false,
    isVerified: false,
  },
  {
    id: 3,
    title: "Practice Project - Short Film Editing",
    description:
      "Film student looking for editing practice partner. Great opportunity to build portfolio and learn together.",
    type: "Practice",
    budget: "Free/Portfolio",
    deadline: "1 month",
    location: "Los Angeles, CA",
    author: "Maria Santos",
    avatar: "/placeholder.svg?height=40&width=40",
    postedDate: "3 days ago",
    applicants: 15,
    views: 203,
    likes: 18,
    requiredSkills: ["DaVinci Resolve", "Narrative Editing", "Sound Design"],
    experience: "Beginner",
    duration: "2-4 weeks",
    isUrgent: false,
    isVerified: false,
  },
];

const skillOptions = [
  "Premiere Pro",
  "After Effects",
  "DaVinci Resolve",
  "Final Cut Pro",
  "Color Grading",
  "Motion Graphics",
  "Sound Design",
  "VFX",
  "Wedding Videos",
  "Corporate Videos",
  "Music Videos",
  "Documentary",
  "YouTube Editing",
  "Social Media",
  "Commercials",
  "Narrative",
];

export default function CollabHub() {
  const [filterType, setFilterType] = useState("all");
  const [filterExperience, setFilterExperience] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isPostOpen, setIsPostOpen] = useState(false);
  const [newCollab, setNewCollab] = useState({
    title: "",
    description: "",
    type: "",
    budget: "",
    deadline: "",
    location: "",
    skills: [],
    experience: "",
    duration: "",
  });

  const filteredCollabs = collaborations.filter((collab) => {
    const matchesSearch =
      collab.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      collab.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === "all" || collab.type.toLowerCase().replace(" ", "-") === filterType;
    const matchesExperience = filterExperience === "all" || collab.experience.toLowerCase() === filterExperience;
    return matchesSearch && matchesType && matchesExperience;
  });

  const handleSkillToggle = (skill) => {
    setNewCollab((prev) => ({
      ...prev,
      skills: prev.skills.includes(skill) ? prev.skills.filter((s) => s !== skill) : [...prev.skills, skill],
    }));
  };

  const handlePostCollab = () => {
    console.log("Posting collaboration:", newCollab);
    setIsPostOpen(false);
    setNewCollab({
      title: "",
      description: "",
      type: "",
      budget: "",
      deadline: "",
      location: "",
      skills: [],
      experience: "",
      duration: "",
    });
  };

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-4 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-4 h-4" />
            <input
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Search collaborations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex gap-2">
            <div className="relative w-32">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-4 h-4" />
              <select
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
              >
                <option value="all">All Types</option>
                <option value="paid">Paid</option>
                <option value="practice">Practice</option>
                <option value="revenue-share">Revenue Share</option>
              </select>
            </div>

            <div className="relative w-36">
              <select
                className="w-full pl-4 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={filterExperience}
                onChange={(e) => setFilterExperience(e.target.value)}
              >
                <option value="all">All Levels</option>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>
          </div>
        </div>

        <div>
          <button
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            onClick={() => setIsPostOpen(true)}
          >
            <Plus className="w-4 h-4" />
            Post Collaboration
          </button>
          {isPostOpen && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 max-w-3xl max-h-[90vh] overflow-y-auto">
                <h2 className="text-xl font-bold mb-2">Post a Collaboration Request</h2>
                <p className="text-gray-500 mb-4">Find the perfect editing partner for your project</p>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="collab-title" className="block text-sm font-medium">Project Title</label>
                      <input
                        id="collab-title"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g., Wedding Video Editor Needed"
                        value={newCollab.title}
                        onChange={(e) => setNewCollab({ ...newCollab, title: e.target.value })}
                      />
                    </div>

                    <div>
                      <label htmlFor="collab-type" className="block text-sm font-medium">Collaboration Type</label>
                      <select
                        id="collab-type"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={newCollab.type}
                        onChange={(e) => setNewCollab({ ...newCollab, type: e.target.value })}
                      >
                        <option value="" disabled>Select type</option>
                        <option value="paid">Paid Project</option>
                        <option value="practice">Practice/Portfolio</option>
                        <option value="revenue-share">Revenue Share</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="collab-description" className="block text-sm font-medium">Project Description</label>
                    <textarea
                      id="collab-description"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Describe your project, requirements, and what you're looking for..."
                      rows={4}
                      value={newCollab.description}
                      onChange={(e) => setNewCollab({ ...newCollab, description: e.target.value })}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label htmlFor="collab-budget" className="block text-sm font-medium">Budget</label>
                      <input
                        id="collab-budget"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g., $500-800 or Revenue Share"
                        value={newCollab.budget}
                        onChange={(e) => setNewCollab({ ...newCollab, budget: e.target.value })}
                      />
                    </div>

                    <div>
                      <label htmlFor="collab-deadline" className="block text-sm font-medium">Deadline</label>
                      <input
                        id="collab-deadline"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g., 2 weeks, 1 month"
                        value={newCollab.deadline}
                        onChange={(e) => setNewCollab({ ...newCollab, deadline: e.target.value })}
                      />
                    </div>

                    <div>
                      <label htmlFor="collab-location" className="block text-sm font-medium">Location</label>
                      <input
                        id="collab-location"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Remote or City, State"
                        value={newCollab.location}
                        onChange={(e) => setNewCollab({ ...newCollab, location: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="collab-experience" className="block text-sm font-medium">Required Experience</label>
                      <select
                        id="collab-experience"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={newCollab.experience}
                        onChange={(e) => setNewCollab({ ...newCollab, experience: e.target.value })}
                      >
                        <option value="" disabled>Select experience level</option>
                        <option value="beginner">Beginner</option>
                        <option value="intermediate">Intermediate</option>
                        <option value="advanced">Advanced</option>
                      </select>
                    </div>

                    <div>
                      <label htmlFor="collab-duration" className="block text-sm font-medium">Project Duration</label>
                      <input
                        id="collab-duration"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g., 1-2 weeks, Long-term"
                        value={newCollab.duration}
                        onChange={(e) => setNewCollab({ ...newCollab, duration: e.target.value })}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium">Required Skills</label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
                      {skillOptions.map((skill) => (
                        <div key={skill} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id={skill}
                            checked={newCollab.skills.includes(skill)}
                            onChange={() => handleSkillToggle(skill)}
                            className="h-4 w-4 text-blue-500 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <label htmlFor={skill} className="text-sm">{skill}</label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2 pt-4">
                    <button
                      className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                      onClick={handlePostCollab}
                    >
                      Post Collaboration
                    </button>
                    <button
                      className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100"
                      onClick={() => setIsPostOpen(false)}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white shadow rounded-lg">
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Active Projects</p>
                <p className="text-2xl font-bold">156</p>
              </div>
              <Briefcase className="w-8 h-8 text-gray-400" />
            </div>
          </div>
        </div>
        <div className="bg-white shadow rounded-lg">
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Successful Collabs</p>
                <p className="text-2xl font-bold">89</p>
              </div>
              <Star className="w-8 h-8 text-gray-400" />
            </div>
          </div>
        </div>
        <div className="bg-white shadow rounded-lg">
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Practice Projects</p>
                <p className="text-2xl font-bold">67</p>
              </div>
              <GraduationCap className="w-8 h-8 text-gray-400" />
            </div>
          </div>
        </div>
        <div className="bg-white shadow rounded-lg">
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Avg. Response</p>
                <p className="text-2xl font-bold">4.2h</p>
              </div>
              <Clock className="w-8 h-8 text-gray-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Collaboration Listings */}
      <div className="space-y-4">
        {filteredCollabs.map((collab) => (
          <div key={collab.id} className="bg-white shadow rounded-lg hover:shadow-md transition-shadow">
            <div className="p-6">
              <div className="flex gap-4">
                <div className="w-12 h-12 rounded-full overflow-hidden">
                  <img src={collab.avatar || "/placeholder.svg"} alt={collab.author} className="w-full h-full object-cover" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span
                          className={`px-2 py-1 rounded text-xs ${
                            collab.type === "Paid"
                              ? "bg-blue-500 text-white"
                              : collab.type === "Practice"
                              ? "bg-gray-100 text-gray-700"
                              : "border border-gray-300 text-gray-700"
                          }`}
                        >
                          {collab.type}
                        </span>
                        {collab.isUrgent && (
                          <span className="px-2 py-1 bg-red-500 text-white rounded text-xs">Urgent</span>
                        )}
                        {collab.isVerified && (
                          <span className="px-2 py-1 border border-gray-300 rounded text-xs">✓ Verified Client</span>
                        )}
                      </div>

                      <h3 className="font-semibold text-lg mb-2 hover:text-blue-500 cursor-pointer">{collab.title}</h3>

                      <p className="text-gray-500 mb-3 line-clamp-2">{collab.description}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
                    <div className="flex items-center gap-1">
                      <DollarSign className="w-4 h-4 text-gray-500" />
                      <span>{collab.budget}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4 text-gray-500" />
                      <span>{collab.deadline}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MapPin className="w-4 h-4 text-gray-500" />
                      <span>{collab.location}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <GraduationCap className="w-4 h-4 text-gray-500" />
                      <span>{collab.experience}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1 mb-4">
                    {collab.requiredSkills.map((skill) => (
                      <span key={skill} className="px-2 py-1 border border-gray-300 rounded text-xs">{skill}</span>
                    ))}
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span>{collab.author}</span>
                      <span>•</span>
                      <span>{collab.postedDate}</span>
                      <div className="flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        {collab.views}
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {collab.applicants} applicants
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button className="flex items-center gap-1 px-4 py-2 text-gray-500 hover:text-blue-500">
                        <Heart className="w-4 h-4" />
                        {collab.likes}
                      </button>
                      <button className="flex items-center gap-1 px-4 py-2 text-gray-500 hover:text-blue-500">
                        <MessageCircle className="w-4 h-4" />
                        Message
                      </button>
                      <button className="flex items-center gap-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
                        <Send className="w-4 h-4" />
                        Apply
                      </button>
                    </div>
                  </div>
                </div>
              </div>
 xenon </div>
          </div>
        ))}
      </div>
    </div>
  );
}