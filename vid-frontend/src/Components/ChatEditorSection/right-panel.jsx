"use client"

import { useState, useRef } from "react"
import { File, Upload, MoreVertical, Star, Filter, Search, Grid, ListIcon } from "lucide-react"

export default function RightPanel({ currentProject, setCurrentProject, isCollapsed }) {
  const [fileCategory, setFileCategory] = useState("all")
  const [viewMode, setViewMode] = useState("grid")
  const [searchQuery, setSearchQuery] = useState("")
  const fileInputRef = useRef(null)

  if (!currentProject) {
    return (
      <div className="flex flex-1 items-center justify-center h-full text-slate-400 text-lg">
        Nothing to show
      </div>
    );
  }

  const fileCategories = [
    { id: "all", label: "All", count: 0 },
    { id: "raw", label: "Raw", count: 0 },
    { id: "final", label: "Final", count: 0 },
    { id: "refs", label: "References", count: 0 },
  ]

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files)
    const newFiles = files.map((file) => ({
      id: `file-${Date.now()}-${file.name}`,
      name: file.name,
      size: file.size,
      type: file.type,
      url: URL.createObjectURL(file),
      category: fileCategory === "all" ? "raw" : fileCategory,
      uploadedAt: new Date().toISOString(),
      status: "Ready for Review",
      starred: false,
      versions: [
        {
          version: 1,
          fileUrl: URL.createObjectURL(file),
          uploadedAt: new Date().toISOString(),
        },
      ],
    }))
    setCurrentProject({
      ...currentProject,
      files: [...(currentProject.files || []), ...newFiles],
    })
  }

  const filteredFiles = (currentProject?.files || [])
    .filter((file) => fileCategory === "all" || file.category === fileCategory)
    .filter((file) => file.name.toLowerCase().includes(searchQuery.toLowerCase()))

  // Update category counts
  fileCategories.forEach((cat) => {
    if (cat.id === "all") {
      cat.count = currentProject?.files?.length || 0
    } else {
      cat.count = currentProject?.files?.filter((file) => file.category === cat.id).length || 0
    }
  })

  const getFileIcon = (type) => {
    if (type.startsWith("image/")) {
      return "🖼️"
    } else if (type.startsWith("video/")) {
      return "🎥"
    } else if (type.startsWith("audio/")) {
      return "🎵"
    } else if (type.includes("pdf")) {
      return "📄"
    } else {
      return "📁"
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case "Approved":
        return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
      case "Ready for Review":
        return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
      case "In Review":
        return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
      default:
        return "bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400"
    }
  }

  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  if (isCollapsed) return null

  return (
    <div className="h-full bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-700 flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Files</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">Manage project assets and deliverables</p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
              className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              {viewMode === "grid" ? <ListIcon className="w-4 h-4" /> : <Grid className="w-4 h-4" />}
            </button>
            <button className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
              <Filter className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Category Tabs */}
        <div className="flex space-x-1 bg-slate-100 dark:bg-slate-700 rounded-lg p-1">
          {fileCategories.map((cat) => (
            <button
              key={cat.id}
              className={`flex-1 px-3 py-2 text-xs font-medium rounded-md transition-colors ${
                fileCategory === cat.id
                  ? "bg-white dark:bg-slate-600 text-slate-900 dark:text-slate-100 shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
              }`}
              onClick={() => setFileCategory(cat.id)}
            >
              {cat.label} ({cat.count})
            </button>
          ))}
        </div>
      </div>

      {/* Upload Area */}
      <div className="p-6 border-b border-slate-200 dark:border-slate-700">
        <div
          className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl p-6 text-center hover:border-blue-400 dark:hover:border-blue-500 transition-colors cursor-pointer group"
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:bg-blue-200 dark:group-hover:bg-blue-900/50 transition-colors">
            <Upload className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <p className="font-medium text-slate-900 dark:text-slate-100 mb-1">Upload Files</p>
          <p className="text-sm text-slate-600 dark:text-slate-400">Drag and drop or click to browse</p>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            className="hidden"
            multiple
            accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt"
          />
        </div>
      </div>

      {/* Files List */}
      <div className="flex-1 overflow-y-auto p-6">
        {filteredFiles.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-500 dark:text-slate-400">
            <File className="w-12 h-12 mb-4 opacity-50" />
            <p className="font-medium mb-1">{searchQuery ? "No files found" : "No files uploaded"}</p>
            <p className="text-sm text-center">
              {searchQuery ? "Try adjusting your search" : "Upload files to get started"}
            </p>
          </div>
        ) : (
          <div className={viewMode === "grid" ? "grid grid-cols-1 gap-4" : "space-y-3"}>
            {filteredFiles.map((file) => (
              <div
                key={file.id}
                className={`bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 hover:shadow-md transition-all duration-200 group ${
                  viewMode === "grid" ? "p-4" : "p-3"
                }`}
              >
                {viewMode === "grid" ? (
                  <>
                    {/* Grid View */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        {file.type.startsWith("image/") ? (
                          <div className="w-12 h-12 rounded-lg overflow-hidden bg-slate-200 dark:bg-slate-600">
                            <img
                              src={file.url || "/placeholder.svg"}
                              alt={file.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-slate-200 dark:bg-slate-600 flex items-center justify-center text-xl">
                            {getFileIcon(file.type)}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-slate-900 dark:text-slate-100 truncate text-sm">
                            {file.name}
                          </h4>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{formatFileSize(file.size)}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="p-1 text-slate-400 hover:text-amber-500 transition-colors">
                          <Star className="w-4 h-4" />
                        </button>
                        <button className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(file.status)}`}>
                        {file.status || "Ready for Review"}
                      </span>
                      <div className="flex items-center space-x-2">
                        {file.versions && file.versions.length > 1 && (
                          <span className="text-xs text-slate-500 dark:text-slate-400">v{file.versions.length}</span>
                        )}
                        <a
                          href={file.url}
                          download={file.name}
                          className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium"
                        >
                          Download
                        </a>
                      </div>
                    </div>

                    {file.versions && file.versions.length > 1 && (
                      <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-600">
                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">Version History:</p>
                        <div className="flex flex-wrap gap-1">
                          {file.versions.map((version, idx) => (
                            <a
                              key={idx}
                              href={version.fileUrl}
                              download={`${file.name}.v${version.version}`}
                              className="text-xs text-blue-600 dark:text-blue-400 hover:underline px-2 py-1 bg-blue-50 dark:bg-blue-900/20 rounded"
                            >
                              v{version.version}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    {/* List View */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3 flex-1 min-w-0">
                        <div className="text-lg">{getFileIcon(file.type)}</div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-slate-900 dark:text-slate-100 truncate text-sm">
                            {file.name}
                          </h4>
                          <div className="flex items-center space-x-2 mt-1">
                            <span className="text-xs text-slate-500 dark:text-slate-400">
                              {formatFileSize(file.size)}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(file.status)}`}
                            >
                              {file.status || "Ready for Review"}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <a
                          href={file.url}
                          download={file.name}
                          className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium"
                        >
                          Download
                        </a>
                        <button className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
