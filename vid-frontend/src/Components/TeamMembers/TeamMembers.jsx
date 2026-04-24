import React, { useState } from "react"
import { motion } from "framer-motion"
import { ChevronRight, Mail, Twitter, Linkedin } from "lucide-react"
import { TeamModal } from "./TeamModal"
import img1 from "../../assets/img3.jpg"

const teamMembers = [
  {
    id: 1,
    name: "Sarah Johnson",
    role: "Founder & CEO",
    image: img1,
    email: "sarah@example.com",
    twitter: "https://twitter.com/sarah",
    linkedin: "https://linkedin.com/in/sarah",
    bio: "Sarah Johnson is a visionary leader with over 15 years of experience in technology and innovation. She founded our company with the mission to transform digital experiences and has successfully led multiple breakthrough initiatives.",
    achievements: [
      {
        id: 1,
        title: "Named Top 40 Under 40 in Tech Leadership",
        year: "2023",
        description: "Recognized by Industry Today magazine for outstanding leadership and innovation in technology.",
      },
      {
        id: 2,
        title: "Led Series B Funding Round of $50M",
        year: "2022",
        description: "Successfully secured major funding to accelerate company growth and product development.",
      },
      {
        id: 3,
        title: "Awarded Innovation Leader of the Year",
        year: "2021",
        description: "Received prestigious industry award for pioneering new approaches in tech leadership.",
      },
    ],
  },
  {
    id: 2,
    name: "Michael Chen",
    role: "CTO",
    image: img1,
    email: "michael@example.com",
    twitter: "https://twitter.com/michael",
    linkedin: "https://linkedin.com/in/michael",
    bio: "Michael Chen brings deep technical expertise and innovative thinking to our team. With a background in AI and machine learning, he leads our technical strategy and development initiatives.",
    achievements: [
      {
        id: 1,
        title: "Published 5 Patents in AI Technology",
        year: "2023",
        description: "Contributed significantly to the advancement of AI through innovative patent filings.",
      },
      {
        id: 2,
        title: "Keynote Speaker at TechCon 2022",
        year: "2022",
        description: "Shared expertise and insights on AI and machine learning at a leading industry conference.",
      },
      {
        id: 3,
        title: "Developed Revolutionary ML Algorithm",
        year: "2021",
        description:
          "Created a groundbreaking machine learning algorithm that significantly improved efficiency and accuracy.",
      },
    ],
  },
  {
    id: 3,
    name: "Emily Rodriguez",
    role: "Head of Design",
    image: img1,
    email: "emily@example.com",
    twitter: "https://twitter.com/emily",
    linkedin: "https://linkedin.com/in/emily",
    bio: "Emily Rodriguez is an award-winning designer who leads our creative vision. Her work has been recognized internationally, and she brings a unique perspective to user experience design.",
    achievements: [
      {
        id: 1,
        title: "Design Excellence Award Winner",
        year: "2023",
        description:
          "Awarded for exceptional design work that pushes creative boundaries and enhances user experience.",
      },
      {
        id: 2,
        title: "Featured in Design Weekly Magazine",
        year: "2022",
        description: "Showcased innovative design solutions in a leading industry publication.",
      },
      {
        id: 3,
        title: "Led Rebranding of Fortune 500 Company",
        year: "2021",
        description:
          "Successfully led a major rebranding project for a Fortune 500 company, resulting in increased brand recognition and market share.",
      },
    ],
  },
  {
    id: 4,
    name: "David Kim",
    role: "VP of Operations",
    image: img1,
    email: "david@example.com",
    twitter: "https://twitter.com/david",
    linkedin: "https://linkedin.com/in/david",
    bio: "David Kim excels in optimizing business operations and scaling companies. His strategic thinking has been crucial in our company's rapid growth and market expansion.",
    achievements: [
      {
        id: 1,
        title: "Achieved 300% Team Growth",
        year: "2023",
        description:
          "Successfully scaled the operations team by 300%, significantly increasing efficiency and productivity.",
      },
      {
        id: 2,
        title: "Implemented Agile Framework",
        year: "2022",
        description: "Successfully implemented an agile framework, improving team collaboration and project delivery.",
      },
      {
        id: 3,
        title: "Reduced Operating Costs by 40%",
        year: "2021",
        description: "Successfully reduced operating costs by 40%, improving profitability and financial stability.",
      },
    ],
  },
  {
    id: 5,
    name: "Lisa Thompson",
    role: "Head of Marketing",
    image: img1,
    email: "lisa@example.com",
    twitter: "https://twitter.com/lisa",
    linkedin: "https://linkedin.com/in/lisa",
    bio: "Lisa Thompson is a marketing strategist with a proven track record in building strong brands. She has led successful campaigns for global companies and brings creative solutions to market challenges.",
    achievements: [
      {
        id: 1,
        title: "Marketing Campaign of the Year",
        year: "2023",
        description:
          "Awarded for creating a highly successful marketing campaign that exceeded expectations and delivered exceptional results.",
      },
      {
        id: 2,
        title: "Doubled Market Share in 12 Months",
        year: "2022",
        description:
          "Successfully doubled market share within a year, demonstrating strong marketing leadership and strategic planning.",
      },
      {
        id: 3,
        title: "Best Digital Marketing Strategy",
        year: "2021",
        description:
          "Recognized for developing and implementing a highly effective digital marketing strategy that drove significant growth.",
      },
    ],
  },
  {
    id: 6,
    name: "Alex Patel",
    role: "Head of Product",
    image: img1,
    email: "alex@example.com",
    twitter: "https://twitter.com/alex",
    linkedin: "https://linkedin.com/in/alex",
    bio: "Alex Patel is an innovative product leader with a passion for creating user-centric solutions. With a background in both engineering and design, Alex brings a unique perspective to product development.",
    achievements: [
      {
        id: 1,
        title: "Product of the Year Award",
        year: "2023",
        description: "Led the development of our flagship product, which won Product of the Year in its category.",
      },
      {
        id: 2,
        title: "Increased User Engagement by 200%",
        year: "2022",
        description: "Implemented key features that resulted in a 200% increase in daily active users.",
      },
      {
        id: 3,
        title: "Launched Revolutionary Mobile App",
        year: "2021",
        description:
          "Spearheaded the development and launch of our mobile app, which gained 1 million users in its first month.",
      },
    ],
  },
]

export default function TeamMembers() {
  const [selectedMember, setSelectedMember] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const handleMemberClick = (member) => {
    setSelectedMember(member)
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setSelectedMember(null)
  }

  return (
    <div className="bg-white py-24">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold mb-4">Meet Our Team</h1>
          <div className="w-24 h-1 bg-blue-600 mx-auto mb-8"></div>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Meet the talented individuals who make our company thrive through innovation and dedication.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {teamMembers.map((member, index) => (
            <motion.div
              key={member.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="group relative"
            >
              <div
                className="relative w-full pt-[100%] overflow-hidden rounded-lg cursor-pointer"
                onClick={() => handleMemberClick(member)}
              >
                <img
                  src={member.image || "/placeholder.svg"}
                  alt={member.name}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="absolute inset-0 flex flex-col justify-end p-6 text-center translate-y-6 group-hover:translate-y-0 transition-transform duration-300">
                  <h3 className="text-xl font-semibold text-white mb-1">{member.name}</h3>
                  <p className="text-gray-300 mb-4">{member.role}</p>
                  <div className="flex justify-center gap-4 mb-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-100">
                    <a href={`mailto:${member.email}`} className="text-white hover:text-blue-400 transition-colors">
                      <Mail className="w-5 h-5" />
                    </a>
                    {member.twitter && (
                      <a
                        href={member.twitter}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-white hover:text-blue-400 transition-colors"
                      >
                        <Twitter className="w-5 h-5" />
                      </a>
                    )}
                    {member.linkedin && (
                      <a
                        href={member.linkedin}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-white hover:text-blue-400 transition-colors"
                      >
                        <Linkedin className="w-5 h-5" />
                      </a>
                    )}
                  </div>
                  <button
                    onClick={() => handleMemberClick(member)}
                    className="text-white flex items-center justify-center text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-150"
                  >
                    View Profile <ChevronRight className="w-4 h-4 ml-1" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <TeamModal member={selectedMember} isOpen={isModalOpen} onClose={handleCloseModal} />
      </div>
    </div>
  )
}

