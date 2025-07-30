import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";
import {ApiError} from "../utils/ApiError.js";
import {ApiResponse} from "../utils/ApiResponse.js";

const registerUser = asyncHandler(async (req,res)=>{
    const {username,email,password} = req.body;
    // console.log(username);
    
    if([username,email,password].some((val) => val.trim()) === ""){
        throw new ApiError(400,"Need all credentials given in the input")
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
        password
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

export {
    registerUser,
    loginUser,
    logoutUser
}