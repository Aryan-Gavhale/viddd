import { motion } from 'framer-motion'
import { Check, Clock, RefreshCcw, Info, ChevronRight } from 'lucide-react'
import { useState } from 'react'

const tiers = [
  {
    name: 'Basic',
    price: 45,
    description: 'Perfect for simple video edits',
    features: [
      'Up to 30 minutes of footage',
      'Basic color correction',
      'Simple transitions',
      'Background music',
      '2 revisions',
    ],
    delivery: '3-day',
  },
  {
    name: 'Standard',
    price: 85,
    description: 'Most popular for professional edits',
    features: [
      'Up to 60 minutes of footage',
      'Advanced color grading',
      'Custom transitions',
      'Sound design & mixing',
      'Motion graphics',
      'Unlimited revisions',
    ],
    delivery: '4-day',
    popular: true,
  },
  {
    name: 'Premium',
    price: 150,
    description: 'Complete video production suite',
    features: [
      'Unlimited footage',
      'Cinema-grade color',
      'Complex VFX',
      'Original sound design',
      'Custom animations',
      'Priority support',
      'Unlimited revisions',
    ],
    delivery: '7-day',
  },
]

export default function PricingTiers() {
  const [selectedTier, setSelectedTier] = useState(1) // Standard tier selected by default

  return (
    <div className="w-full max-w-6xl mx-auto p-6 space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {tiers.map((tier, index) => (
          <motion.div
            key={tier.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: index * 0.1 }}
            className={`relative rounded-2xl bg-white p-6 shadow-lg transition-all duration-300 ${
              selectedTier === index
                ? 'ring-2 ring-blue-500 shadow-xl scale-105'
                : 'hover:shadow-xl hover:scale-102'
            }`}
          >
            {tier.popular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="bg-gradient-to-r from-blue-600 to-blue-400 text-white text-sm px-3 py-1 rounded-full">
                  Most Popular
                </span>
              </div>
            )}
            
            <div className="space-y-4">
              <div>
                <h3 className="text-xl font-semibold text-gray-900">{tier.name}</h3>
                <p className="text-sm text-gray-500 mt-1">{tier.description}</p>
              </div>

              <div className="flex items-baseline">
                <span className="text-3xl font-bold text-gray-900">${tier.price}</span>
                <span className="text-gray-500 ml-1">/hour</span>
              </div>

              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Clock className="w-4 h-4" />
                <span>{tier.delivery} delivery</span>
                <Info className="w-4 h-4 text-gray-400 cursor-help" />
              </div>

              <div className="flex items-center gap-2 text-sm text-gray-600">
                <RefreshCcw className="w-4 h-4" />
                <span>{tier.features.includes('Unlimited revisions') ? 'Unlimited revisions' : '2 revisions'}</span>
              </div>

              <div className="pt-4 border-t">
                <p className="text-sm font-medium text-gray-900 mb-3">What's included:</p>
                <ul className="space-y-3">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm text-gray-600">
                      <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <button
                onClick={() => setSelectedTier(index)}
                className={`w-full mt-6 flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors ${
                  selectedTier === index
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                }`}
              >
                {selectedTier === index ? 'Selected' : 'Select'} {tier.name}
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.4 }}
        className="mt-8 space-y-6"
      >
        

        <div className="flex justify-center">
          <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
            Compare all features
          </button>
        </div>
      </motion.div>
    </div>
  )
}

