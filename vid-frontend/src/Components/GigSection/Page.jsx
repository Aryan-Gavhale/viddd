import GigSection from "./GigSection"
import TestimonialSection from "./Testimonials"

export default function GigMainPage() {
  return (
    <main className="min-h-screen bg-white">
      <GigSection />
      <TestimonialSection />
    </main>
  )
}
