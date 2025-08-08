import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";
import {ApiError} from "../utils/ApiError.js";
import {ApiResponse} from "../utils/ApiResponse.js";
import { isValidObjectId } from "mongoose";

const registerUser = asyncHandler(async (req,res)=>{
    const {username,email,password,publicKey} = req.body;
    // console.log(username);
    
    if([username,email,password,publicKey].some((val) => val.trim() === "")){
        throw new ApiError(400,"Need all credentials given in the input, including publicKey")
    }

    const existed = await User.findOne({
        $or:[{username},{email}]
    })

    if(existed){
        throw new ApiError(409,"User already exist");
    }

    const user = await User.create({
        username,
        email,
        password,
        publicKey
    }).select("-password")

    if(!user){
        throw new ApiError(504,"Cannot created at this momemt please try again")
    }

    return res
    .status(201)
    .json(new ApiResponse(201,user,"Created Succesfully"));
})

const loginUser = asyncHandler(async (req,res)=>{
    const {username, password} = req.body

    if([username,password].some((val)=>val?.trim()==="")){
        throw new ApiError(400,"Need both username and password  in the input")
    }

    const existedUser = await User.findOne({username});
    if(!existedUser){
        throw new ApiError(404,"User does not exist")
    }

    const check = await existedUser.isPasswordCorrect(password);
    
    if(!check){
        throw new ApiError(401,"Invalid credentials");
    }

    const accessToken = existedUser.generateAccessToken();
    const refreshToken = existedUser.generateRefreshToken();
    existedUser.refreshToken = refreshToken;
    await existedUser.save({validateBeforeSave: false});

    const loginUser = await User.findById(existedUser._id)
    .select("-password -refreshToken")

    if(!loginUser){
        throw new ApiError(504,"Please try again")
    }

    const options = {
        httpOnly: true,
        secure: true,
        sameSite: 'strict'
    }

    return res
    .status(202)
    .cookie("accessToken",accessToken,options)
    .cookie("refreshToken",refreshToken,options)
    .json(new ApiResponse(202,loginUser,"Logged in  successfully"))
})

const logoutUser = asyncHandler(async (req,res)=>{
    
    const user = await User.findByIdAndUpdate(
        req.user._id,
        {
            $unset:{
                refreshToken: 1
            }
        },
        {
            new: true
        }
    )

    if(!user){
        throw new ApiError(404,"User not found")
    }
    
    const options = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(203)
    .clearCookie("accessToken",options)
    .clearCookie("refreshToken",options)
    .json(new ApiResponse(203,"User has been logout"))
})

const getCurrentUser = asyncHandler(async (req,res)=>{
    const user = req.user;
    return res
    .status(200)
    .json(new ApiResponse(200,user,"Your current user"))
})

const getUserDetails = asyncHandler(async (req,res)=>{
    const {userId} = req.params;
    if(!isValidObjectId(userId)){
        throw new ApiError(401,"Invalid User Id");
    }

    const user = await User.findById(userId).select("-password -accessToken");
    
    if(!user){
        throw new ApiError(404,"user not found");
    }

    return res
    .status(200)
    .json(new ApiResponse(200,user,"Fetched User Details"));

})

const searchUsers = asyncHandler(async (req, res) => {
  const { username } = req.query;

  if (!username || username.trim() === "") {
    throw new ApiError(400, "Username query is required");
  }

  const users = await User.find({
    username: { $regex: username, $options: 'i' }
  }).select("username email _id");

  return res.status(200).json(new ApiResponse(200, users, "Users fetched"));
});

const getUserPublicKey = asyncHandler(async (req, res) => {
    const { username } = req.params;
    if (!username || username.trim() === "") {
        throw new ApiError(400, "Username parameter is required");
    }
    const user = await User.findOne({ username }).select("publicKey");
    if (!user) {
        throw new ApiError(404, "User not found");
    }
    return res.status(200).json(new ApiResponse(200, { publicKey: user.publicKey }, "Fetched user public key"));
});

export {
    registerUser,
    loginUser,
    logoutUser,
    getCurrentUser,
    getUserDetails,
    searchUsers,
    getUserPublicKey
}