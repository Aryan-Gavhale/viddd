import { useState, useEffect } from "react"


const ActivityLog= () => {
  const [activities, setActivities] = useState([
    { id: 1, action: "Project created", user: "Admin", timestamp: "2023-07-01 10:00" },
    { id: 2, action: "File uploaded: project_brief.pdf", user: "Client", timestamp: "2023-07-02 14:30" },
    { id: 3, action: "Milestone added: Initial Concept", user: "Editor", timestamp: "2023-07-03 09:15" },
  ])

  useEffect(() => {
    // Simulating real-time activity updates
    const timer = setInterval(() => {
      const newActivity = {
        id: activities.length + 1,
        action: `New activity at ${new Date().toLocaleTimeString()}`,
        user: "System",
        timestamp: new Date().toLocaleString(),
      }
      setActivities((prev) => [newActivity, ...prev])
    }, 15000)

    return () => clearInterval(timer)
  }, [])

  return (
    <div className="activity-log">
      <h2>Activity Log</h2>
      <div className="activity-list">
        {activities.map((activity) => (
          <div key={activity.id} className="activity-item">
            <p>
              <strong>{activity.action}</strong>
            </p>
            <p>By: {activity.user}</p>
            <p>At: {activity.timestamp}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

export default ActivityLog

