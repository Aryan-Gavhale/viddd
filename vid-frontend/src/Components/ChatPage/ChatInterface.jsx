import React, { useState } from 'react';
import ChatList from "./Chatlist";
import ChatWindow from './ChatWindow';

const ChatInterface = () => {
  const [selectedChat, setSelectedChat] = useState(null);

  const [chats, setChats] = useState([
    { id: '1', name: 'John Doe', lastMessage: "Hey, how's the edit coming along?", unreadCount: 2, status: 'online' },
    { id: '2', name: 'Jane Smith', lastMessage: "I've uploaded the new footage.", unreadCount: 0, status: 'offline' },
    { id: '3', name: 'Mike Johnson', lastMessage: 'Can we schedule a call?', unreadCount: 1, status: 'online' },
  ]);

  const [messages, setMessages] = useState([
    { id: '1', senderId: '1', text: "Hey, how's the edit coming along?", timestamp: new Date().toISOString(), status: 'read' },
    { id: '2', senderId: 'me', text: "It's going well! I'm about 70% done.", timestamp: new Date().toISOString(), status: 'delivered' },
    { id: '3', senderId: '1', text: "Great! Can't wait to see it.", timestamp: new Date().toISOString(), status: 'sent' },
  ]);

  const handleSendMessage = (text) => {
    const newMessage = {
      id: (messages.length + 1).toString(),
      senderId: 'me',
      text,
      timestamp: new Date().toISOString(),
      status: 'sent',
    };
    setMessages([...messages, newMessage]);
  };

  return (
    <div className="flex h-screen bg-gray-100">
      <div className="w-1/3 border-r border-gray-200 bg-white">
        <ChatList chats={chats} selectedChat={selectedChat} onSelectChat={setSelectedChat} />
      </div>
      <div className="w-2/3">
        {selectedChat ? (
          <ChatWindow chat={selectedChat} messages={messages} onSendMessage={handleSendMessage} />
        ) : (
          <div className="flex items-center justify-center h-full bg-gray-50">
            <p className="text-xl text-gray-500">Select a chat to start messaging</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatInterface;
