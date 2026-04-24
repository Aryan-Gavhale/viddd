import React, { useState } from 'react';
import { Search } from 'lucide-react';


const ChatList= ({ chats, selectedChat, onSelectChat }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredChats = chats.filter(chat =>
    chat.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-gray-200">
        <div className="relative">
          <input
            type="text"
            placeholder="Search chats..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <Search className="absolute left-3 top-2.5 text-gray-400" size={20} />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {filteredChats.map(chat => (
          <div
            key={chat.id}
            className={`p-4 border-b border-gray-200 cursor-pointer hover:bg-gray-50 ${
              selectedChat?.id === chat.id ? 'bg-blue-50' : ''
            }`}
            onClick={() => onSelectChat(chat)}
          >
            <div className="flex items-center">
              <div className="w-12 h-12 bg-gray-300 rounded-full mr-4"></div>
              <div className="flex-1">
                <h3 className="font-semibold">{chat.name}</h3>
                <p className="text-sm text-gray-500 truncate">{chat.lastMessage}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400">12:34 PM</p>
                {chat.unreadCount > 0 && (
                  <span className="inline-block bg-blue-500 text-white text-xs rounded-full px-2 py-1 mt-1">
                    {chat.unreadCount}
                  </span>
                )}
              </div>
            </div>
            <div className="mt-2 flex items-center">
              <span className={`w-2 h-2 rounded-full mr-2 ${
                chat.status === 'online' ? 'bg-green-500' : 'bg-gray-400'
              }`}></span>
              <span className="text-xs text-gray-500 capitalize">{chat.status}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ChatList;

