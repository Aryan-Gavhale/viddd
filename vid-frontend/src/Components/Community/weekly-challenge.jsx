import { useState } from "react";
import { Trophy, Calendar, Users, Play, Crown, Eye, ThumbsUp } from "lucide-react";

const currentChallenge = {
  id: 1,
  title: "Cinematic Color Grading Challenge",
  description:
    "Transform this raw footage into a cinematic masterpiece using only color grading techniques. Focus on mood, atmosphere, and storytelling through color.",
  briefing:
    "You have been provided with raw LOG footage from a short film. Your task is to create a cinematic look that enhances the emotional impact of the scene. Consider the time of day, character emotions, and overall story arc.",
  requirements: [
    "Use only color grading (no additional effects)",
    "Maintain natural skin tones",
    "Create a cohesive look throughout",
    "Export in 1080p ProRes 422",
  ],
  rawFootageUrl: "/placeholder.svg?height=200&width=300",
  downloadUrl: "#",
  deadline: "6 days",
  timeLeft: "5d 14h 32m",
  totalEntries: 47,
  maxEntries: 100,
  prize: "$500 + Featured Showcase",
  difficulty: "Intermediate",
  category: "Color Grading",
  sponsor: "ColorGrade Pro",
  isActive: true,
};

const pastChallenges = [
  {
    id: 2,
    title: "Social Media Transitions",
    description: "Create engaging transitions for social media content",
    winner: "Alex Chen",
    winnerAvatar: "/placeholder.svg?height=40&width=40",
    entries: 89,
    completedDate: "1 week ago",
    category: "Transitions",
  },
  {
    id: 3,
    title: "Documentary Storytelling",
    description: "Edit a compelling 2-minute documentary segment",
    winner: "Sarah Kim",
    winnerAvatar: "/placeholder.svg?height=40&width=40",
    entries: 156,
    completedDate: "2 weeks ago",
    category: "Documentary",
  },
];

const leaderboard = [
  {
    rank: 1,
    name: "Alex Chen",
    avatar: "/placeholder.svg?height=40&width=40",
    points: 2847,
    wins: 12,
    badges: ["🏆"],
    isVerified: true,
  },
  {
    rank: 2,
    name: "Sarah Kim",
    avatar: "/placeholder.svg?height=40&width=40",
    points: 2156,
    wins: 8,
    badges: ["🥈"],
    isVerified: true,
  },
  {
    rank: 3,
    name: "Mike Rodriguez",
    avatar: "/placeholder.svg?height=40&width=40",
    points: 1923,
    wins: 6,
    badges: ["🥉"],
    isVerified: false,
  },
];

const recentEntries = [
  {
    id: 1,
    title: "Moody Cinematic Grade",
    author: "Jake Miller",
    avatar: "/placeholder.svg?height=40&width=40",
    thumbnail: "/placeholder.svg?height=150&width=200",
    submittedDate: "2 hours ago",
    votes: 23,
    views: 156,
  },
  {
    id: 2,
    title: "Warm Sunset Vibes",
    author: "Lisa Chen",
    avatar: "/placeholder.svg?height=40&width=40",
    thumbnail: "/placeholder.svg?height=150&width=200",
    submittedDate: "4 hours ago",
    votes: 18,
    views: 134,
  },
  {
    id: 3,
    title: "Cold Blue Atmosphere",
    author: "Tom Wilson",
    avatar: "/placeholder.svg?height=40&width=40",
    thumbnail: "/placeholder.svg?height=150&width=200",
    submittedDate: "6 hours ago",
    votes: 15,
    views: 98,
  },
];

export default function WeeklyChallenges() {
  const [activeTab, setActiveTab] = useState("entries");
  const [isSubmitOpen, setIsSubmitOpen] = useState(false);
  const [submission, setSubmission] = useState({
    title: "",
    description: "",
    videoUrl: "",
  });

  const handleSubmit = () => {
    console.log("Submitting entry:", submission);
    setIsSubmitOpen(false);
    setSubmission({ title: "", description: "", videoUrl: "" });
  };

  return (
    <div className="space-y-8">
      {/* Current Challenge */}
      <div className="bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 rounded-3xl p-8 text-white">
        <div className="flex items-center gap-4 mb-6">
          <span className="text-3xl">🏆</span>
          <h2 className="text-3xl font-bold">Weekly Challenge</h2>
          <span className="px-4 py-2 bg-white/20 rounded-full text-sm font-medium">Active</span>
        </div>

        <h3 className="text-2xl font-bold mb-4">{currentChallenge.title}</h3>
        <p className="text-xl opacity-90 mb-6">{currentChallenge.description}</p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white/10 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold">{currentChallenge.deadline}</div>
            <div className="text-sm opacity-80">Time Left</div>
          </div>
          <div className="bg-white/10 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold">{currentChallenge.totalEntries}</div>
            <div className="text-sm opacity-80">Entries</div>
          </div>
          <div className="bg-white/10 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold">{currentChallenge.prize}</div>
            <div className="text-sm opacity-80">Prize</div>
          </div>
          <div className="bg-white/10 rounded-xl p-4 text-center">
            <button className="w-full py-2 bg-white text-red-600 rounded-lg font-semibold hover:bg-gray-100 transition-all">
              Join Challenge
            </button>
          </div>
        </div>
      </div>

      {/* Leaderboard */}
      <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <span className="text-2xl">👑</span>
          <h3 className="text-2xl font-bold text-white">Leaderboard</h3>
        </div>

        <div className="space-y-4">
          {leaderboard.map((user) => (
            <div key={user.rank} className="flex items-center gap-4 p-4 bg-white/5 rounded-xl">
              <div className="w-12 h-12 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center text-2xl">
                {user.badges[0]}
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-white">{user.name}</h4>
                <div className="flex items-center gap-4 text-sm text-gray-400">
                  <span>{user.points.toLocaleString()} points</span>
                  <span>•</span>
                  <span>{user.wins} wins</span>
                </div>
              </div>
              <div className="text-2xl font-bold text-white">#{user.rank}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs for Entries and Past Challenges */}
      <div className="w-full">
        <div className="grid w-full grid-cols-2 bg-gray-100 rounded-lg p-1">
          <button
            className={`px-4 py-2 rounded-lg ${activeTab === "entries" ? "bg-white shadow" : ""}`}
            onClick={() => setActiveTab("entries")}
          >
            Entries
          </button>
          <button
            className={`px-4 py-2 rounded-lg ${activeTab === "past" ? "bg-white shadow" : ""}`}
            onClick={() => setActiveTab("past")}
          >
            Past Challenges
          </button>
        </div>

        {activeTab === "entries" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Challenge Entries</h2>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Users className="w-4 h-4" />
                {currentChallenge.totalEntries} entries submitted
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {recentEntries.map((entry) => (
                <div key={entry.id} className="group bg-white shadow rounded-lg hover:shadow-lg transition-shadow">
                  <div className="relative">
                    <img
                      src={entry.thumbnail || "/placeholder.svg"}
                      alt={entry.title}
                      className="w-full h-48 object-cover rounded-t-lg"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Play className="w-12 h-12 text-white" />
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold mb-2">{entry.title}</h3>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-6 h-6 rounded-full overflow-hidden">
                        <img
                          src={entry.avatar || "/placeholder.svg"}
                          alt={entry.author}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <span className="text-sm text-gray-500">{entry.author}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <span>{entry.submittedDate}</span>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1">
                          <Eye className="w-3 h-3" />
                          {entry.views}
                        </div>
                        <div className="flex items-center gap-1">
                          <ThumbsUp className="w-3 h-3" />
                          {entry.votes}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "past" && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Past Challenges</h2>

            <div className="grid gap-6">
              {pastChallenges.map((challenge) => (
                <div key={challenge.id} className="bg-white shadow rounded-lg">
                  <div className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="px-2 py-1 bg-gray-100 rounded text-xs">{challenge.category}</span>
                          <span className="px-2 py-1 border border-gray-300 rounded text-xs">Completed</span>
                        </div>
                        <h3 className="font-semibold text-lg mb-2">{challenge.title}</h3>
                        <p className="text-gray-500 mb-4">{challenge.description}</p>

                        <div className="flex items-center gap-6 text-sm text-gray-500">
                          <div className="flex items-center gap-2">
                            <Trophy className="w-4 h-4" />
                            <span>Winner: {challenge.winner}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Users className="w-4 h-4" />
                            <span>{challenge.entries} entries</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            <span>{challenge.completedDate}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full overflow-hidden">
                          <img
                            src={challenge.winnerAvatar || "/placeholder.svg"}
                            alt={challenge.winner}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <Crown className="w-6 h-6 text-yellow-500" />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}