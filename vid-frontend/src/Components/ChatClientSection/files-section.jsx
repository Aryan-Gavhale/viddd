import { useState } from "react"
import { Play, Download, Check, MessageSquare, Clock, Eye } from "lucide-react"
import { formatBytes, formatDate } from "./client-workspace"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs"
import { Button } from "./ui/buttons"

export function FileReviewSection({ job }) {
  const [selectedFile, setSelectedFile] = useState(null)
  const [reviewMode, setReviewMode] = useState(false)

  // Mock file data with categories
  const files = job?.files || [
    {
      id: 1,
      name: "Final_Edit_v3.mp4",
      type: "video/mp4",
      size: 125000000,
      category: "final",
      version: "V3",
      uploadedAt: "2024-01-15T10:30:00Z",
      status: "pending_review",
      thumbnail: "/placeholder.svg?height=200&width=300",
      duration: "2:45",
    },
    {
      id: 2,
      name: "Raw_Footage_Scene1.mp4",
      type: "video/mp4",
      size: 500000000,
      category: "raw",
      version: "V1",
      uploadedAt: "2024-01-14T15:20:00Z",
      status: "approved",
      thumbnail: "/placeholder.svg?height=200&width=300",
      duration: "8:12",
    },
    {
      id: 3,
      name: "Reference_Style.mp4",
      type: "video/mp4",
      size: 75000000,
      category: "reference",
      version: "REF",
      uploadedAt: "2024-01-13T09:15:00Z",
      status: "reference",
      thumbnail: "/placeholder.svg?height=200&width=300",
      duration: "1:30",
    },
  ]

  const getFilesByCategory = (category) => {
    return files.filter((file) => file.category === category)
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case "approved":
        return <Check className="w-4 h-4 text-emerald-500" />
      case "pending_review":
        return <Clock className="w-4 h-4 text-amber-500" />
      case "needs_changes":
        return <MessageSquare className="w-4 h-4 text-red-500" />
      default:
        return <Eye className="w-4 h-4 text-gray-500" />
    }
  }

  const handleApprove = (fileId) => {
    console.log("Approving file:", fileId)
    // Your approval logic here
  }

  const handleRequestChanges = (fileId) => {
    console.log("Requesting changes for file:", fileId)
    // Your request changes logic here
  }

  return (
    <div className="h-full bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
      <Tabs defaultValue="final" className="h-full flex flex-col">
        <div className="border-b border-gray-200 dark:border-gray-700 p-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="final" className="flex items-center space-x-2">
              <span>Final</span>
              <span className="bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-full text-xs">
                {getFilesByCategory("final").length}
              </span>
            </TabsTrigger>
            <TabsTrigger value="raw" className="flex items-center space-x-2">
              <span>Raw</span>
              <span className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-0.5 rounded-full text-xs">
                {getFilesByCategory("raw").length}
              </span>
            </TabsTrigger>
            <TabsTrigger value="reference" className="flex items-center space-x-2">
              <span>References</span>
              <span className="bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded-full text-xs">
                {getFilesByCategory("reference").length}
              </span>
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="flex-1 overflow-hidden">
          {["final", "raw", "reference"].map((category) => (
            <TabsContent key={category} value={category} className="h-full p-6 overflow-y-auto">
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {getFilesByCategory(category).map((file) => (
                  <div
                    key={file.id}
                    className="bg-gray-50 dark:bg-gray-700 rounded-lg overflow-hidden hover:shadow-md transition-shadow"
                  >
                    {/* Video Thumbnail */}
                    <div className="relative aspect-video bg-gray-200 dark:bg-gray-600">
                      <img
                        src={file.thumbnail || "/placeholder.svg"}
                        alt={file.name}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                        <Button size="sm" className="bg-white text-black hover:bg-gray-100">
                          <Play className="w-4 h-4 mr-2" />
                          Preview
                        </Button>
                      </div>
                      <div className="absolute top-2 left-2 bg-black bg-opacity-70 text-white px-2 py-1 rounded text-xs">
                        {file.duration}
                      </div>
                      <div className="absolute top-2 right-2 bg-black bg-opacity-70 text-white px-2 py-1 rounded text-xs">
                        {file.version}
                      </div>
                    </div>

                    {/* File Info */}
                    <div className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-medium text-gray-900 dark:text-white truncate">{file.name}</h3>
                        {getStatusIcon(file.status)}
                      </div>

                      <div className="text-sm text-gray-500 dark:text-gray-400 space-y-1 mb-4">
                        <p>{formatBytes(file.size)}</p>
                        <p>{formatDate(file.uploadedAt)}</p>
                      </div>

                      {/* Action Buttons */}
                      {category === "final" && file.status === "pending_review" && (
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            onClick={() => handleApprove(file.id)}
                            className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                          >
                            <Check className="w-4 h-4 mr-1" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRequestChanges(file.id)}
                            className="flex-1"
                          >
                            <MessageSquare className="w-4 h-4 mr-1" />
                            Changes
                          </Button>
                        </div>
                      )}

                      {file.status === "approved" && (
                        <div className="flex items-center space-x-2 text-emerald-600 dark:text-emerald-400">
                          <Check className="w-4 h-4" />
                          <span className="text-sm font-medium">Approved</span>
                        </div>
                      )}

                      {/* Download Button */}
                      <Button size="sm" variant="ghost" className="w-full mt-2">
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {getFilesByCategory(category).length === 0 && (
                <div className="text-center py-12">
                  <div className="text-gray-400 text-6xl mb-4">📁</div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No {category} files yet</h3>
                  <p className="text-gray-500 dark:text-gray-400">Files will appear here once uploaded by the editor</p>
                </div>
              )}
            </TabsContent>
          ))}
        </div>
      </Tabs>
    </div>
  )
}
