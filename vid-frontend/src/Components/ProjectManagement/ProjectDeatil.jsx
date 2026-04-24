
import { useState } from "react"

const ProjectDetails = () => {
  const [project, setProject] = useState({
    title: "Video Editing Project",
    brief: "Create a promotional video for our new product launch",
    requirements: "High-quality 4K footage, dynamic transitions, background music",
    deliverables: "1 main video (2 minutes), 3 short teasers (15 seconds each)",
  })

  return (
    <div className="project-details">
      <h2>{project.title}</h2>
      <p>
        <strong>Brief:</strong> {project.brief}
      </p>
      <p>
        <strong>Requirements:</strong> {project.requirements}
      </p>
      <p>
        <strong>Deliverables:</strong> {project.deliverables}
      </p>
    </div>
  )
}

export default ProjectDetails

