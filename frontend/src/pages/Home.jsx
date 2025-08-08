import React, { useEffect, useState, useRef } from "react";
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
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [groupToConfirmDelete, setGroupToConfirmDelete] = useState(null); // ✅

  const navigate = useNavigate();
  const searchContainerRef = useRef(null);

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

        const oneToOneMap = {};
        const groupChats = {};

        for (const msg of rawMessages) {
          if (!msg.sender || !msg.createdAt) continue;

          if (msg.receiverUser) {
            const userA = msg.sender;
            const userB = msg.receiverUser;
            const otherUserId = userA === myId ? userB : userA;

            if (otherUserId === myId) continue;

            const key = [myId, otherUserId].sort().join("-");

            if (
              !oneToOneMap[key] ||
              new Date(msg.createdAt) > new Date(oneToOneMap[key].createdAt)
            ) {
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

            if (
              !groupChats[groupId] ||
              new Date(msg.createdAt) > new Date(groupChats[groupId].createdAt)
            ) {
              groupChats[groupId] = {
                ...msg,
                groupId,
                groupName: msg.groupDetails?.name || "Unnamed Group",
              };
            }
          }
        }

        const oneToOneList = Object.values(oneToOneMap).sort(
          (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
        );

        const groupList = Object.values(groupChats).sort(
          (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
        );

        setConversations({
          oneToOne: oneToOneList,
          groupChats: groupList,
        });
      } catch (err) {
        if (err.response?.status === 401) {
          navigate("/login");
          return;
        }
        setError("Failed to load messages");
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();
  }, []);

  useEffect(() => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }

    const searchUsers = async () => {
      try {
        setIsSearching(true);
        const res = await axios.get(
          `/api/users/search?username=${searchTerm}`,
          { withCredentials: true }
        );
        const filteredResults = res.data.data.filter(
          (user) => user._id !== currentUserId
        );
        setSearchResults(filteredResults);
      } catch (err) {
        console.error("Search error:", err);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    };

    const timerId = setTimeout(searchUsers, 300);
    return () => clearTimeout(timerId);
  }, [searchTerm, currentUserId]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target)
      ) {
        setSearchTerm("");
        setSearchResults([]);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getAvatar = (name) => {
    const names = name.split(" ");
    return names.map((n) => n[0]).join("").toUpperCase();
  };

  const handleUserClick = (userId, username) => {
    navigate(`/chat/${userId}`, {
      state: {
        receiver_id: userId,
        username: username,
        isGroup: false,
      },
    });
    setSearchTerm("");
    setSearchResults([]);
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) return;

    try {
      setCreatingGroup(true);
      const res = await axios.post(
        "/api/groups/createGroup",
        { name: newGroupName },
        { withCredentials: true }
      );

      const newGroup = res.data.data;

      setConversations((prev) => ({
        ...prev,
        groupChats: [
          {
            _id: newGroup._id,
            groupId: newGroup._id,
            groupName: newGroup.name,
            content: "Group created",
            createdAt: new Date().toISOString(),
            senderDetails: { username: "You" },
          },
          ...prev.groupChats,
        ],
      }));

      navigate(`/group/${newGroup._id}`, {
        state: {
          receiver_id: newGroup._id,
          groupName: newGroup.name,
          isGroup: true,
        },
      });
    } catch (err) {
      console.error("Failed to create group", err);
    } finally {
      setCreatingGroup(false);
      setNewGroupName("");
    }
  };

  const deleteGroup = async (groupId) => {
    try {
      await axios.delete(`/api/groups/deleteGroup/${groupId}`, {
        withCredentials: true,
      });

      setConversations((prev) => ({
        ...prev,
        groupChats: prev.groupChats.filter(
          (group) => group.groupId !== groupId
        ),
      }));

      setGroupToConfirmDelete(null);
    } catch (error) {
      console.error("Failed to delete group", error);
    }
  };

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <header className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
          Latest Conversations
        </h1>
        <div className="w-16 h-1 bg-indigo-500 mt-2 rounded-full"></div>
      </header>

      {/* Search Bar */}
      <div className="relative mb-8" ref={searchContainerRef}>
        <input
          type="text"
          placeholder="Search users..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />

        {searchTerm && (
          <div className="absolute top-full left-0 right-0 bg-white shadow-lg rounded-lg mt-1 max-h-60 overflow-auto z-10">
            {isSearching ? (
              <div className="p-4 text-center">
                <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-indigo-500 mx-auto"></div>
              </div>
            ) : searchResults.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                No users found
              </div>
            ) : (
              searchResults.map((user) => (
                <div
                  key={user._id}
                  className="p-3 hover:bg-gray-100 cursor-pointer flex items-center space-x-3"
                  onClick={() => handleUserClick(user._id, user.username)}
                >
                  <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                    <span className="text-indigo-700 font-bold">
                      {getAvatar(user.username)}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{user.username}</p>
                    <p className="text-sm text-gray-500">{user.email}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

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
                            {formatDistanceToNow(new Date(msg.createdAt), {
                              addSuffix: true,
                            })}
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

            {/* Create Group Input */}
            <div className="flex items-center space-x-2 mb-4">
              <input
                type="text"
                placeholder="Enter group name..."
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400"
              />
              <button
                onClick={handleCreateGroup}
                disabled={creatingGroup}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50"
              >
                {creatingGroup ? "Creating..." : "Create Group"}
              </button>
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
                    className="bg-white rounded-xl shadow-sm p-4 border border-gray-100"
                  >
                    <div
                      className="cursor-pointer"
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
                            <span className="text-green-700 font-bold text-lg">
                              G
                            </span>
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start">
                            <h3 className="font-semibold text-gray-900 truncate">
                              {msg.groupName}
                            </h3>
                            <span className="text-xs text-gray-400 whitespace-nowrap ml-2">
                              {formatDistanceToNow(new Date(msg.createdAt), {
                                addSuffix: true,
                              })}
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

                    {/* ✅ Delete/Confirm UI */}
                    <div className="mt-3 flex justify-end">
                      {groupToConfirmDelete === msg.groupId ? (
                        <div className="flex gap-2">
                          <button
                            onClick={() => deleteGroup(msg.groupId)}
                            className="text-sm px-3 py-1 rounded-md bg-red-600 text-white hover:bg-red-700 transition"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => setGroupToConfirmDelete(null)}
                            className="text-sm px-3 py-1 rounded-md bg-gray-200 text-gray-700 hover:bg-gray-300 transition"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setGroupToConfirmDelete(msg.groupId)}
                          className="text-sm px-3 py-1 rounded-md bg-red-100 text-red-600 hover:bg-red-200 transition"
                        >
                          Delete Group
                        </button>
                      )}
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
