import { useState } from "react"
import ProjectWorkspace from "./ProjectWorkspace"
import CommunicationSystem from "./Communication"
import PaymentManagement from "./PaymentManagement"
import NotificationsAlerts from "./Notification"
import CalendarIntegration from "./CalenderIntegration"
import ActivityLog from "./ActivityLog"

const ProjectPage = () => {
  const [activeTab, setActiveTab] = useState("workspace")

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>Project Management Interface</h1>
        <nav>
          <button onClick={() => setActiveTab("workspace")}>Workspace</button>
          <button onClick={() => setActiveTab("communication")}>Communication</button>
          <button onClick={() => setActiveTab("payment")}>Payment</button>
          <button onClick={() => setActiveTab("calendar")}>Calendar</button>
          <button onClick={() => setActiveTab("activity")}>Activity Log</button>
        </nav>
      </header>
      <NotificationsAlerts />
      <main className="app-main">
        {activeTab === "workspace" && <ProjectWorkspace />}
        {activeTab === "communication" && <CommunicationSystem />}
        {activeTab === "payment" && <PaymentManagement />}
        {activeTab === "calendar" && <CalendarIntegration />}
        {activeTab === "activity" && <ActivityLog />}
      </main>
    </div>
  )
}

export default ProjectPage

