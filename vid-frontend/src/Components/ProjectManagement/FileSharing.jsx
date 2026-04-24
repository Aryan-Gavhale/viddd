import { useState } from "react"

const FileSharing = () => {
  const [files, setFiles] = useState([
    { id: 1, name: "project_brief.pdf", type: "pdf", version: 1, uploadedBy: "Client", uploadDate: "2023-07-01" },
    { id: 2, name: "storyboard_v1.jpg", type: "image", version: 1, uploadedBy: "Editor", uploadDate: "2023-07-05" },
    { id: 3, name: "audio_track.mp3", type: "audio", version: 1, uploadedBy: "Editor", uploadDate: "2023-07-10" },
  ])

  const [newFile, setNewFile] = useState(null)

  const handleFileUpload = (event) => {
    const file = event.target.files?.[0]
    if (file) {
      const newFileObj = {
        id: files.length + 1,
        name: file.name,
        type: file.type.split("/")[0],
        version: 1,
        uploadedBy: "Current User",
        uploadDate: new Date().toISOString().split("T")[0],
      }
      setNewFile(newFileObj)
    }
  }

  const uploadFile = () => {
    if (newFile) {
      setFiles([...files, newFile])
      setNewFile(null)
    }
  }

  return (
    <div className="file-sharing">
      <h2>Files</h2>
      <div className="file-list">
        {files.map((file) => (
          <div key={file.id} className="file-item">
            <h3>{file.name}</h3>
            <p>Type: {file.type}</p>
            <p>Version: {file.version}</p>
            <p>Uploaded by: {file.uploadedBy}</p>
            <p>Upload date: {file.uploadDate}</p>
          </div>
        ))}
      </div>
      <div className="file-upload">
        <input type="file" onChange={handleFileUpload} />
        <button onClick={uploadFile} disabled={!newFile}>
          Upload
        </button>
      </div>
    </div>
  )
}

export default FileSharing

