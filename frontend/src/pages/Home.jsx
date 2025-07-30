import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const Home = () => {
  const [latestMessages, setLatestMessages] = useState({});
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const res = await axios.get("/api/messages", {
          withCredentials: true,
        });

        const rawMessages = res.data.data;

        const groupedMessages = {};
        console.log("response: ",rawMessages);
        
        rawMessages.forEach(detail => {
          const username = detail?.senderDetails?.username;
          const email = detail?.senderDetails?.email 
          const receiver = detail?.receiverUser
          const sender = detail?.sender 

          const groupname = detail?.groupDetails?.name;  
          const groupId = detail?.receiverGroup 
          const members = detail?.groupDetails?.members;
          const admins = detail?.groupDetails?.admins;
          // console.log(admins);
          
          const owner = detail?.groupDetails?.owner;
          if(username && !groupname){
              if(groupedMessages[sender]===undefined){
                groupedMessages[sender] = []
              }
              groupedMessages[sender].push({
                message:{
                  content: detail.content,
                  sender: sender,
                  receiverUser: receiver,
                  createdAt: detail.createdAt
                },
                username: username,
                email: email,
              })
          }

          if(groupname){
            
              if (!groupedMessages[groupId]) {
                groupedMessages[groupId] = {
                  messages: [],
                  groupname,
                  groupId,
                  members,
                  admins,
                  owner,
                };
              }

              groupedMessages[groupId].messages.push({
                message:{
                  content: detail.content,
                  sender: sender,
                  createdAt: detail.createdAt,
                  receiverGroup: groupId
                },
                username,
                email,
              })
          }
        });
        console.log(groupedMessages);
        setLatestMessages(groupedMessages)      
      } catch (err) {
        const statuscode = err.response?.statuscode;
        const message = err.response?.data?.message;
        
        if (statuscode === 401) {
          navigate("/login");
        } else {
          setError(message || "Something went wrong");
        }
      }
    };

    fetchMessages();
  }, []);

  return (
  <div className="p-6">
    <h1 className="text-2xl font-bold mb-4">Conversations</h1>
    {error && <p className="text-red-500 mb-4">{error}</p>}

    {Object.keys(latestMessages).length === 0 ? (
      <p>No messages found.</p>
    ) : (
      <ul className="space-y-4">
        {Object.entries(latestMessages).map(([key, data]) => {
          const isGroup = Array.isArray(data); // private chat
          
          if (isGroup) {
            const lastMessage = data[data.length - 1];
            return (
              <li
                key={key}
                className="p-4 border rounded shadow-sm cursor-pointer hover:bg-gray-50"
                onClick={() =>
                  navigate(`/chat/${key}`, {
                    state: {
                      userId: key,
                      username: lastMessage.username,
                      email: lastMessage.email,
                      messages: data,
                      sender: lastMessage.sender,
                      receiverUser: lastMessage.receiverUser
                    },
                  })
                }
              >
                <p>
                  <strong>From:</strong> {lastMessage.username}
                </p>
                <p>
                  <strong>To me</strong>
                </p>
                <p>
                  <strong>Message:</strong> {lastMessage.message.content}
                </p>
                <p className="text-sm text-gray-500">
                  Sent on:{" "}
                  {new Date(lastMessage.message.createdAt).toLocaleString("en-IN", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </p>
              </li>
            );
          } else {
            const lastMessage = data.messages[data.messages.length - 1];
            return (
              <li
                key={key}
                className="p-4 border rounded shadow-sm cursor-pointer hover:bg-gray-50"
                onClick={() =>
                  navigate(`/group/${key}`, {
                    state: {
                      groupId: key,
                      groupname: data.groupname,
                      messages: data.messages,
                      members: data.members,
                      admins: data.admins,
                      owner: data.owner,
                    },
                  })
                }
              >
                <p>
                  <strong>From:</strong> {lastMessage.username}
                </p>
                <p>
                  <strong>To (Group):</strong> {data.groupname}
                </p>
                <p>
                  <strong>Message:</strong> {lastMessage.message.content}
                </p>
                <p className="text-sm text-gray-500">
                  Sent on:{" "}
                  {new Date(lastMessage.message.createdAt).toLocaleString("en-IN", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </p>
              </li>
            );
          }
        })}
      </ul>
    )}
  </div>
);

};

export default Home;
