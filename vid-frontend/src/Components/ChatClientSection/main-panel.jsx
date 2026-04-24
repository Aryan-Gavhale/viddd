import { FileReviewSection } from "./files-section"
import { TaskBoard } from "./tasks-section"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs"

export function MainPanel({ job }) {
  return (
    <div className="h-full bg-gray-50 dark:bg-gray-900 flex flex-col overflow-hidden">
      <div className="flex-1 p-6 overflow-hidden">
        <Tabs defaultValue="files" className="h-full flex flex-col">
          <div className="flex items-center justify-between mb-6 flex-shrink-0">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Project Review</h1>
              <p className="text-gray-600 dark:text-gray-400">Review deliverables and track project progress</p>
            </div>
            <TabsList className="grid w-fit grid-cols-2">
              <TabsTrigger value="files">File Review</TabsTrigger>
              <TabsTrigger value="tasks">Task Board</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="files" className="flex-1 overflow-hidden">
            <FileReviewSection job={job} />
          </TabsContent>

          <TabsContent value="tasks" className="flex-1 overflow-hidden">
            <TaskBoard job={job} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
