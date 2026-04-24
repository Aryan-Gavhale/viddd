
import { useState } from 'react'
import { motion } from 'framer-motion'


const faqs = [
  {
    question: 'What is this platform, and how does it work?',
    answer: 'Our platform connects video editors with clients who need their services. Editors can create profiles, showcase their work, and apply for projects. Clients can post projects, review editor profiles, and hire the best fit for their needs.',
    category: 'editors'
  },
  {
    question: 'How do I sign up as a video editor?',
    answer: 'To sign up as a video editor, click on the "Sign Up" button in the top right corner of the homepage. Choose the "Video Editor" option, fill out the registration form, and follow the steps to create your profile and showcase your portfolio.',
    category: 'editors'
  },
  {
    question: 'How do I post a new project as a client?',
    answer: 'To post a new project, log in to your client account and click on the "Post a Project" button in your dashboard. Fill out the project details, including the description, requirements, budget, and deadline. Once submitted, editors can view and apply to your project.',
    category: 'clients'
  },
  {
    question: 'What payment methods do you accept?',
    answer: 'We accept various payment methods, including credit/debit cards, PayPal, and bank transfers. The available options may vary depending on your location. You can view and manage your payment methods in your account settings.',
    category: 'payments'
  },
  {
    question: 'How do I upload large video files?',
    answer: 'For large video files, we recommend using our built-in file uploader, which supports files up to 10GB. If you need to upload larger files, you can use our integration with cloud storage services like Dropbox or Google Drive. Simply provide a link to the file in your project or message.',
    category: 'technical'
  },
  {
    question: 'How do payments work for video editors?',
    answer: 'Video editors receive payments through our secure payment system. Once a project is completed and approved by the client, payment is released from escrow to your account. You can then withdraw funds to your linked bank account or PayPal.',
    category: 'payments'
  },
  {
    question: 'What happens if there are technical issues during a project?',
    answer: 'Our technical support team is available 24/7 to help resolve any issues. You can contact them through the support chat or by raising a ticket. We also have automatic backup systems in place to prevent data loss.',
    category: 'technical'
  },
  {
    question: 'How do I manage my client relationships?',
    answer: 'Our platform provides tools for effective communication with clients, including a built-in messaging system, file sharing capabilities, and project milestone tracking. You can also set your availability and manage multiple projects simultaneously.',
    category: 'clients'
  }
]

const categories = [
  { id: 'editors', name: 'For Video Editors' },
  { id: 'clients', name: 'For Clients' },
  { id: 'payments', name: 'Payments & Billing' },
  { id: 'technical', name: 'Technical Support' },
]

export default function Categories({ onCategoryChange }) {
  const [activeCategory, setActiveCategory] = useState(categories[0].id)

  const handleCategoryChange = (categoryId) => {
    setActiveCategory(categoryId)
    const filteredFaqs = faqs.filter(faq => faq.category === categoryId)
    onCategoryChange(filteredFaqs)
  }

  return (
    <div className="mb-12 border-b border-gray-200">
      <nav className="flex space-x-8" aria-label="FAQ Categories">
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => handleCategoryChange(category.id)}
            className={`relative pb-4 text-sm font-medium transition-colors hover:text-gray-900 ${
              activeCategory === category.id
                ? 'text-blue-600'
                : 'text-gray-500'
            }`}
          >
            {category.name}
            {activeCategory === category.id && (
              <motion.div
                layoutId="activeCategory"
                className="absolute bottom-0 left-0 h-0.5 w-full bg-blue-600"
                initial={false}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              />
            )}
          </button>
        ))}
      </nav>
    </div>
  )
}

