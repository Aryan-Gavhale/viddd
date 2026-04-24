import React, { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, Smile, MoreVertical } from 'lucide-react';



const ChatWindow= ({ chat, messages, onSendMessage }) => {
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (inputText.trim()) {
      onSendMessage(inputText);
      setInputText('');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center">
          <div className="w-10 h-10 bg-gray-300 rounded-full mr-3"></div>
          <div>
            <h2 className="font-semibold">{chat.name}</h2>
            <p className="text-sm text-gray-500">{chat.status === 'online' ? 'Online' : 'Offline'}</p>
          </div>
        </div>
        <button className="text-gray-500 hover:text-gray-700">
          <MoreVertical size={20} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.senderId === 'me' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xs lg:max-w-md xl:max-w-lg px-4 py-2 rounded-lg ${
                message.senderId === 'me' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-800'
              }`}
            >
              <p>{message.text}</p>
              <div className="mt-1 text-xs flex justify-between items-center">
                <span>{new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                {message.senderId === 'me' && (
                  <span className="ml-2">
                    {message.status === 'sent' && '✓'}
                    {message.status === 'delivered' && '✓✓'}
                    {message.status === 'read' && '✓✓✓'}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      {isTyping && (
        <div className="px-4 py-2 text-sm text-gray-500">
          {chat.name} is typing...
        </div>
      )}
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center bg-gray-100 rounded-lg p-2">
          <button className="text-gray-500 hover:text-gray-700 mr-2">
            <Paperclip size={20} />
          </button>
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
            className="flex-1 bg-transparent resize-none outline-none"
            rows={1}
          />
          <button className="text-gray-500 hover:text-gray-700 mx-2">
            <Smile size={20} />
          </button>
          <button
            onClick={handleSend}
            className="bg-blue-500 text-white rounded-full p-2 hover:bg-blue-600 transition-colors"
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatWindow;

