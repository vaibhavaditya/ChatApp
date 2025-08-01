import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { formatDistanceToNow } from "date-fns";

const Home = () => {
  const [conversations, setConversations] = useState({
    oneToOne: [],
    groupChats: [],
  });
  const [currentUserId, setCurrentUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        setLoading(true);
        const userRes = await axios.get("/api/users/me", {
          withCredentials: true,
        });
        const myId = userRes.data.data._id;
        setCurrentUserId(myId);

        const res = await axios.get("/api/messages", {
          withCredentials: true,
        });
        const rawMessages = res.data.data;
        // console.log("Response: ",rawMessages);
        
        const oneToOneMap = {};
        const groupChats = {};

        // Process messages
        for (const msg of rawMessages) {
          // Skip messages without required info
          if (!msg.sender || !msg.createdAt) continue;
          
          if (msg.receiverUser) {
            const userA = msg.sender;
            const userB = msg.receiverUser;
            const otherUserId = userA === myId ? userB : userA;
            
            // Skip self-messages
            if (otherUserId === myId) continue;
            
            const key = [myId, otherUserId].sort().join('-');
            
            if (!oneToOneMap[key] || new Date(msg.createdAt) > new Date(oneToOneMap[key].createdAt)) {
              oneToOneMap[key] = {
                ...msg,
                otherUserId,
                otherUser: 
                  msg.sender === myId 
                    ? msg.receiverUserDetails?.username || "Unknown" 
                    : msg.senderDetails?.username || "Unknown", 
              };
            }
          } else if (msg.receiverGroup) {
            const groupId = msg.receiverGroup;
            
            if (!groupChats[groupId] || new Date(msg.createdAt) > new Date(groupChats[groupId].createdAt)) {
              groupChats[groupId] = {
                ...msg,
                groupId,
                groupName: msg.groupDetails?.name || "Unnamed Group"
              };
            }
          }
        }

        // Convert to sorted arrays
        const oneToOneList = Object.values(oneToOneMap)
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        
        const groupList = Object.values(groupChats)
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        setConversations({
          oneToOne: oneToOneList,
          groupChats: groupList,
        });
      } catch (err) {
        console.error(err);
        setError("Failed to load messages");
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();
  }, []);

  // Generate avatar from username
  const getAvatar = (name) => {
    const names = name.split(' ');
    return names.map(n => n[0]).join('').toUpperCase();
  };

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <header className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
          Latest Conversations
        </h1>
        <div className="w-16 h-1 bg-indigo-500 mt-2 rounded-full"></div>
      </header>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
        </div>
      ) : error ? (
        <p className="text-red-500 text-center py-8">{error}</p>
      ) : (
        <div className="space-y-10">
          {/* One-to-One Chats */}
          <section className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-700">
                1-on-1 Chats
              </h2>
              <span className="bg-indigo-100 text-indigo-800 text-xs px-2.5 py-0.5 rounded-full">
                {conversations.oneToOne.length}
              </span>
            </div>

            {conversations.oneToOne.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-xl border border-dashed">
                <p className="text-gray-500">No personal chats yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {conversations.oneToOne.map((msg) => (
                  <div
                    key={msg._id}
                    className="bg-white rounded-xl shadow-sm p-4 cursor-pointer hover:shadow-md transition-all duration-200 border border-gray-100"
                    onClick={() =>
                      navigate(`/chat/${msg.otherUserId}`, {
                        state: {
                          receiver_id: msg.otherUserId,
                          username: msg.otherUser,
                          isGroup: false,
                        },
                      })
                    }
                  >
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center">
                          <span className="text-indigo-700 font-bold text-lg">
                            {getAvatar(msg.otherUser)}
                          </span>
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start">
                          <h3 className="font-semibold text-gray-900 truncate">
                            {msg.otherUser}
                          </h3>
                          <span className="text-xs text-gray-400 whitespace-nowrap ml-2">
                            {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}
                          </span>
                        </div>
                        <p className="text-gray-600 truncate mt-1 text-sm">
                          {msg.content}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Group Chats */}
          <section className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-700">
                Group Chats
              </h2>
              <span className="bg-green-100 text-green-800 text-xs px-2.5 py-0.5 rounded-full">
                {conversations.groupChats.length}
              </span>
            </div>

            {conversations.groupChats.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-xl border border-dashed">
                <p className="text-gray-500">No group conversations yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {conversations.groupChats.map((msg) => (
                  <div
                    key={msg._id}
                    className="bg-white rounded-xl shadow-sm p-4 cursor-pointer hover:shadow-md transition-all duration-200 border border-gray-100"
                    onClick={() =>
                      navigate(`/group/${msg.groupId}`, {
                        state: {
                          receiver_id: msg.groupId,
                          groupName: msg.groupName,
                          isGroup: true,
                        },
                      })
                    }
                  >
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                          <span className="text-green-700 font-bold text-lg">G</span>
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start">
                          <h3 className="font-semibold text-gray-900 truncate">
                            {msg.groupName}
                          </h3>
                          <span className="text-xs text-gray-400 whitespace-nowrap ml-2">
                            {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}
                          </span>
                        </div>
                        <p className="text-gray-600 truncate mt-1 text-sm">
                          <span className="font-medium text-indigo-600">
                            {msg.senderDetails?.username || "Someone"}:
                          </span>{" "}
                          {msg.content}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
};

export default Home; 