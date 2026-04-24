"use client"

import { useState } from "react"
import LeftSidebar from "./left-sidebar"
import MainPanel from "./main-panel"
import RightPanel from "./right-panel"
import TaskModal from "./task-modal"
import InvoiceModal from "./invoice-modal"
import { ThemeProvider } from "./theme-provider"
import { ChevronLeft, ChevronRight, Menu } from "lucide-react"

export default function ChatDashboard() {
  const [showTaskModal, setShowTaskModal] = useState(false)
  const [showInvoiceModal, setShowInvoiceModal] = useState(false)
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false)
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [currentProject, setCurrentProject] = useState(null);

  const handleNewTask = (task) => {
    setCurrentProject({
      ...currentProject,
      tasks: [...currentProject.tasks, task],
    })
    setShowTaskModal(false)
  }

  const handleGenerateInvoice = () => {
    setShowInvoiceModal(true)
  }

  const handleProjectSelect = (project) => {
    setCurrentProject({
      ...project,
      tasks: project.tasks || [],
      drafts: project.drafts || [],
      milestones: project.milestones || [],
      messages: project.messages || [],
      notes: project.notes || "",
      timeline: project.timeline || [],
    });
    setMobileMenuOpen(false)
  }

  return (
    <ThemeProvider>
      <div className="flex h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 text-slate-800 dark:text-slate-100 overflow-hidden">
        {/* Mobile Menu Overlay */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setMobileMenuOpen(false)} />
        )}

        {/* Left Sidebar */}
        <div
          className={`
          fixed lg:relative inset-y-0 left-0 z-50 lg:z-auto
          transition-all duration-300 ease-in-out
          ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
          ${leftPanelCollapsed ? "lg:w-0" : "w-80 lg:w-80"}
        `}
        >
          <LeftSidebar
            currentProject={currentProject}
            onNewTask={() => setShowTaskModal(true)}
            onGenerateInvoice={handleGenerateInvoice}
            isCollapsed={leftPanelCollapsed}
            onProjectSelect={handleProjectSelect}
            onClose={() => setMobileMenuOpen(false)}
          />
        </div>

        {/* Desktop Toggle Buttons */}
        <button
          onClick={() => setLeftPanelCollapsed(!leftPanelCollapsed)}
          className="hidden lg:block absolute left-0 top-1/2 transform -translate-y-1/2 z-30 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 p-2 rounded-r-lg shadow-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-all duration-200 border border-l-0 border-slate-200 dark:border-slate-700"
        >
          {leftPanelCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>

        {/* Main Content */}
        <div
          className={`
          flex-1 flex flex-col lg:flex-row
          transition-all duration-300 ease-in-out
        `}
        >
          {/* Mobile Header */}
          <div className="lg:hidden bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 p-4 flex items-center justify-between">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
            >
              <Menu size={20} />
            </button>
            <h1 className="font-semibold text-lg">{currentProject?.title || currentProject?.name}</h1>
            <div className="w-10" />
          </div>

          {/* Main Panel */}
          <div className="flex-1">
            <MainPanel currentProject={currentProject} setCurrentProject={setCurrentProject} />
          </div>

          {/* Right Panel */}
          <div
            className={`
            hidden lg:block
            transition-all duration-300 ease-in-out
            ${rightPanelCollapsed ? "w-0" : "w-80"}
          `}
          >
            <RightPanel
              currentProject={currentProject}
              setCurrentProject={setCurrentProject}
              isCollapsed={rightPanelCollapsed}
            />
          </div>
        </div>

        {/* Desktop Right Toggle */}
        <button
          onClick={() => setRightPanelCollapsed(!rightPanelCollapsed)}
          className="hidden lg:block absolute right-0 top-1/2 transform -translate-y-1/2 z-30 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 p-2 rounded-l-lg shadow-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-all duration-200 border border-r-0 border-slate-200 dark:border-slate-700"
        >
          {rightPanelCollapsed ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
        </button>

        {/* Modals */}
        {showTaskModal && <TaskModal onClose={() => setShowTaskModal(false)} onSave={handleNewTask} />}
        {showInvoiceModal && <InvoiceModal project={currentProject} onClose={() => setShowInvoiceModal(false)} />}
      </div>
    </ThemeProvider>
  )
}
