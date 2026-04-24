import MissionVision from "./MissionVision"
import FoundersStory from "./FounderStory"
import Timeline from "./Timeline"
import CoreValues from "./CoreValues"
import Testimonials from "./Testimonials"
import FutureGoals from "./FutureMission"
import CallToAction from "./CTA"

export default function AboutUs() {
    return (
      <div className="bg-gradient-to-br from-blue-50 to-purple-50 min-h-screen">
        <header className=" text-gray-900 ">
          <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
            <h1 className="text-4xl font-extrabold tracking-tight">About Us</h1>
            <p className="mt-2 text-xl text-indigo-500">Revolutionizing Video Editing Collaboration</p>
          </div>
        </header>
        <main className="max-w-7xl mx-auto py-12 sm:px-6 lg:px-8">
          <div className="space-y-16 px-4 sm:px-0">
            <MissionVision />
            <FoundersStory />
            <Timeline />
            <CoreValues />
            <Testimonials />
            <FutureGoals />
            <CallToAction />
          </div>
        </main>
      </div>
    )
  }
  
  