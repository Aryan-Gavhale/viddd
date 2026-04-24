import React from 'react';
import { motion } from 'framer-motion';
import { Briefcase, Search } from 'lucide-react';

export const JoinCard = ({ title, icon, isSelected, onClick }) => {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`
        relative cursor-pointer rounded-xl p-6
        backdrop-blur-sm transition-all duration-300
        ${isSelected 
          ? 'bg-gradient-to-br from-purple-500/10 to-blue-500/10 border-2 border-blue-500/50 shadow-lg shadow-blue-500/20' 
          : 'bg-white/30 border-2 border-gray-200/20 hover:border-blue-300/30'}
      `}
    >
      <div className="absolute top-4 right-4">
        <div className={`w-6 h-6 rounded-full border-2 transition-colors duration-300 
          ${isSelected ? 'border-blue-500 bg-blue-500' : 'border-gray-300'}`}
        />
      </div>
      <div className="flex flex-col items-start gap-4">
        <div className="p-3 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500">
          {icon === 'client' ? (
            <Briefcase className="w-6 h-6 text-white" />
          ) : (
            <Search className="w-6 h-6 text-white" />
          )}
        </div>
        <h3 className="text-xl font-medium text-gray-800">{title}</h3>
      </div>
    </motion.div>
  );
};

