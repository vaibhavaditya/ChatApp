import jwt from "jsonwebtoken"
import { Message } from "../models/message.model.js"
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { Group } from "../models/groups.model.js";
import cookie from 'cookie'
// const connectedUser = new Map();

const setupSocket = asyncHandler( (io)=>{
    io.use((socket,next)=>{
        // console.log(socket.handshake);
        
        const cookieHeader  = socket.handshake?.headers?.cookie;
        // console.log(cookieHeader);
        
        if(!cookieHeader){
            throw new ApiError(401,"No cokkies");
        }
        const cookies = cookie.parse(cookieHeader);
        const token = cookies.accessToken
      
        if(!token){
            throw new ApiError(402,"Invalid Token")
        }

        const decodedToken = jwt.verify(token,process.env.ACCESS_TOKEN_SECRET)
        socket.user = decodedToken;
        next();
    })

    io.on("connection",async (socket)=>{
        const userId = socket.user
        socket.join(userId._id)
        console.log(`User connected: ${userId.username}`);

        const groups = await Group.find({
            $or:[
                {members: userId._id},
                {admins: userId._id},
                {owner: userId._id}
            ]
        })

        groups.forEach((group)=>{
            socket.join(group._id.toString())
        })

        socket.on("join-group",(groupId)=>{
            socket.join(groupId)
        })

        socket.on("send-message", async(data)=>{
            // console.log(data);
            
            const {content, receiver_id, isGroup} = data;

            const message = await Message.create({
                content,
                sender: userId._id,
                ...(isGroup?{receiverGroup: receiver_id}: {receiverUser: receiver_id})
            })

            // console.log(message);
            
            const messageDeatils = {
                message,
                username: userId.username,
                email: userId.email
            }
            
            // console.log(messageDeatils);

            io.to(receiver_id).emit("received-message",messageDeatils);
            if(!isGroup) io.to(userId._id).emit("received-message",messageDeatils)
        })

    })
})

export {setupSocket}