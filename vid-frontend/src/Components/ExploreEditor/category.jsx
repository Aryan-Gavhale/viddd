import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";

export function CategoryCard({ title, items = [], newItems = [], color, darkMode = false, imageUrl }) {
    return (
        <motion.div
          className={`group relative overflow-hidden rounded-2xl ${darkMode ? "bg-slate-800" : "bg-white"} shadow-lg hover:shadow-xl transition-shadow duration-300 h-[500px]`}
        >
          <div className={`absolute inset-0 bg-gradient-to-br ${color} opacity-90`} />
    
          <div className="relative p-6">
            <div className="aspect-video relative overflow-hidden rounded-lg mb-6">
              <img
                src={imageUrl || "/placeholder.svg"}
                alt={`${title} preview`}
                fill
                className="object-cover transform group-hover:scale-105 transition-transform duration-300"
              />
            </div>
    
            <h3 className="text-2xl font-bold text-white mb-6">{title}</h3>
    
            <ul className="space-y-4">
              {items.map((item) => (
                <motion.li
                  key={item}
                  whileHover={{ x: 10 }}
                  className="flex items-center text-white/90 hover:text-white group/item"
                >
                  <ChevronRight className="w-5 h-5 mr-2 opacity-0 group-hover/item:opacity-100 transition-opacity" />
                  <span>{item}</span>
                  {newItems.includes(item) && <span className="ml-2 px-2 py-1 text-xs bg-white/20 rounded-full">NEW</span>}
                </motion.li>
              ))}
            </ul>
          </div>
        </motion.div>
      )
    }
    
    