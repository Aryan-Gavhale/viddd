import { useState } from 'react'
import Header from "./Header"
import Categories from "./Categories"
import FAQAccordion from "./Faqaccordian"
import Footer from "./Footer"


const initialFaqs = [
  {
    question: 'What is this platform, and how does it work?',
    answer: 'Our platform connects video editors with clients who need their services. Editors can create profiles, showcase their work, and apply for projects. Clients can post projects, review editor profiles, and hire the best fit for their needs.',
    category: 'editors'
  }
]

export default function FAQsPage() {
  const [currentFaqs, setCurrentFaqs] = useState(initialFaqs)

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <Categories onCategoryChange={setCurrentFaqs} />
        <FAQAccordion faqs={currentFaqs} />
      </main>
      <Footer />
    </div>
  )
}

