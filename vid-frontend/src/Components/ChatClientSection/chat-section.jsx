import { useState, useRef, useEffect } from "react"
import EmojiPicker from "emoji-picker-react"
import { formatDistanceToNow } from "./client-workspace"
import socketClient, { EVENTS } from "../../utils/socket.js"
import axiosInstance from "../../utils/axios.js"
import { isSafeUrl } from "../../utils/safeUrl.js"
import { Send, Paperclip, MessageSquare, X, Reply, Smile, Trash2 } from 'lucide-react'

export function ChatSection({ job }) {
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState("")
  const [showEmojiPicker, setShowEmojiPicker] = useState(null)
  const [fileUploads, setFileUploads] = useState([])
  const [typingUsers, setTypingUsers] = useState([])
  const [replyingTo, setReplyingTo] = useState(null)
  const [error, setError] = useState(null)
  const messagesEndRef = useRef(null)
  const fileInputRef = useRef(null)
  const typingTimeoutRef = useRef(null)

  useEffect(() => {
    socketClient.initialize()
    socketClient.connect()
    socketClient.joinJobRoom(job.id)

    const fetchMessages = async () => {
      try {
        const response = await axiosInstance.get(`/messages/job/${job.id}`)
        if (response.data?.data) {
          setMessages(response.data.data)
          setTimeout(scrollToBottom, 100)
        } else {
          setError("No messages found for this job.")
        }
      } catch (error) {
        console.error("Error fetching messages:", error)
        setError("Failed to load messages. Please try again.")
      }
    }

    fetchMessages()

    socketClient.on(EVENTS.NEW_MESSAGE, (message) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === message.id)) {
          return prev
        }
        return [...prev, message]
      })
      setTimeout(scrollToBottom, 100)
    })

    socketClient.on(EVENTS.MESSAGE_DELETED, ({ messageId: deletedMessageId }) => {
      setMessages(prev =>
        prev.map(msg =>
          msg.id === deletedMessageId
            ? { ...msg, isDeleted: true, content: "This message was deleted" }
            : msg
        )
      )
    })

    socketClient.on(EVENTS.USER_TYPING, ({ userId, name, isTyping }) => {
      setTypingUsers((prev) => {
        if (isTyping && !prev.some((u) => u.userId === userId)) {
          return [...prev, { userId, name }]
        } else if (!isTyping) {
          return prev.filter((u) => u.userId !== userId)
        }
        return prev
      })
    })

    socketClient.on(EVENTS.MESSAGE_EDITED, ({ messageId, content }) => {
      setMessages(prev =>
        prev.map(msg => msg.id === messageId ? { ...msg, content, isEdited: true } : msg)
      )
    })

    socketClient.on(EVENTS.REACTION_UPDATED, ({ messageId, emoji, user, action }) => {
      setMessages(prev =>
        prev.map(msg => {
          if (msg.id !== messageId) return msg
          const reactions = [...(msg.reactions || [])]
          if (action === "added") {
            reactions.push({ emoji, user })
          } else {
            const idx = reactions.findIndex(r => r.emoji === emoji && r.user?.id === user.id)
            if (idx > -1) reactions.splice(idx, 1)
          }
          return { ...msg, reactions }
        })
      )
    })

    socketClient.on(EVENTS.ERROR, ({ message }) => {
      setError(`Socket error: ${message}`)
    })

    return () => {
      socketClient.off(EVENTS.NEW_MESSAGE)
      socketClient.off(EVENTS.MESSAGE_DELETED)
      socketClient.off(EVENTS.MESSAGE_EDITED)
      socketClient.off(EVENTS.REACTION_UPDATED)
      socketClient.off(EVENTS.USER_TYPING)
      socketClient.off(EVENTS.ERROR)
      socketClient.disconnect()
    }
  }, [job.id])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    if (newMessage) {
      socketClient.emitTyping(job.id, true)
      clearTimeout(typingTimeoutRef.current)
      typingTimeoutRef.current = setTimeout(() => {
        socketClient.emitTyping(job.id, false)
      }, 2000)
    }
    return () => clearTimeout(typingTimeoutRef.current)
  }, [newMessage, job.id])

  const handleSendMessage = async () => {
    if (!newMessage.trim() && fileUploads.length === 0) return

    setError(null)
    let attachments = []
    if (fileUploads.length > 0) {
      try {
        const formData = new FormData()
        fileUploads.forEach((file) => formData.append("files", file))

        const response = await axiosInstance.post("/messages/upload", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        })

        attachments = response.data.data.map((file) => ({
          id: file.id,
          name: file.name,
          size: file.size,
          type: file.type,
          url: file.url,
          category: "raw",
          uploadedAt: new Date().toISOString(),
          uploadedBy: "client",
        }))
      } catch (error) {
        console.error("File upload error:", error)
        setError("Failed to upload files. Please try again.")
        return
      }
    }

    socketClient.sendMessage(job.id, newMessage, attachments, replyingTo?.id)
    setNewMessage("")
    setFileUploads([])
    setReplyingTo(null)
    socketClient.emitTyping(job.id, false)
  }

  const handleFileUpload = (e) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files)
      setFileUploads((prev) => [...prev, ...filesArray])
    }
  }

  const removeFile = (index) => {
    setFileUploads((prev) => prev.filter((_, i) => i !== index))
  }

  const handleReplyToMessage = (message) => {
    setReplyingTo(message)
  }

  const handleAddReaction = async (messageId, emoji) => {
    try {
      const response = await axiosInstance.post(`/messages/${messageId}/reactions`, { emoji })
      setMessages((prev) =>
        prev.map((msg) => (msg.id === messageId ? { ...msg, reactions: response.data.data.reactions } : msg)),
      )
      setShowEmojiPicker(null)
    } catch (error) {
      console.error("Error adding reaction:", error)
      setError("Failed to add reaction.")
    }
  }

  const handleDeleteMessage = async (messageId) => {
    try {
      await axiosInstance.delete(`/messages/${messageId}`)
      setMessages(prev =>
        prev.map(msg =>
          msg.id === messageId ? { ...msg, isDeleted: true, content: "This message was deleted" } : msg
        )
      )
      socketClient.emitMessageDeleted(job.id, messageId)
    } catch (error) {
      console.error("Error deleting message:", error)
      setError("Failed to delete message.")
    }
  }

  const getReplyMessage = (replyId) => {
    return messages.find((msg) => msg.id === replyId)
  }

  const commonEmojis = ["👍", "❤️", "😂", "😮", "😢", "👏"]

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-400 text-red-700 dark:text-red-300 text-sm flex-shrink-0">
          {error}
        </div>
      )}

      <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full overflow-hidden">
            <img
              src={job.freelancer?.profilePicture || "/placeholder.svg?height=40&width=40"}
              alt={job.freelancer?.firstname || "Freelancer"}
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <h3 className="font-medium text-gray-900 dark:text-white">
              {job.freelancer ? `${job.freelancer.firstname} ${job.freelancer.lastname}` : "Freelancer"}
            </h3>
            {typingUsers.length > 0 && (
              <p className="text-xs text-indigo-600 dark:text-indigo-400">
                {typingUsers.map((u) => u.name).join(", ")} {typingUsers.length > 1 ? "are" : "is"} typing...
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-hidden flex flex-col min-h-0">
        <div className="flex-1 overflow-y-auto scrollbar-hide p-4 space-y-4">
          {messages.length === 0 && !error && (
            <div className="text-center py-8">
              <MessageSquare className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400">Start the conversation</p>
            </div>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${message.sender?.id === job.postedById ? "justify-end" : "justify-start"}`}
            >
              {message.sender?.id !== job.postedById && (
                <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
                  <img
                    src={message.sender?.avatar || "/placeholder.svg?height=32&width=32"}
                    alt={message.sender?.name || "Unknown"}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              <div className={`max-w-[75%] relative group`}>
                {message.replyTo && (
                  <div className="text-xs mb-1 pb-1 border-l-2 border-gray-300 dark:border-gray-600 pl-2 text-gray-500 dark:text-gray-400 flex items-center">
                    <Reply className="w-3 h-3 mr-1" />
                    <span className="truncate">
                      {getReplyMessage(message.replyTo)?.isDeleted
                        ? "Replied to a deleted message"
                        : `Replied to: ${getReplyMessage(message.replyTo)?.content?.substring(0, 30) || ""}${
                            getReplyMessage(message.replyTo)?.content?.length > 30 ? "..." : ""
                          }`}
                    </span>
                  </div>
                )}

                <div
                  className={`rounded-2xl px-4 py-2 ${
                    message.sender?.id === job.postedById
                      ? "bg-indigo-600 text-white"
                      : "bg-gray-100 text-gray-900 dark:bg-gray-700 dark:text-white"
                  }`}
                >
                  <p className={`text-sm ${message.isDeleted ? "italic text-gray-400 dark:text-gray-500" : ""}`}>
                    {message.isDeleted ? "This message was deleted" : message.content}
                  </p>

                  {message.attachments?.length > 0 && !message.isDeleted && (
                    <div className="mt-2 space-y-2">
                      {message.attachments.map((attachment, index) => {
                        const isImage = attachment.type.startsWith("image/")
                        const isVideo = attachment.type.startsWith("video/")
                        const isAudio = attachment.type.startsWith("audio/")
                        const safeUrl = isSafeUrl(attachment.url) ? attachment.url : null

                        return (
                          <div key={index} className="rounded-lg overflow-hidden border dark:border-gray-600">
                            {isImage && safeUrl && (
                              <img
                                src={safeUrl}
                                alt={attachment.name}
                                className="max-h-40 w-auto object-contain"
                              />
                            )}
                            {isVideo && safeUrl && <video src={safeUrl} controls className="max-h-40 w-full" />}
                            {isAudio && safeUrl && <audio src={safeUrl} controls className="w-full" />}
                            <div className="flex items-center justify-between p-2 text-xs bg-black bg-opacity-10">
                              <div className="flex items-center gap-1 truncate">
                                <Paperclip className="w-3 h-3" />
                                <span className="truncate">{attachment.name}</span>
                              </div>
                              {safeUrl && (
                                <a
                                  href={safeUrl}
                                  download={attachment.name}
                                  className="ml-2 hover:underline"
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  Download
                                </a>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs opacity-70">{formatDistanceToNow(new Date(message.timestamp))}</span>
                  </div>
                </div>

                {message.reactions?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {message.reactions.map((reaction, index) => (
                      <button
                        key={index}
                        onClick={() => handleAddReaction(message.id, reaction.emoji)}
                        className="text-xs rounded-full px-2 py-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600"
                      >
                        {reaction.emoji} {reaction.count}
                      </button>
                    ))}
                  </div>
                )}

                {!message.isDeleted && (
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex space-x-1">
                    <button
                      onClick={() => handleReplyToMessage(message)}
                      className="p-1 rounded-full bg-white dark:bg-gray-800 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      <Reply className="w-3 h-3 text-gray-600 dark:text-gray-300" />
                    </button>
                    <div className="relative">
                      <button
                        onClick={() => setShowEmojiPicker(showEmojiPicker === message.id ? null : message.id)}
                        className="p-1 rounded-full bg-white dark:bg-gray-800 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      >
                        <Smile className="w-3 h-3 text-gray-600 dark:text-gray-300" />
                      </button>
                      {showEmojiPicker === message.id && (
                        <div className="absolute top-full right-0 mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-2 z-10 flex space-x-1">
                          {commonEmojis.map((emoji) => (
                            <button
                              key={emoji}
                              onClick={() => handleAddReaction(message.id, emoji)}
                              className="hover:bg-gray-100 dark:hover:bg-gray-700 p-1 rounded"
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    {message.sender?.id === job.postedById && (
                      <button
                        onClick={() => handleDeleteMessage(message.id)}
                        className="p-1 rounded-full bg-white dark:bg-gray-800 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      >
                        <Trash2 className="w-3 h-3 text-gray-600 dark:text-gray-300" />
                      </button>
                    )}
                  </div>
                )}
              </div>

              {message.sender?.id === job.postedById && (
                <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
                  <img
                    src={message.sender?.avatar || "/placeholder.svg?height=32&width=32"}
                    alt={message.sender?.name || "Unknown"}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {replyingTo && (
          <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center flex-shrink-0">
            <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
              <Reply className="w-4 h-4 mr-2 text-indigo-500" />
              <span className="truncate">
                Replying to: {replyingTo.isDeleted ? "Deleted message" : replyingTo.content.substring(0, 50)}
                {!replyingTo.isDeleted && replyingTo.content.length > 50 ? "..." : ""}
              </span>
            </div>
            <button
              onClick={() => setReplyingTo(null)}
              className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {fileUploads.length > 0 && (
          <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex-shrink-0">
            <div className="flex flex-wrap gap-2">
              {fileUploads.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 bg-white dark:bg-gray-700 rounded-lg px-3 py-2 text-sm border border-gray-200 dark:border-gray-600"
                >
                  <Paperclip className="w-4 h-4 text-gray-500" />
                  <span className="truncate max-w-[120px]">{file.name}</span>
                  <button
                    onClick={() => removeFile(index)}
                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex-shrink-0 relative">
          {showEmojiPicker && (
            <div className="absolute bottom-20 right-4 z-50">
              <EmojiPicker
                onEmojiClick={(emojiData) => {
                  setNewMessage((prev) => prev + emojiData.emoji)
                  setShowEmojiPicker(null)
                }}
              />
            </div>
          )}

          <div className="flex items-end space-x-2">
            <div className="flex-1 relative">
              <textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault()
                    handleSendMessage()
                  }
                }}
                placeholder="Type your message..."
                className="w-full px-4 py-3 pr-20 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white resize-none"
                rows={1}
                style={{ minHeight: "44px", maxHeight: "120px" }}
              />
              <div className="absolute right-2 bottom-2 flex items-center space-x-1">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full transition-colors"
                >
                  <Paperclip className="w-4 h-4" />
                  <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" multiple />
                </button>
                <button
                  onClick={() => setShowEmojiPicker(showEmojiPicker ? null : true)}
                  className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full transition-colors"
                >
                  <Smile className="w-4 h-4" />
                </button>
              </div>
            </div>
            <button
              onClick={handleSendMessage}
              disabled={!newMessage.trim() && fileUploads.length === 0}
              className="p-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 dark:disabled:bg-gray-600 text-white rounded-full transition-colors disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}