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
    _id: "",
    name: "",
    membersDeatils: [],
    adminsDeatils: [],
    owner: null,
  });

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

        const details = await axios.get(`/api/groups/groupDetails/${receiver_id}`, {
          withCredentials: true,
        });

        setGroupDetails(details.data.data);
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

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      const response = await axios.get(`/api/users/search?username=${searchQuery}`, {
        withCredentials: true,
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
      refreshGroupDetails();
    } catch (error) {
      console.error("Failed to add member:", error);
      alert("Error adding member");
    }
  };

  const refreshGroupDetails = async () => {
    try {
      const details = await axios.get(`/api/groups/groupDetails/${receiver_id}`, {
        withCredentials: true,
      });
      setGroupDetails(details.data.data);
    } catch (error) {
      console.error("Error refreshing group details", error);
    }
  };

  const handleRemoveMember = async (id) => {
    try {
      await axios.delete(`/api/groups/members/${receiver_id}/${id}`, {
        withCredentials: true,
      });
      alert("Member removed");
      refreshGroupDetails();
    } catch (error) {
      console.error("Error removing member", error);
      alert("Error removing member");
    }
  };

  const handlePromoteToAdmin = async (id) => {
    try {
      await axios.patch(`/api/groups/admins/${receiver_id}/${id}`, {}, {
        withCredentials: true,
      });
      alert("Member promoted to admin");
      refreshGroupDetails();
    } catch (error) {
      console.error("Error promoting to admin", error);
      alert("Error promoting member");
    }
  };

  const handleRemoveAdmin = async (id) => {
    try {
      await axios.delete(`/api/groups/admins/${receiver_id}/${id}`, {
        withCredentials: true,
      });
      alert("Admin removed from group");
      refreshGroupDetails();
    } catch (error) {
      console.error("Error removing admin", error);
      alert("Error removing admin");
    }
  };

  const handleDemoteToMember = async (id) => {
    try {
      await axios.delete(`/api/groups/admins/remove/${receiver_id}/${id}`, {
        withCredentials: true,
      });
      alert("Admin demoted to member");
      refreshGroupDetails();
    } catch (error) {
      console.error("Error demoting admin", error);
      alert("Error demoting admin");
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
    <div className="flex h-screen overflow-hidden">
      {/* LEFT SIDEBAR */}
      <div className="w-1/4 bg-white border-r p-4 overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">{groupName}</h2>
        {/* Add Member */}
        <div className="w-full max-w-md">
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
                  className={`p-2 cursor-pointer hover:bg-gray-100 ${
                    selectedUser?._id === user._id ? "bg-blue-50" : ""
                  }`}
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
            className={`w-full py-2 rounded ${
              selectedUser ? "bg-green-500 text-white" : "bg-gray-300 cursor-not-allowed"
            }`}
          >
            Add Member
          </button>
        </div>
        <div className="mb-4">
          <p className="font-semibold text-gray-700">Group Name:</p>
          <p className="text-gray-800">{groupDetails.name}</p>
        </div>

        <div className="mb-4">
          <p className="font-semibold text-gray-700">Owner:</p>
          <p className="text-gray-800">
            {groupDetails.owner?.username} ({groupDetails.owner?.email})
          </p>
        </div>

        <div className="mb-4">
          <p className="font-semibold text-gray-700">Admins:</p>
          <ul className="list-disc list-inside text-gray-800 space-y-2">
            {groupDetails.adminsDeatils.map((admin) => (
              <li key={admin._id} className="flex justify-between items-center">
                <span>{admin.username}</span>
                <div className="space-x-1">
                  <button
                    onClick={() => handleDemoteToMember(admin._id)}
                    className="bg-yellow-400 text-white px-2 py-1 rounded text-sm"
                  >
                    Demote
                  </button>
                  <button
                    onClick={() => handleRemoveAdmin(admin._id)}
                    className="bg-red-500 text-white px-2 py-1 rounded text-sm"
                  >
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="font-semibold text-gray-700">Members:</p>
          <ul className="list-disc list-inside text-gray-800 space-y-2">
            {groupDetails.membersDeatils.map((member) => (
              <li key={member._id} className="flex justify-between items-center">
                <span>{member.username}</span>
                <div className="space-x-1">
                  <button
                    onClick={() => handlePromoteToAdmin(member._id)}
                    className="bg-blue-500 text-white px-2 py-1 rounded text-sm"
                  >
                    Promote
                  </button>
                  <button
                    onClick={() => handleRemoveMember(member._id)}
                    className="bg-red-500 text-white px-2 py-1 rounded text-sm"
                  >
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>

        
      </div>

      {/* RIGHT CHAT AREA */}
      <div className="w-3/4 p-4 flex flex-col">
        <div className="flex-1 overflow-y-auto bg-gray-50 p-4 rounded-md space-y-2 border mb-4">
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
                <strong>{msg.senderDetails?.username}</strong> {formatTimestamp(msg.createdAt)}
              </p>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <div className="flex gap-2 mb-4">
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
    </div>
  );
};

export default GroupPage;
