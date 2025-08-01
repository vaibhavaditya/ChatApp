import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import mongoose, { isValidObjectId } from "mongoose";
import { Message } from "../models/message.model.js";

const fetchAllUsersAndGroups = asyncHandler(async (req, res) => {
    const userId = req.user._id;

    const allUsersAndGroups = await Message.aggregate([
        {
            $match: {
                $or: [
                    { sender: userId },
                    { receiverUser: userId },
                    { receiverGroup: { $exists: true } }
                ]
            }
        },
        // Sender details
        {
            $lookup: {
                from: "users",
                localField: "sender",
                foreignField: "_id",
                as: "senderDetails"
            }
        },
        {
            $unwind: {
                path: "$senderDetails",
                preserveNullAndEmptyArrays: true
            }
        },
        // Receiver user details
        {
            $lookup: {
                from: "users",
                localField: "receiverUser",
                foreignField: "_id",
                as: "receiverUserDetails"
            }
        },
        {
            $unwind: {
                path: "$receiverUserDetails",
                preserveNullAndEmptyArrays: true
            }
        },
        // Group details
        {
            $lookup: {
                from: "groups",
                localField: "receiverGroup",
                foreignField: "_id",
                as: "groupDetails"
            }
        },
        {
            $unwind: {
                path: "$groupDetails",
                preserveNullAndEmptyArrays: true
            }
        },
        {
            $match: {
                $or: [
                    { receiverGroup: null },
                    { "groupDetails.members": userId },
                    { "groupDetails.owner": userId }
                ]
            }
        },
        {
            $project: {
                content: 1,
                createdAt: 1,
                sender: 1,
                receiverUser: 1,
                receiverGroup: 1,
                "senderDetails.username": 1,
                "senderDetails.email": 1,
                "receiverUserDetails.username": 1,
                "receiverUserDetails.email": 1,
                "groupDetails.name": 1,
                "groupDetails.members": 1,
                "groupDetails.admins": 1,
                "groupDetails.owner": 1
            }
        }
    ]);

    if (!allUsersAndGroups) {
        throw new ApiError(403, "Cannot find the users and groups");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, allUsersAndGroups, "All the users and groups"));
});

const fetchAllMessagesfromUser = asyncHandler(async (req, res) => {
    const { receiver_id } = req.params;
    const userId = req.user._id;

    if (!isValidObjectId(receiver_id)) {
        throw new ApiError(401, "Invalid receiver ID");
    }

    const messages = await Message.aggregate([
        {
            $match: {
                $or: [
                    { sender: userId, receiverUser: new mongoose.Types.ObjectId(receiver_id) },
                    { sender: new mongoose.Types.ObjectId(receiver_id), receiverUser: userId },
                ]
            }
        },
        {
            $sort: { createdAt: 1 }
        },
        // Lookup for senderDetails
        {
            $lookup: {
                from: "users",
                localField: "sender",
                foreignField: "_id",
                as: "senderDetails",
                pipeline: [
                    {
                        $project: {
                            username: 1,
                            email: 1
                        }
                    }
                ]
            }
        },
        {
            $unwind: "$senderDetails"
        },
        // Lookup for receiverUserDetails
        {
            $lookup: {
                from: "users",
                localField: "receiverUser",
                foreignField: "_id",
                as: "receiverUserDetails",
                pipeline: [
                    {
                        $project: {
                            username: 1,
                            email: 1
                        }
                    }
                ]
            }
        },
        {
            $unwind: {
                path: "$receiverUserDetails",
                preserveNullAndEmptyArrays: true // In case of group messages
            }
        },
        {
            $project: {
                sender: 1,
                receiverUser: 1,
                content: 1,
                createdAt: 1,
                senderDetails: 1,
                receiverUserDetails: 1
            }
        }
    ]);

    if (!Array.isArray(messages)) {
        throw new ApiError(403, "Pipelines cannot be created");
    }
    // console.log(messages);
    
    return res
        .status(200)
        .json(new ApiResponse(200, messages, "All the messages in the chat"));
});


const fetchAllMessagesfromGroup = asyncHandler(async (req, res) => {
    const { group_id } = req.params
    const userId = req.user._id

        
    if (!isValidObjectId(group_id)) {
        throw new ApiError(401, "Invalid receiver ID");
    }

    const groupMessages = await Message.aggregate([
        {
            $match:{ 
                receiverGroup: new mongoose.Types.ObjectId(group_id),   
            }
        },
        {
            $sort: {createdAt : 1}
        },
        {
            $lookup:{
                from: "users",
                localField: "sender",
                foreignField: "_id",
                as: "senderDetails",
                pipeline:[
                    {
                        $project:{
                            username: 1,
                            email: 1,
                        }
                    }
                ]
            }
        },
        {
             $unwind: {
                path: "$senderDetails",
                preserveNullAndEmptyArrays: true
            }
        },

        {
            $lookup:{
                from : "groups",
                localField: "receiverGroup",
                foreignField: "_id",
                as: "groupDetails",
                pipeline:[
                    {
                        $project:{
                            name: 1,
                            owner: 1,
                            admins: 1,
                            members:1
                        }
                    }
                ]
            }
        },
        {
             $unwind: {
                path: "$groupDetails",
                preserveNullAndEmptyArrays: true
            }
        },
        {
            $addFields: {
                senderRole: {
                    $cond: {
                        if: { $eq: ["$sender", "$groupDetails.owner"] },
                        then: "owner",
                        else: {
                        $cond: {
                            if: { $in: ["$sender", "$groupDetails.admins"] },
                            then: "admin",
                            else: "member"
                            }
                        }
                    }
                }   
            }
        },
        {
            $project:{
                _id: 1,
                sender: 1,
                receiverGroup: 1,
                createdAt: 1,
                content: 1,
                senderDetails: 1,
                senderRole: 1
            }
        }

    ])

    if(!Array.isArray(groupMessages)){
        throw new ApiError(403,"Pipelines cannot be created")
    }

    return res
    .status(200)
    .json(new ApiResponse(200,groupMessages,"All the messages in the chat"));

}); 

const sendMessageToUser = asyncHandler(async (req, res) => {
    const { receiver_id } = req.params
    const {text} = req.body
    
    if(!isValidObjectId(receiver_id)){
        throw new ApiError(401,"Invalid reciever Id")
    }

    if(!text || text.trim()===""){
        throw new ApiError(402,"Need some text to send")
    }

    const chat = await Message.create({
        sender: req.user._id,
        receiverUser: receiver_id,
        content: text.trim()
    })

    return res
    .status(200)
    .json(new ApiResponse(200, chat, "Message sent successfully"));
});

const removeUserMessage = asyncHandler(async (req, res) => {
    const { chat_id } = req.params

    if(!isValidObjectId(chat_id)){
        throw new ApiError(401,"Invalid message Id")
    }

    // only the sender can delete the message not even the recieved user
    const chat = await Message.findOneAndDelete({
        _id: chat_id,
        sender: req.user._id
    })

    // const chat = await Message.findByIdAndDelete(chat_id);

    if(!chat){
        throw new ApiError(403,"Cannot find the chat to delete")
    }

    return res
    .status(200)
    .json(new ApiResponse(200,chat,"chat deleted"))
});

const sendMessageToGroup = asyncHandler(async (req, res) => {    
    const { group_id } = req.params;
    const { text } = req.body;

    if(!isValidObjectId(group_id)){
        throw new ApiError(401,"Invalid group Id")
    }

    if(!text || text.trim()===""){        
        throw new ApiError(402,"Need some text to send")
    }

    const groupChat = await Message.create({
        sender: req.user._id,
        receiverGroup: group_id,
        content: text
    })

    // console.log(groupChat);
    
    if(!groupChat){
        throw new ApiError(403,"Cannot send message in the group")
    }

    return res
    .status(200)
    .json(new ApiResponse(200,groupChat,"Message sent in your group chat"))
});

const removeGroupMessage = asyncHandler(async (req, res) => {
    // const { group_id } = req.params
    const {message_id} = req.params
    if(!isValidObjectId(message_id)){
        throw new ApiError(401,"Invalid message Id")
    }

    const groupChat = await Message.findOneAndDelete({
        _id: message_id,
        sender: req.user._id,   
    })

    if(!groupChat){
        throw new ApiError(403,"Cannot find the message to delete in the group")
    }

    return res
    .status(200)
    .json(new ApiResponse(200,groupChat,"Your message deleted in your group chat"))
});

export {
    fetchAllUsersAndGroups,
    fetchAllMessagesfromUser,
    fetchAllMessagesfromGroup,
    sendMessageToUser,
    sendMessageToGroup,
    removeGroupMessage,
    removeUserMessage   
};