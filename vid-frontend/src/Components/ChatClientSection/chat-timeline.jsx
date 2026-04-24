import { useState, useEffect } from "react"
import { MessageSquare, Clock, ChevronDown, ChevronUp, ArrowLeft } from 'lucide-react'
import { ChatSection } from "./chat-section"
import { TimelineSection } from "./timeline-section"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs"

export function ChatTimeline({ job, onBack }) {
  const [isExpanded, setIsExpanded] = useState(true)
  const [isMobile, setIsMobile] = useState(false)
  const [activeTab, setActiveTab] = useState("chat")

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    
    return () => window.removeEventListener('resize', checkMobile)
  }, [])


  const MobileHeader = () => (
    <div className="md:hidden bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 flex-shrink-0">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
          )}
          <div>
            <h2 className="font-semibold text-gray-900 dark:text-white">Communication</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {job?.title || "Project Communication"}
            </p>
          </div>
        </div>
      </div>
    </div>
  )

  const MobileTabNavigation = () => (
    <div className="md:hidden bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-2 flex-shrink-0">
      <div className="flex space-x-1">
        <button
          onClick={() => setActiveTab("chat")}
          className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-lg transition-colors ${
            activeTab === "chat"
              ? "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400"
              : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700"
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span className="font-medium">Chat</span>
        </button>
        <button
          onClick={() => setActiveTab("timeline")}
          className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-lg transition-colors ${
            activeTab === "timeline"
              ? "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400"
              : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700"
          }`}
        >
          <Clock className="w-4 h-4" />
          <span className="font-medium">Timeline</span>
        </button>
      </div>
    </div>
  )

  const DesktopHeader = () => (
    <div className="hidden md:block p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-gray-900 dark:text-white">Communication</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Chat & Timeline</p>
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-gray-500 transform rotate-90" />
          ) : (
            <ChevronUp className="w-4 h-4 text-gray-500 transform -rotate-90" />
          )}
        </button>
      </div>
    </div>
  )

  if (isMobile) {
    return (
      <div className="h-full bg-white dark:bg-gray-800 flex flex-col overflow-hidden">
        <MobileHeader />
        <MobileTabNavigation />
        
        <div className="flex-1 overflow-hidden">
          {activeTab === "chat" && (
            <div className="h-full overflow-hidden">
              <ChatSection job={job} />
            </div>
          )}
          
          {activeTab === "timeline" && (
            <div className="h-full overflow-hidden">
              <TimelineSection job={job} />
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="h-full bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden">
      <DesktopHeader />
      
      {isExpanded && (
        <Tabs 
          defaultValue="chat" 
          className="flex-1 flex flex-col overflow-hidden"
          onValueChange={setActiveTab}
        >
          <div className="border-b border-gray-200 dark:border-gray-700 px-4 flex-shrink-0">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="chat" className="flex items-center space-x-2">
                <MessageSquare className="w-4 h-4" />
                <span>Chat</span>
              </TabsTrigger>
              <TabsTrigger value="timeline" className="flex items-center space-x-2">
                <Clock className="w-4 h-4" />
                <span>Timeline</span>
              </TabsTrigger>
            </TabsList>
          </div>
          
          <TabsContent value="chat" className="flex-1 overflow-hidden">
            <ChatSection job={job} />
          </TabsContent>
          
          <TabsContent value="timeline" className="flex-1 overflow-hidden">
            <TimelineSection job={job} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}