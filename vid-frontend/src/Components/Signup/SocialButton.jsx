import React from 'react';
import { FaGoogle, FaApple } from 'react-icons/fa'; // Import Google and Apple icons

export const SocialButton = ({ icon: Icon, label, onClick, provider }) => {
  return (
    <button
      onClick={onClick}
      className={`
        w-full flex items-center justify-center gap-3 px-4 py-3 rounded-lg text-sm font-medium
        transition-all duration-300 ease-in-out
        ${provider === 'google'
          ? 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 hover:shadow-md'
          : 'bg-black text-white hover:bg-gray-900'}
      `}
    >
      <Icon className="w-5 h-5" />
      <span>{label}</span>
    </button>
  );
};

