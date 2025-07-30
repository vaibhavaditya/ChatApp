import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import io from "socket.io-client";

// socket setup
const socket = io("http://localhost:3000", {
  withCredentials: true,
  autoConnect: false,
});

const GroupPage = () => {
  const { state } = useLocation();
  const [groupMessages, setGroupMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");

  if (!state) return <p className="p-4">No group data found.</p>;

  const { groupId, groupname, messages, members, admins, owner } = state;

  useEffect(() => {
    // normalize and set initial messages
    const normalizedMessages = messages.map((msg) => ({
      content: msg.message?.content,
      createdAt: msg.message?.createdAt,
      username: msg.username || "Unknown",
    }));
    setGroupMessages(normalizedMessages);

    socket.connect();
    socket.emit("join-group", groupId);

    socket.on("received-message", (msg) => {
      // handle only messages meant for this group
      if (msg?.message?.receiverGroup === groupId) {
        setGroupMessages((prev) => [
          ...prev,
          {
            content: msg.message?.content,
            createdAt: msg.message?.createdAt,
            username: msg.username || "Unknown",
          },
        ]);
      }
    });

    

    return () => {
      socket.disconnect();
      socket.off("received-message");
    };
  }, [groupId, messages]);

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;

    const msg = {
      content: newMessage,
      receiver_id: groupId,
      isGroup: true,
    };

    socket.emit("send-message", msg);
    setNewMessage("");
    console.log(groupMessages);
    
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-2">Group: {groupname}</h2>
      <p className="mb-2 text-gray-600">
        <strong>Group ID:</strong> {groupId}
      </p>

      <div className="mb-4">
        <strong>Owner:</strong> {owner?.username || "Unknown"} ({owner?.email || "N/A"})
        <br />
        <strong>Admins:</strong>{" "}
        {admins?.length > 0 ? admins.map((a) => a.username).join(", ") : "None"}
        <br />
        <strong>Members:</strong>{" "}
        {members?.length > 0 ? members.map((m) => m.username).join(", ") : "None"}
      </div>

      <div className="space-y-4 max-h-[400px] overflow-y-auto mb-4 border p-2 rounded">
        {groupMessages.length === 0 ? (
          <p className="text-gray-500">No messages yet.</p>
        ) : (
          groupMessages.map((msg, index) => (
            <div key={index} className="p-3 border rounded bg-gray-50">
              <p>
                <strong>{msg.username}</strong>: {msg.content || "No message"}
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
          ))
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

export default GroupPage;
