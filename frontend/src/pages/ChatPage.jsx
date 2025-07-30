import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import io from "socket.io-client";

const socket = io("http://localhost:3000", {
  withCredentials: true,
  autoConnect: false,
});

const ChatPage = () => {
  const { state } = useLocation();
  const [chatMessages, setChatMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");

  if (!state) return <p className="p-4">No chat data found.</p>;

  const { userId, username, email, messages } = state;

  useEffect(() => {
    const normalized = messages.map((msg) => ({
      content: msg.message?.content,
      createdAt: msg.message?.createdAt,
      username: msg.username || "Unknown",
    }));
    setChatMessages(normalized);

    socket.connect();

    socket.on("received-message", (msg) => {
      setChatMessages((prev) => [
        ...prev,
        {
          content: msg.message?.content,
          createdAt: msg.message?.createdAt,
          username: msg.username || "Unknown",
        },
      ]);
    });

    return () => {
      socket.disconnect();
      socket.off("received-message");
    };
  }, [userId, messages]);

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;

    socket.emit("send-message", {
      content: newMessage,
      receiver_id: userId,
      isGroup: false,
    });

    setNewMessage("");
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-2">Chat with {username}</h2>
      <p className="mb-4 text-gray-600">Email: {email}</p>

      <div className="space-y-4 max-h-[400px] overflow-y-auto mb-4 border p-2 rounded">
        {chatMessages.length === 0 ? (
          <p className="text-gray-500">No messages yet.</p>
        ) : (
          chatMessages.map((msg, index) => {
            const isReceived = msg.username === username;

            return (
              <div
                key={index}
                className={`p-4 border rounded ${
                  isReceived ? "bg-blue-100 text-right ml-auto" : "bg-gray-50 text-left mr-auto"
                }`}
                style={{ maxWidth: "70%" }}
              >
                <p>
                  <strong>{msg.username}</strong>: {msg.content}
                </p>
                {msg.createdAt && (
                  <p className="text-sm text-gray-500">
                    {new Date(msg.createdAt).toLocaleString("en-IN", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </p>
                )}
              </div>
            );
          })
        )}
      </div>

      <div className="flex gap-2">
        <textarea
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type your message..."
          className="flex-1 border rounded p-2 resize-none"
          rows={2}
        />
        <button
          onClick={handleSendMessage}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Send
        </button>
      </div>
    </div>
  );
};

export default ChatPage;
