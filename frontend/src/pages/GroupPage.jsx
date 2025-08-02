import React, { useEffect, useState, useRef } from "react";
import { useLocation } from "react-router-dom";
import io from "socket.io-client";
import axios from "axios";
import moment from "moment";

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
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [groupDetails, setGroupDetails] = useState({
    owner: "",
    members: [],
    admins: []
  });
  const messagesEndRef = useRef(null);
  console.log(messages);

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
        
        const owners = new Set();
        const admins = new Set();
        const members = new Set();

        for (let message of res.data.data) {
          if (message.senderRole === "owner") {
            owners.add(message.sender);
          } else if (message.senderRole === "admin") {
            admins.add(message.sender);
          } else {
            members.add(message.sender);
          }
        }

        setGroupDetails({
          owner: [...owners][0] || "",
          admins: [...admins],
          members: [...members]
        });

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

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      const response = await axios.get(`/api/users/search?username=${searchQuery}`, {
        withCredentials: true
      });
      setSearchResults(response.data.data);
    } catch (error) {
      console.error("Error searching users:", error);
      setSearchResults([]);
    }
  };

  const sendMessage = () => {
    if (input.trim() === "") return;

    socket.emit("send-message", {
      content: input,
      receiver_id,
      isGroup: true,
    });

    setInput("");
  };

  const handleAddMember = async () => {
    if (!selectedUser) return;

    try {
      await axios.patch(
        `/api/groups/members/${receiver_id}/${selectedUser._id}`,
        {},
        { withCredentials: true }
      );
      alert(`Member ${selectedUser.username} added successfully`);
      setSelectedUser(null);
      setSearchQuery("");
      setSearchResults([]);
    } catch (error) {
      console.error("Failed to add member:", error);
      alert("Error adding member");
    }
  };

  const formatTimestamp = (timestamp) => {
    const date = moment(timestamp);
    const now = moment();

    if (date.isSame(now, "day")) {
      return `Today • ${date.format("hh:mm A")}`;
    } else if (date.isSame(now.clone().subtract(1, "days"), "day")) {
      return `Yesterday • ${date.format("hh:mm A")}`;
    } else {
      return date.format("MMM D • hh:mm A");
    }
  };

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <h2 className="text-xl font-bold mb-4 text-center">{groupName}</h2>

      <div className="mt-6 pt-4">
        <div className="w-full max-w-md mx-auto">
          <h3 className="text-lg font-semibold mb-2">Add Member to Group</h3>
          <div className="flex gap-2 items-center mb-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyUp={(e) => e.key === "Enter" && handleSearch()}
              placeholder="Search by username"
              className="flex-1 border rounded px-3 py-2"
            />
            <button
              onClick={handleSearch}
              className="bg-blue-500 text-white px-4 py-2 rounded"
            >
              Search
            </button>
          </div>

          {searchResults.length > 0 && (
            <div className="mb-4 border rounded p-2 max-h-40 overflow-y-auto">
              {searchResults.map((user) => (
                <div 
                  key={user._id}
                  className={`p-2 cursor-pointer hover:bg-gray-100 ${selectedUser?._id === user._id ? 'bg-blue-50' : ''}`}
                  onClick={() => setSelectedUser(user)}
                >
                  <p className="font-medium">{user.username}</p>
                  <p className="text-sm text-gray-600">{user.email}</p>
                </div>
              ))}
            </div>
          )}

          {selectedUser && (
            <div className="mb-4 p-3 bg-gray-50 rounded border">
              <p className="font-medium">Selected User:</p>
              <p>{selectedUser.username} ({selectedUser.email})</p>
            </div>
          )}

          <button
            onClick={handleAddMember}
            disabled={!selectedUser}
            className={`w-full py-2 rounded ${selectedUser ? 'bg-green-500 text-white' : 'bg-gray-300 cursor-not-allowed'}`}
          >
            Add Member
          </button>
        </div>
      </div>

      <div className="bg-gray-50 h-[60vh] overflow-y-auto p-4 rounded-md space-y-2 border mt-4">
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
              <strong>{msg.senderDetails?.username} </strong>{" "}
              {formatTimestamp(msg.createdAt)}
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
          onKeyUp={(e) => e.key === "Enter" && sendMessage()}
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