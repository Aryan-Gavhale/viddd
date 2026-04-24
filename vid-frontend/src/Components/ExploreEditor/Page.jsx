import { motion } from "framer-motion";
import { Film, Search } from "lucide-react";
import { CategoryCard } from "./category";
import { Carousel } from "./carousal";
import { Link } from "react-router-dom";

const categories = [

  {
    title: "Animation",
    color: "from-emerald-500 to-teal-600",
    items: ["Character Animation", "Animated GIFs", "Animation for Kids", "Animation for Streamers", "NFT Animation"],
    newItems: ["NFT Animation"],
  },
  {
    title: "Product Videos",
    color: "from-slate-600 to-slate-700",
    items: ["3D Product Animation", "E-Commerce Product Videos", "Corporate Videos", "App & Website Previews"],
    newItems: ["App & Website Previews"],
  },
  {
    title: "Motion Graphics",
    color: "from-slate-700 to-slate-800",
    items: ["Logo Animation", "Lottie & Web Animation", "Text Animation"],
    newItems: ["Text Animation"],
  },
  {
    title: "Video Editing",
    color: "from-orange-400 to-orange-500",
    items: ["Professional Editing", "Social Media Editing", "YouTube Editing", "Podcast Editing"],
    newItems: ["Podcast Editing"],
  },
  {
    title: "Social & Marketing",
    color: "from-blue-600 to-blue-700",
    items: ["Social Media Videos", "Marketing Campaigns", "Brand Stories", "Viral Content"],
    newItems: ["Viral Content"],
  },
  {
    title: "Explainer Videos",
    color: "from-purple-500 to-purple-700",
    items: ["Whiteboard Animation", "2D Explainers", "3D Explainers", "Educational Content"],
    newItems: ["Educational Content"],
    icon: "🧠",
  },
  {
    title: "3D Animation",
    color: "from-cyan-500 to-cyan-700",
    items: ["Character Modeling", "3D Product Visualization", "Architectural Visualization", "Game Assets"],
    newItems: ["Game Assets"],
    icon: "🌐",
  },
  {
    title: "Intros & Outros",
    color: "from-pink-500 to-pink-700",
    items: ["YouTube Intros", "Stream Intros", "Logo Reveals", "End Screens"],
    newItems: ["End Screens"],
    icon: "🎭",
  },
  {
    title: "Visual Effects",
    color: "from-amber-500 to-amber-700",
    items: ["VFX Compositing", "Green Screen", "Particle Effects", "Color Grading"],
    newItems: ["Particle Effects"],
    icon: "💫",
  },
  {
    title: "Animated Illustrations",
    color: "from-lime-500 to-lime-700",
    items: ["Character Illustrations", "Animated Icons", "Infographics", "Storyboards"],
    newItems: ["Animated Icons"],
    icon: "🎨",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="pt-20 pb-16 px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-4xl mx-auto text-center"
        >
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">Video & Animation Services</h1>
          <p className="text-xl text-gray-600 mb-12">Find the perfect video service for your needs</p>

          <div className="relative max-w-2xl mx-auto">
            <input
              type="text"
              placeholder="What kind of video are you looking for?"
              className="w-full px-6 py-4 rounded-full border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent shadow-sm text-lg"
            />
            <button className="absolute right-3 top-1/2 -translate-y-1/2 bg-purple-600 text-white p-3 rounded-full hover:bg-purple-700 transition-colors">
              <Search className="w-5 h-5" />
            </button>
          </div>
        </motion.div>
      </section>

      {/* Most Popular Categories */}
      <section className="px-4 py-16">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 mb-12">Most Popular Categories</h2>
          <Carousel>
            {categories.map((category) => (
              <Link key={category.title} to={`/marketplace?category=${encodeURIComponent(category.title.toLowerCase())}`}>
                <CategoryCard
                  {...category}
                  imageUrl="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Screenshot%20(113)-6Nq0xwKWWGFxdKfZRuZ5PqIKypAfPo.png"
                />
              </Link>
            ))}
          </Carousel>
        </div>
      </section>

      {/* Featured Categories */}
      <section className="px-4 py-16 bg-gray-100">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 mb-12">Featured Categories</h2>
          <Carousel itemsToShow={2}>
            {categories.map((category) => (
              <Link key={category.title} to={`/marketplace?category=${encodeURIComponent(category.title.toLowerCase())}`}>
                <CategoryCard
                  {...category}
                  imageUrl="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Screenshot%20(113)-6Nq0xwKWWGFxdKfZRuZ5PqIKypAfPo.png"
                />
              </Link>
            ))}
          </Carousel>
        </div>
      </section>

      {/* Explore All Categories */}
      <section className="px-4 py-16">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 mb-12">Explore All Categories</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {categories.map((category) => (
              <Link key={category.title} to={`/marketplace?category=${encodeURIComponent(category.title.toLowerCase())}`}>
                <CategoryCard
                  {...category}
                  imageUrl="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Screenshot%20(113)-6Nq0xwKWWGFxdKfZRuZ5PqIKypAfPo.png"
                />
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
