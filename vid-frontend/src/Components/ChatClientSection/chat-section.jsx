import ChatPanel from "../Chat/ChatPanel.jsx"

/**
 * Workspace chat panel.
 *
 * Thin wrapper around the shared {@link ChatPanel} so messages are
 * sourced from the same `chatStore` as the floating bottom-right widget.
 * Anything sent here shows up in the widget instantly (and vice-versa).
 */
export function ChatSection({ job }) {
  if (!job?.id) return null

  const peer = job.freelancer
    ? {
        id: job.freelancer.id || job.freelancer_id,
        firstname: job.freelancer.firstname,
        lastname: job.freelancer.lastname,
        avatar: job.freelancer.profilePicture || job.freelancer.avatar,
      }
    : null

  return (
    <div className="h-full flex flex-col overflow-hidden bg-white dark:bg-gray-900">
      <ChatPanel jobId={job.id} peer={peer} />
    </div>
  )
}
