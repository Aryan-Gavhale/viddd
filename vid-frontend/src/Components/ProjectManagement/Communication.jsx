import { useState } from "react"


const CommunicationSystem = () => {
  const [messages, setMessages] = useState([
    { id: 1, sender: "Client", content: "How is the project going?", timestamp: "2023-07-10 09:00" },
    {
      id: 2,
      sender: "Editor",
      content: "It's going well. I'll upload the first draft soon.",
      timestamp: "2023-07-10 09:05",
    },
  ])

  const [newMessage, setNewMessage] = useState("")

  const sendMessage = () => {
    if (newMessage.trim()) {
      const message = {
        id: messages.length + 1,
        sender: "Current User",
        content: newMessage,
        timestamp: new Date().toLocaleString(),
      }
      setMessages([...messages, message])
      setNewMessage("")
    }
  }

  return (
    <div className="communication-system">
      <h2>Messages</h2>
      <div className="message-list">
        {messages.map((message) => (
          <div key={message.id} className="message-item">
            <strong>{message.sender}</strong>
            <p>{message.content}</p>
            <small>{message.timestamp}</small>
          </div>
        ))}
      </div>
      <div className="message-input">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type your message..."
        />
        <button onClick={sendMessage}>Send</button>
      </div>
    </div>
  )
}

export default CommunicationSystem

