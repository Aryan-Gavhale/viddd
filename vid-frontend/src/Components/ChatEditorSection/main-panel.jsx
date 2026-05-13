"use client"

import { useState, useRef, useEffect } from "react";
import {
  Send,
  Paperclip,
  Video,
  MessageSquare,
  X,
  Film,
  Reply,
  Trash2,
  Smile,
  CheckSquare,
  FileText,
  Calendar,
  Settings,
  Bell,
  Plus,
  MoreHorizontal,
  Clock,
  CheckCircle2,
  AlertCircle,
  Edit3,
  Save,
  Kanban,
  List,
  BarChart3,
  Lock,
  Unlock,
} from "lucide-react";
import socketClient, { EVENTS } from "../../utils/socket.js";
import axiosInstance from "../../utils/axios.js";
import useAuth from "../../Hooks/useAuth.js";
import { isSafeUrl } from "../../utils/safeUrl.js";

function toNumberId(value) {
  if (value == null || value === "") return null;
  const id = Number(value);
  return Number.isFinite(id) ? id : null;
}

function isOwnMessage(message, userId) {
  const senderId =
    toNumberId(message.senderId) ??
    toNumberId(message.sender?.id) ??
    toNumberId(message.sender_id) ??
    toNumberId(message.userId);
  return userId != null && senderId != null && senderId === userId;
}

export default function MainPanel({ currentProject, setCurrentProject }) {
  const user = useAuth();
  const [newMessage, setNewMessage] = useState("");
  const [activeTab, setActiveTab] = useState(null);
  const [selectedDraft, setSelectedDraft] = useState(currentProject?.drafts?.[0] || null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [showDrafts, setShowDrafts] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(null);
  const [messages, setMessages] = useState(currentProject?.messages || []);
  const [typingUsers, setTypingUsers] = useState([]);
  const [fileUploads, setFileUploads] = useState([]);
  const [error, setError] = useState(null);
  const [taskView, setTaskView] = useState("kanban");
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [notesContent, setNotesContent] = useState(currentProject?.notes || "");
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Validate currentProject.id and initialize socket
  useEffect(() => {
    if (!currentProject?.id || isNaN(currentProject.id)) {
      setError("Invalid project ID. Please select a valid project.");
      return;
    }

    socketClient.initialize();
    socketClient.connect();
    // Join room based on project type (order or job)
    const roomId = currentProject.orderNumber ? `order-${currentProject.id}` : currentProject.id;
    socketClient.joinJobRoom(roomId);

    // Fetch initial messages
    const fetchMessages = async () => {
      try {
        // Use different endpoint based on project type
        const endpoint = currentProject.orderNumber 
          ? `/messages/order/${currentProject.id}`
          : `/messages/job/${currentProject.id}`;
        const response = await axiosInstance.get(endpoint);
        if (response.data?.data) {
          setMessages(response.data.data);
          scrollToBottom();
        } else {
          setError("No messages found for this project.");
        }
      } catch (error) {
        console.error("Error fetching messages:", error);
        setError("Failed to load messages. Please try again.");
      }
    };

    fetchMessages();

    socketClient.on(EVENTS.NEW_MESSAGE, (message) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === message.id)) {
          return prev;
        }
        return [...prev, message];
      });
      scrollToBottom();
    });

    socketClient.on(EVENTS.USER_TYPING, ({ userId, name, isTyping }) => {
      setTypingUsers((prev) => {
        if (isTyping && !prev.some((u) => u.userId === userId)) {
          return [...prev, { userId, name }];
        } else if (!isTyping) {
          return prev.filter((u) => u.userId !== userId);
        }
        return prev;
      });
    });

    socketClient.on(EVENTS.MESSAGE_DELETED, ({ messageId: deletedMessageId }) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === deletedMessageId
            ? { ...msg, isDeleted: true, content: "This message was deleted" }
            : msg
        )
      );
    });

    socketClient.on(EVENTS.MESSAGE_EDITED, ({ messageId, content }) => {
      setMessages(prev =>
        prev.map(msg => msg.id === messageId ? { ...msg, content, isEdited: true } : msg)
      );
    });

    socketClient.on(EVENTS.REACTION_UPDATED, ({ messageId, emoji, user, action }) => {
      setMessages(prev =>
        prev.map(msg => {
          if (msg.id !== messageId) return msg;
          const reactions = [...(msg.reactions || [])];
          if (action === "added") {
            reactions.push({ emoji, user });
          } else {
            const idx = reactions.findIndex(r => r.emoji === emoji && r.user?.id === user.id);
            if (idx > -1) reactions.splice(idx, 1);
          }
          return { ...msg, reactions };
        })
      );
    });

    socketClient.on(EVENTS.ERROR, ({ message }) => {
      setError(`Socket error: ${message}`);
    });

    if (currentProject?.drafts) {
      setSelectedDraft(currentProject.drafts[0] || null);
    }
    if (currentProject?.notes) {
      setNotesContent(currentProject.notes);
    }

    return () => {
      socketClient.off(EVENTS.NEW_MESSAGE);
      socketClient.off(EVENTS.MESSAGE_DELETED);
      socketClient.off(EVENTS.MESSAGE_EDITED);
      socketClient.off(EVENTS.REACTION_UPDATED);
      socketClient.off(EVENTS.USER_TYPING);
      socketClient.off(EVENTS.ERROR);
      socketClient.disconnect();
    };
  }, [currentProject?.id, currentProject?.orderNumber]);

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Handle typing
  useEffect(() => {
    if (newMessage && currentProject?.id) {
      const roomId = currentProject.orderNumber ? `order-${currentProject.id}` : currentProject.id;
      socketClient.emitTyping(roomId, true);
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socketClient.emitTyping(roomId, false);
      }, 2000);
    }
    return () => clearTimeout(typingTimeoutRef.current);
  }, [newMessage, currentProject?.id, currentProject?.orderNumber]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() && fileUploads.length === 0) return;
    if (!currentProject?.id) {
      setError("Cannot send message: Invalid project ID.");
      return;
    }

    setError(null);
    let attachments = [];
    if (fileUploads.length > 0) {
      try {
        const formData = new FormData();
        fileUploads.forEach((file) => formData.append("files", file));

        const response = await axiosInstance.post("/messages/upload", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });

        attachments = response.data.data.map((file) => ({
          id: file.id,
          name: file.name,
          size: file.size,
          type: file.type,
          url: file.url,
          category: "raw",
          uploadedAt: new Date().toISOString(),
          uploadedBy: "freelancer",
        }));
      } catch (error) {
        console.error("File upload error:", error);
        setError("Failed to upload files. Please try again.");
        return;
      }
    }

    // Send message based on project type
    const roomId = currentProject.orderNumber ? `order-${currentProject.id}` : currentProject.id;
    socketClient.sendMessage(roomId, newMessage, attachments, replyingTo?.id);
    setNewMessage("");
    setFileUploads([]);
    setReplyingTo(null);
    socketClient.emitTyping(roomId, false);
  };

  const toggleDraftLock = async (draftId) => {
    if (!currentProject?.drafts) return;
    const draft = currentProject.drafts.find((d) => d.id === draftId);
    if (!draft) return;
    try {
      await axiosInstance.patch(`/drafts/${draftId}`, { locked: !draft.locked });
      const updatedDrafts = currentProject.drafts.map((d) =>
        d.id === draftId ? { ...d, locked: !d.locked } : d
      );
      setCurrentProject({ ...currentProject, drafts: updatedDrafts });
    } catch (error) {
      console.error("Error toggling draft lock:", error);
      setError("Failed to update draft status.");
    }
  };

  const handleFileUpload = (e) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      setFileUploads((prev) => [...prev, ...filesArray]);
    }
  };

  const removeFile = (index) => {
    setFileUploads((prev) => prev.filter((_, i) => i !== index));
  };

  const handleReplyToMessage = (message) => {
    setReplyingTo(message);
  };

  const handleDeleteMessage = async (messageId) => {
    try {
      await axiosInstance.delete(`/messages/${messageId}`);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId ? { ...msg, content: "This message was deleted", isDeleted: true } : msg
        )
      );
    } catch (error) {
      console.error("Error deleting message:", error);
      setError("Failed to delete message.");
    }
  };

  const handleAddReaction = async (messageId, emoji) => {
    try {
      const response = await axiosInstance.post(`/messages/${messageId}/reactions`, { emoji });
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId ? { ...msg, reactions: response.data.data.reactions } : msg
        )
      );
      setShowEmojiPicker(null);
    } catch (error) {
      console.error("Error adding reaction:", error);
      setError("Failed to add reaction.");
    }
  };

  const getReplyMessage = (replyId) => {
    return messages.find((msg) => msg.id === replyId);
  };

  const handleDragStart = (e, taskId) => {
    e.dataTransfer.setData("taskId", taskId);
  };

  const handleDrop = async (e, newStatus) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("taskId");
    try {
      // Attempt to update task status via backend
      await axiosInstance.patch(`/jobs/${currentProject.id}/tasks/${taskId}`, { status: newStatus });
      const updatedTasks = currentProject.tasks.map((task) =>
        task.id === taskId ? { ...task, status: newStatus } : task
      );
      setCurrentProject({ ...currentProject, tasks: updatedTasks });
    } catch (error) {
      console.error("Error updating task status:", error);
      setError("Failed to update task status. Using local update as fallback.");
      // Fallback to local update
      const updatedTasks = currentProject.tasks.map((task) =>
        task.id === taskId ? { ...task, status: newStatus } : task
      );
      setCurrentProject({ ...currentProject, tasks: updatedTasks });
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "Completed":
        return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      case "In Progress":
        return <Clock className="w-4 h-4 text-blue-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-slate-400" />;
    }
  };

  const saveNotes = async () => {
    try {
      // Attempt to save notes to backend
      await axiosInstance.patch(`/jobs/${currentProject.id}/notes`, { notes: notesContent });
      setCurrentProject({ ...currentProject, notes: notesContent });
      setIsEditingNotes(false);
    } catch (error) {
      console.error("Error saving notes:", error);
      setError("Failed to save notes. Using local update as fallback.");
      // Fallback to local update
      setCurrentProject({ ...currentProject, notes: notesContent });
      setIsEditingNotes(false);
    }
  };

  const getTimelineStatus = (status) => {
    switch (status) {
      case "completed":
        return "bg-emerald-500";
      case "in-progress":
        return "bg-blue-500";
      default:
        return "bg-slate-300 dark:bg-slate-600";
    }
  };

  const commonEmojis = ["👍", "❤️", "😂", "😮", "😢", "👏"];

  const tabs = [
    { id: "chat", label: "Chat", icon: MessageSquare },
    { id: "tasks", label: "Tasks", icon: CheckSquare },
    { id: "notes", label: "Notes", icon: FileText },
    { id: "timeline", label: "Timeline", icon: Calendar },
    { id: "stream", label: "Live", icon: Video },
  ];

  if (!currentProject) {
    return (
      <div className="flex flex-1 items-center justify-center h-full text-slate-400 text-lg">
        Nothing to show
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white dark:bg-slate-900">
      {/* Enhanced Header */}
      <div className="hidden lg:flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-white to-slate-50 dark:from-slate-900 dark:to-slate-800">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
            <FileText className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              {currentProject?.title || currentProject?.name || "Project Name"}
            </h1>
            <div className="flex items-center space-x-3 mt-1">
              {currentProject?.orderNumber && (
                <span className="text-sm text-slate-500 dark:text-slate-400 font-mono">
                  #{currentProject.orderNumber}
                </span>
              )}
              <span className="text-sm text-slate-600 dark:text-slate-400">
                {currentProject?.client
                  ? `${currentProject.client.firstname} ${currentProject.client.lastname}`
                  : currentProject?.postedBy
                  ? `${currentProject.postedBy.firstname} ${currentProject.postedBy.lastname}`
                  : "Client Name"}
              </span>
              <span
                className={`px-2 py-1 rounded-full text-xs font-medium ${
                  currentProject?.status === "CURRENT" || currentProject?.status === "In Progress"
                    ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                    : currentProject?.status === "COMPLETED" || currentProject?.status === "Completed"
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                    : currentProject?.status === "PENDING" || currentProject?.status === "Review"
                      ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                      : "bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400"
                }`}
              >
                {currentProject?.status === "CURRENT" ? "In Progress" : 
                 currentProject?.status === "COMPLETED" ? "Completed" :
                 currentProject?.status === "PENDING" ? "Pending" :
                 currentProject?.status || "Pending"}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
            <Bell className="w-5 h-5" />
          </button>
          <button className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Enhanced Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              className={`flex items-center space-x-2 px-4 lg:px-6 py-4 font-medium text-sm whitespace-nowrap transition-all duration-200 ${
                activeTab === tab.id
                  ? "text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
              }`}
              onClick={() => setActiveTab(tab.id)}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab && activeTab === "chat" && (
          <div className="h-full flex flex-col">
            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 text-sm border-b border-red-200 dark:border-red-800">
                {error}
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-4" ref={chatContainerRef}>
              {messages.length === 0 && !error && (
                <div className="flex flex-col items-center justify-center h-full text-slate-500 dark:text-slate-400">
                  <MessageSquare className="w-12 h-12 mb-4 opacity-50" />
                  <p className="text-lg font-medium">No messages yet</p>
                  <p className="text-sm">Start the conversation with your client</p>
                </div>
              )}

              {messages.map((message) => {
                const mine = isOwnMessage(message, toNumberId(user?.id));
                return (
                <div
                  key={message.id}
                  className={`flex w-full items-start gap-3 ${mine ? "justify-end" : "justify-start"}`}
                >
                  {!mine && (
                    <div className="w-8 h-8 lg:w-10 lg:h-10 rounded-full overflow-hidden flex-shrink-0">
                      <img
                        src={message.sender?.avatar || "/placeholder.svg?height=40&width=40"}
                        alt={message.sender?.name || "Unknown"}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}

                  <div
                    className={`relative max-w-[85%] lg:max-w-[70%] rounded-2xl p-3 lg:p-4 ${
                      message.isPinned
                        ? "bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/30 dark:to-purple-900/30 border border-blue-200 dark:border-blue-700 w-full"
                        : mine
                          ? "bg-gradient-to-r from-green-400 to-green-600 text-white shadow-lg"
                          : "bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-md border border-slate-200 dark:border-slate-600"
                    } ${message.sentiment === "negative" ? "border-l-4 border-yellow-500" : ""} group hover:shadow-lg transition-all duration-200`}
                  >
                    {/* Reply indicator */}
                    {message.replyTo && (
                      <div
                        className={`text-xs mb-2 pb-2 border-b ${
                          mine
                            ? "border-blue-300 text-blue-100"
                            : "border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400"
                        } flex items-center`}
                      >
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

                    {message.isPinned && (
                      <div className="text-xs text-blue-600 dark:text-blue-400 mb-2 font-semibold uppercase tracking-wide">
                        📌 Pinned Project Brief
                      </div>
                    )}

                    <p className={`text-sm lg:text-base ${message.isDeleted ? "italic opacity-60" : ""}`}>
                      {message.content}
                    </p>

                    {message.attachments?.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {message.attachments.map((attachment, index) => {
                          const isImage = attachment.type.startsWith("image/");
                          const isVideo = attachment.type.startsWith("video/");
                          const isAudio = attachment.type.startsWith("audio/");
                          const safeUrl = isSafeUrl(attachment.url) ? attachment.url : null;

                          return (
                            <div key={index} className="rounded-lg overflow-hidden border dark:border-slate-600">
                              {isImage && safeUrl && (
                                <img
                                  src={safeUrl}
                                  alt={attachment.name}
                                  className="max-h-48 w-auto object-contain rounded-lg"
                                />
                              )}
                              {isVideo && safeUrl && (
                                <video src={safeUrl} controls className="max-h-48 w-full rounded-lg" />
                              )}
                              {isAudio && safeUrl && <audio src={safeUrl} controls className="w-full" />}
                              <div
                                className={`flex items-center justify-between p-2 text-xs ${
                                  mine ? "bg-blue-600" : "bg-slate-100 dark:bg-slate-600"
                                }`}
                              >
                                <div className="flex items-center gap-2 truncate">
                                  <Paperclip className="w-3 h-3" />
                                  <span className="truncate">{attachment.name}</span>
                                </div>
                                <a
                                  href={safeUrl || '#'}
                                  download={attachment.name}
                                  className={`ml-2 hover:underline font-medium ${!safeUrl ? 'pointer-events-none opacity-50' : ''}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  Download
                                </a>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    <div className="flex justify-between items-center mt-2">
                      <span className="text-xs opacity-70">
                        {new Date(message.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                      {message.sentiment === "negative" && (
                        <div className="text-xs text-yellow-500 dark:text-yellow-400 flex items-center">
                          <span className="mr-1">Suggestion available</span>
                          <div className="group relative">
                            <button className="text-yellow-500 dark:text-yellow-400 hover:text-yellow-400 dark:hover:text-yellow-300">
                              <AlertCircle className="w-3 h-3" />
                            </button>
                            <div className="absolute bottom-full right-0 mb-2 w-64 p-2 bg-white dark:bg-slate-800 rounded shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
                              <p className="text-xs text-slate-600 dark:text-slate-300 mb-1">Suggested response:</p>
                              <p className="text-xs text-slate-800 dark:text-white">
                                "I'll enhance the color grading to make the visuals more vibrant. You'll see the difference in v1.2 tomorrow."
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {message.reactions?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {message.reactions.map((reaction, index) => (
                          <button
                            key={index}
                            onClick={() => handleAddReaction(message.id, reaction.emoji)}
                            className="text-xs rounded-full px-2 py-1 bg-white/20 hover:bg-white/30 transition-colors"
                          >
                            {reaction.emoji} {reaction.count}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Message Actions */}
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex space-x-1">
                      <button
                        onClick={() => handleReplyToMessage(message)}
                        className="p-1 rounded-full bg-black/10 hover:bg-black/20 transition-colors"
                      >
                        <Reply className="w-3 h-3" />
                      </button>
                      <div className="relative">
                        <button
                          onClick={() => setShowEmojiPicker(showEmojiPicker === message.id ? null : message.id)}
                          className="p-1 rounded-full bg-black/10 hover:bg-black/20 transition-colors"
                        >
                          <Smile className="w-3 h-3" />
                        </button>
                        {showEmojiPicker === message.id && (
                          <div className="absolute top-full right-0 mt-1 bg-white dark:bg-slate-800 rounded-lg shadow-xl p-2 z-10 flex space-x-1 border border-slate-200 dark:border-slate-600">
                            {commonEmojis.map((emoji) => (
                              <button
                                key={emoji}
                                onClick={() => handleAddReaction(message.id, emoji)}
                                className="hover:bg-slate-100 dark:hover:bg-slate-700 p-1 rounded transition-colors"
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      {mine && !message.isDeleted && (
                        <button
                          onClick={() => handleDeleteMessage(message.id)}
                          className="p-1 rounded-full bg-black/10 hover:bg-red-500/20 transition-colors"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>

                </div>
                );
              })}
              <div ref={messagesEndRef} />

              {typingUsers.length > 0 && (
                <div className="flex items-center space-x-2 text-slate-500 dark:text-slate-400">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                    <div
                      className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"
                      style={{ animationDelay: "0.1s" }}
                    ></div>
                    <div
                      className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"
                      style={{ animationDelay: "0.2s" }}
                    ></div>
                  </div>
                  <span className="text-sm">
                    {typingUsers.map((u) => u.name).join(", ")} {typingUsers.length > 1 ? "are" : "is"} typing...
                  </span>
                </div>
              )}
            </div>

            {/* Drafts Section */}
            {showDrafts && (
              <div className="p-4 lg:p-6 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 relative">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase">Project Drafts</h3>
                  <button
                    onClick={() => setShowDrafts(false)}
                    className="text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex space-x-2 overflow-x-auto pb-2 mb-3">
                  {currentProject?.drafts?.map((draft) => (
                    <div
                      key={draft.id}
                      className={`relative cursor-pointer group ${
                        selectedDraft?.id === draft.id ? "ring-2 ring-blue-500" : ""
                      }`}
                      onClick={() => setSelectedDraft(draft)}
                    >
                      <img
                        src={draft.thumbnail || "/placeholder.svg"}
                        alt={`Draft ${draft.version}`}
                        className="h-16 w-28 object-cover rounded"
                      />
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          className="text-white"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleDraftLock(draft.id);
                          }}
                        >
                          {draft.locked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                        </button>
                      </div>
                      <span className="absolute bottom-1 right-1 text-xs bg-black/70 px-1 rounded">{draft.version}</span>
                    </div>
                  ))}
                  <div
                    className="h-16 w-28 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded flex items-center justify-center cursor-pointer hover:border-blue-500 transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Plus className="w-5 h-5 text-slate-400 dark:text-slate-500" />
                    <input
                      type="file"
                      ref={fileInputRef}
                      className="hidden"
                      accept="video/*"
                      onChange={handleFileUpload}
                    />
                  </div>
                </div>

                {selectedDraft && (
                  <div className="bg-black rounded-lg overflow-hidden">
                    <div className="aspect-video bg-slate-800 flex items-center justify-center">
                      <div className="text-center">
                        <Video className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                        <p className="text-sm text-slate-500">Video player would appear here</p>
                        <p className="text-xs text-slate-600 mt-1">Draft {selectedDraft.version}</p>
                      </div>
                    </div>
                    <div className="bg-slate-800 p-2 flex justify-between items-center">
                      <div className="flex space-x-2">
                        <button className="p-1 rounded hover:bg-slate-700">
                          <CheckCircle2 className="w-4 h-4 text-slate-400" />
                        </button>
                        <button className="p-1 rounded hover:bg-slate-700">
                          <AlertCircle className="w-4 h-4 text-slate-400" />
                        </button>
                      </div>
                      <div className="text-xs text-slate-400">
                        {selectedDraft.locked ? "Locked for client" : "Visible to client"}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Reply Banner */}
            {replyingTo && (
              <div className="px-4 lg:px-6 py-3 bg-slate-50 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center">
                <div className="flex items-center text-sm text-slate-600 dark:text-slate-400">
                  <Reply className="w-4 h-4 mr-2 text-blue-500" />
                  <span className="truncate">
                    Replying to: {replyingTo.content.substring(0, 50)}
                    {replyingTo.content.length > 50 ? "..." : ""}
                  </span>
                </div>
                <button
                  onClick={() => setReplyingTo(null)}
                  className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* File Upload Preview */}
            {fileUploads.length > 0 && (
              <div className="px-4 lg:px-6 py-3 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
                <div className="flex flex-wrap gap-2">
                  {fileUploads.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 bg-white dark:bg-slate-700 rounded-lg px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 shadow-sm"
                    >
                      <span className="truncate max-w-[150px]">{file.name}</span>
                      <button
                        onClick={() => removeFile(index)}
                        className="text-slate-500 hover:text-red-500 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Message Input */}
            <div className="p-4 lg:p-6 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
              <form onSubmit={handleSendMessage} className="flex items-end space-x-3">
                <div className="flex space-x-2">
                  <button
                    type="button"
                    className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Paperclip className="w-5 h-5" />
                    <input type="file" ref={fileInputRef} className="hidden" multiple onChange={handleFileUpload} />
                  </button>

                  <button
                    type="button"
                    className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                    onClick={() => setShowDrafts(true)}
                  >
                    <Film className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    disabled={!currentProject?.id}
                  />
                </div>

                <button
                  type="submit"
                  className="p-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={!newMessage.trim() && fileUploads.length === 0 || !currentProject?.id}
                >
                  <Send className="w-5 h-5" />
                </button>
              </form>
            </div>
          </div>
        )}

        {activeTab && activeTab === "tasks" && (
          <div className="h-full flex flex-col">
            {/* Task Header */}
            <div className="p-4 lg:p-6 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Task Management</h2>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Track and manage project tasks</p>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="flex bg-slate-100 dark:bg-slate-700 rounded-lg p-1">
                    <button
                      onClick={() => setTaskView("kanban")}
                      className={`p-2 rounded-md transition-colors ${
                        taskView === "kanban"
                          ? "bg-white dark:bg-slate-600 text-slate-900 dark:text-slate-100 shadow-sm"
                          : "text-slate-600 dark:text-slate-400"
                      }`}
                    >
                      <Kanban className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setTaskView("list")}
                      className={`p-2 rounded-md transition-colors ${
                        taskView === "list"
                          ? "bg-white dark:bg-slate-600 text-slate-900 dark:text-slate-100 shadow-sm"
                          : "text-slate-600 dark:text-slate-400"
                      }`}
                    >
                      <List className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Task Content */}
            <div className="flex-1 overflow-auto p-4 lg:p-6">
              {currentProject?.tasks?.length > 0 ? (
                taskView === "kanban" ? (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
                    {/* Pending Column */}
                    <div
                      className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-200 dark:border-slate-700"
                      onDrop={(e) => handleDrop(e, "Pending")}
                      onDragOver={handleDragOver}
                    >
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-slate-700 dark:text-slate-300 flex items-center">
                          <AlertCircle className="w-4 h-4 mr-2 text-slate-400" />
                          Pending
                        </h3>
                        <span className="bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 text-xs px-2 py-1 rounded-full">
                          {currentProject.tasks.filter((task) => task.status === "Pending").length}
                        </span>
                      </div>
                      <div className="space-y-3">
                        {currentProject.tasks
                          .filter((task) => task.status === "Pending")
                          .map((task) => (
                            <div
                              key={task.id}
                              className="bg-white dark:bg-slate-700 rounded-lg p-4 cursor-move hover:shadow-md transition-all duration-200 border border-slate-200 dark:border-slate-600"
                              draggable
                              onDragStart={(e) => handleDragStart(e, task.id)}
                            >
                              <div className="flex justify-between items-start mb-3">
                                <h4 className="font-medium text-slate-900 dark:text-slate-100">{task.name}</h4>
                                <button className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                                  <MoreHorizontal className="w-4 h-4" />
                                </button>
                              </div>
                              <div className="flex items-center justify-between text-sm text-slate-600 dark:text-slate-400">
                                <span className="font-medium">
                                  ${task.cost} • {task.hours}h
                                </span>
                                <span>Due: {new Date(task.dueDate).toLocaleDateString()}</span>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>

                    {/* In Progress Column */}
                    <div
                      className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-700"
                      onDrop={(e) => handleDrop(e, "In Progress")}
                      onDragOver={handleDragOver}
                    >
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-blue-700 dark:text-blue-300 flex items-center">
                          <Clock className="w-4 h-4 mr-2 text-blue-500" />
                          In Progress
                        </h3>
                        <span className="bg-blue-200 dark:bg-blue-800 text-blue-700 dark:text-blue-300 text-xs px-2 py-1 rounded-full">
                          {currentProject.tasks.filter((task) => task.status === "In Progress").length}
                        </span>
                      </div>
                      <div className="space-y-3">
                        {currentProject.tasks
                          .filter((task) => task.status === "In Progress")
                          .map((task) => (
                            <div
                              key={task.id}
                              className="bg-white dark:bg-slate-700 rounded-lg p-4 cursor-move hover:shadow-md transition-all duration-200 border border-blue-200 dark:border-blue-600"
                              draggable
                              onDragStart={(e) => handleDragStart(e, task.id)}
                            >
                              <div className="flex justify-between items-start mb-3">
                                <h4 className="font-medium text-slate-900 dark:text-slate-100">{task.name}</h4>
                                <button className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                                  <MoreHorizontal className="w-4 h-4" />
                                </button>
                              </div>
                              <div className="flex items-center justify-between text-sm text-slate-600 dark:text-slate-400">
                                <span className="font-medium">
                                  ${task.cost} • {task.hours}h
                                </span>
                                <span>Due: {new Date(task.dueDate).toLocaleDateString()}</span>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>

                    {/* Completed Column */}
                    <div
                      className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-4 border border-emerald-200 dark:border-emerald-700"
                      onDrop={(e) => handleDrop(e, "Completed")}
                      onDragOver={handleDragOver}
                    >
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-emerald-700 dark:text-emerald-300 flex items-center">
                          <CheckCircle2 className="w-4 h-4 mr-2 text-emerald-500" />
                          Completed
                        </h3>
                        <span className="bg-emerald-200 dark:bg-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs px-2 py-1 rounded-full">
                          {currentProject.tasks.filter((task) => task.status === "Completed").length}
                        </span>
                      </div>
                      <div className="space-y-3">
                        {currentProject.tasks
                          .filter((task) => task.status === "Completed")
                          .map((task) => (
                            <div
                              key={task.id}
                              className="bg-white dark:bg-slate-700 rounded-lg p-4 cursor-move hover:shadow-md transition-all duration-200 border border-emerald-200 dark:border-emerald-600"
                              draggable
                              onDragStart={(e) => handleDragStart(e, task.id)}
                            >
                              <div className="flex justify-between items-start mb-3">
                                <h4 className="font-medium text-slate-900 dark:text-slate-100 line-through opacity-75">
                                  {task.name}
                                </h4>
                                <button className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                                  <MoreHorizontal className="w-4 h-4" />
                                </button>
                              </div>
                              <div className="flex items-center justify-between text-sm text-slate-600 dark:text-slate-400">
                                <span className="font-medium">
                                  ${task.cost} • {task.hours}h
                                </span>
                                <span className="text-emerald-600 dark:text-emerald-400 font-medium">✓ Done</span>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {currentProject.tasks.map((task) => (
                      <div
                        key={task.id}
                        className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700 hover:shadow-md transition-all duration-200"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            {getStatusIcon(task.status)}
                            <div>
                              <h4 className="font-medium text-slate-900 dark:text-slate-100">{task.name}</h4>
                              <p className="text-sm text-slate-600 dark:text-slate-400">
                                ${task.cost} • {task.hours}h • Due: {new Date(task.dueDate).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-medium ${
                              task.status === "Completed"
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                                : task.status === "In Progress"
                                  ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                                  : "bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400"
                            }`}
                          >
                            {task.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-slate-500 dark:text-slate-400">
                  <CheckSquare className="w-12 h-12 mb-4 opacity-50" />
                  <p className="text-lg font-medium">No tasks yet</p>
                  <p className="text-sm">Add tasks to track project progress</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab && activeTab === "notes" && (
          <div className="h-full flex flex-col">
            {/* Notes Header */}
            <div className="p-4 lg:p-6 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Project Notes</h2>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                    Collaborative notes and documentation
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  {isEditingNotes ? (
                    <>
                      <button
                        onClick={saveNotes}
                        className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                      >
                        <Save className="w-4 h-4" />
                        <span>Save</span>
                      </button>
                      <button
                        onClick={() => {
                          setIsEditingNotes(false);
                          setNotesContent(currentProject?.notes || "");
                        }}
                        className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setIsEditingNotes(true)}
                      className="flex items-center space-x-2 px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                    >
                      <Edit3 className="w-4 h-4" />
                      <span>Edit</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Notes Content */}
            <div className="flex-1 p-4 lg:p-6">
              {isEditingNotes ? (
                <textarea
                  value={notesContent}
                  onChange={(e) => setNotesContent(e.target.value)}
                  placeholder="Start writing your project notes here..."
                  className="w-full h-full resize-none bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              ) : (
                <div className="h-full">
                  {notesContent ? (
                    <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 h-full">
                      <div className="prose dark:prose-invert max-w-none">
                        {notesContent.split("\n").map((line, index) => (
                          <p key={index} className="mb-4 text-slate-900 dark:text-slate-100">
                            {line || "\u00A0"}
                          </p>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-slate-500 dark:text-slate-400">
                      <FileText className="w-12 h-12 mb-4 opacity-50" />
                      <p className="text-lg font-medium">No notes yet</p>
                      <p className="text-sm mb-4">Start documenting your project ideas and progress</p>
                      <button
                        onClick={() => setIsEditingNotes(true)}
                        className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Add Notes</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab && activeTab === "timeline" && (
          <div className="h-full flex flex-col">
            {/* Timeline Header */}
            <div className="p-4 lg:p-6 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Project Timeline</h2>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                    Track milestones and project progress
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <button className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                    <BarChart3 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Timeline Content */}
            <div className="flex-1 overflow-auto p-4 lg:p-6">
              <div className="max-w-4xl mx-auto">
                {currentProject?.timeline && currentProject.timeline.length > 0 ? (
                  <div className="relative">
                    {/* Timeline Line */}
                    <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-slate-200 dark:bg-slate-700"></div>

                    <div className="space-y-8">
                      {currentProject.timeline.map((item, index) => (
                        <div key={item.id} className="relative flex items-start space-x-6">
                          {/* Timeline Dot */}
                          <div
                            className={`relative z-10 w-4 h-4 rounded-full border-4 border-white dark:border-slate-900 ${getTimelineStatus(item.status)}`}
                          >
                            {item.status === "completed" && (
                              <div className="absolute inset-0 flex items-center justify-center">
                                <CheckCircle2 className="w-3 h-3 text-white" />
                              </div>
                            )}
                          </div>

                          {/* Timeline Content */}
                          <div className="flex-1 min-w-0">
                            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all duration-200">
                              <div className="flex items-center justify-between mb-2">
                                <h3 className="font-semibold text-slate-900 dark:text-slate-100">{item.title}</h3>
                                <span
                                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                                    item.status === "completed"
                                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                                      : item.status === "in-progress"
                                        ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                                        : "bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400"
                                  }`}
                                >
                                  {item.status === "completed"
                                    ? "Completed"
                                    : item.status === "in-progress"
                                      ? "In Progress"
                                      : "Pending"}
                                </span>
                              </div>
                              <p className="text-sm text-slate-600 dark:text-slate-400">
                                {new Date(item.date).toLocaleDateString("en-US", {
                                  year: "numeric",
                                  month: "long",
                                  day: "numeric",
                                })}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-slate-500 dark:text-slate-400">
                    <Calendar className="w-12 h-12 mb-4 opacity-50" />
                    <p className="text-lg font-medium">No timeline events</p>
                    <p className="text-sm">Timeline milestones will appear here</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab && activeTab === "stream" && (
          <div className="h-full flex items-center justify-center p-4 lg:p-6">
            <div className="text-center max-w-md mx-auto">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                <Video className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">Live Preview</h3>
              <p className="text-slate-600 dark:text-slate-400 mb-6">
                Share your screen or video preview with the client in real-time
              </p>
              <button
                onClick={() => setIsStreaming(true)}
                className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl font-medium"
              >
                Start Screen Share
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}