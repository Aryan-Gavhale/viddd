import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { JoinCard } from "./JoinCard";
import { Link } from 'react-router-dom';

export default function JoinPage() {
  const [selectedType, setSelectedType] = useState(null);

  const handleSelection = (type) => {
    setSelectedType(type);
    console.log("Selected role:", type);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50">
      <div className="w-full max-w-4xl p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          <h1 className="text-4xl md:text-5xl font-bold text-center text-gray-900">
            Join as a client or freelancer
          </h1>

          <div className="grid md:grid-cols-2 gap-6 mt-8">
            <JoinCard
              title="I'm a client, hiring for a project"
              icon="client"
              isSelected={selectedType === 'client'}
              onClick={() => handleSelection('client')}
            />
            <JoinCard
              title="I'm a freelancer, looking for work"
              icon="freelancer"
              isSelected={selectedType === 'freelancer'}
              onClick={() => handleSelection('freelancer')}
            />
          </div>

          <div className="flex flex-col items-center gap-4 mt-8">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`
                w-full max-w-md py-3 px-6 rounded-lg font-medium text-white
                transition-all duration-300 
                ${selectedType 
                  ? 'bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600' 
                  : 'bg-gray-300 cursor-not-allowed' }
              `}
              disabled={!selectedType}
            >
              <Link
                to={`/signup?role=${selectedType}`} // Use query param instead of state
                className="block w-full h-full"
                onClick={() => console.log("Navigating to signup with role:", selectedType)}
              >
                Create Account
              </Link>
            </motion.button>
            
            <p className="text-gray-600">
              Already have an account?{' '}
              <Link to="/login" className="text-blue-500 hover:text-blue-600 font-medium">
                Log In
              </Link>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}