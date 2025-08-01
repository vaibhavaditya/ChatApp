import React, { useEffect, useState, useRef } from "react";
import { useLocation } from "react-router-dom";
import io from "socket.io-client";
import axios from "axios";

const socket = io("http://localhost:3000", {
  withCredentials: true,
  autoConnect: false,
});

const GroupPage = () => {
  const { state } = useLocation();
  const { receiver_id, groupName } = state || {};
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const fetchGroupChat = async () => {
      try {
        const userRes = await axios.get("/api/users/me", {
          withCredentials: true,
        });
        setCurrentUser(userRes.data.data);

        const res = await axios.get(`/api/messages/group/${receiver_id}`, {
          withCredentials: true,
        });

        setMessages(res.data.data);
        socket.connect();
        socket.emit("join-group", receiver_id);
      } catch (error) {
        console.error("Error fetching group messages", error);
      }
    };

    fetchGroupChat();

    const handleReceivedMessage = (data) => {
      if (data.message?.receiverGroup === receiver_id) {
        setMessages((prev) => [
          ...prev,
          {
            ...data.message,
            senderDetails: {
              username: data.username,
              email: data.email,
            },
          },
        ]);
      }
    };

    socket.on("received-message", handleReceivedMessage);

    return () => {
      socket.off("received-message", handleReceivedMessage);
      socket.disconnect();
    };
  }, [receiver_id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = () => {
    if (input.trim() === "") return;

    socket.emit("send-message", {
      content: input,
      receiver_id,
      isGroup: true,
    });

    setInput("");
  };

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <h2 className="text-xl font-bold mb-4 text-center">{groupName}</h2>
      <div className="bg-gray-50 h-[70vh] overflow-y-auto p-4 rounded-md space-y-2 border">
        {messages.map((msg, index) => (
          <div
            key={msg._id || index}
            className={`max-w-[80%] p-2 rounded-lg ${
              msg.sender === currentUser?._id
                ? "bg-green-100 self-end ml-auto"
                : "bg-gray-200"
            }`}
          >
            <p className="text-sm">{msg.content}</p>
            <p className="text-xs text-gray-500 text-right mt-1">
              {msg.senderDetails?.username}
            </p>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <div className="flex mt-4 gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-1 border rounded px-3 py-2"
          placeholder="Type a message"
        />
        <button
          onClick={sendMessage}
          className="bg-green-500 text-white px-4 py-2 rounded"
        >
          Send
        </button>
      </div>
    </div>
  );
};

export default GroupPage;
