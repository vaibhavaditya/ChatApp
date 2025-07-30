import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Group } from "../models/groups.model.js";
import {isValidObjectId} from "mongoose";

const createGroup = asyncHandler(async (req, res) => {
    const { name } = req.body;
    if (!name) {
        throw new ApiError(401, "Group name is needed");
    }

    const group = await Group.create({
        name,
        owner: req.user._id,
    });

    return res
        .status(201) 
        .json(new ApiResponse(201, group, "Group created"));
});

const AddMembersToGroup = asyncHandler(async (req, res) => {
    const { member_id } = req.params;
    const group = req.resource;
    console.log(group);
    if (!isValidObjectId(member_id)) {
        throw new ApiError(400, "Invalid member ID");
    }
    if (group.members?.some(_id => _id.equals(member_id))) {
        throw new ApiError(401, "User already exists");
    }

    group.members.push(member_id);
    await group.save();

    return res
        .status(200) 
        .json(new ApiResponse(200, group, "You were added to the group"));
});

const removeMembersToGroup = asyncHandler(async (req, res) => {
    const { member_id } = req.params;
    const group = req.resource;

    if (!isValidObjectId(member_id)) {
        throw new ApiError(400, "Invalid member ID");
    }

    //if user exist in group
    if (!group.members?.some(_id => _id.equals(member_id))) {
        throw new ApiError(401, "User does not exist");
    }

    // the member might be a admin so only the owner can remove him
    if(group.admins?.some(_id => _id.equals(member_id))){
        if(group?.owner.equals(req.user._id)){
            group.admins.pull(member_id);
        } else{
            throw new ApiError(403,"Only owner can remove a admin from group")
        }
    }
    group.members.pull(member_id);
    await group.save({ validateBeforeSave: false });

    return res
        .status(200) 
        .json(new ApiResponse(200, group, "You were removed from the group"));
});

const promoteToGroupAdmin = asyncHandler(async (req, res) => {
    const { member_id } = req.params;
    const group = req.resource;

    if (!isValidObjectId(member_id)) {
        throw new ApiError(400, "Invalid member ID");
    }

    if (!group.members?.some(_id => _id.equals(member_id))) {
        throw new ApiError(401, "User isn't a member to be promoted");
    }

    if (group.admins?.some(_id => _id.equals(member_id))) {
        throw new ApiError(401, "User is already an admin");
    }

    group.admins.push(member_id);
    await group.save({ validateBeforeSave: false });

    return res
        .status(200) 
        .json(new ApiResponse(200, group, "You were promoted to admin in the group"));
});

const removeFromGroupAdmin = asyncHandler(async (req, res) => {
    const { member_id } = req.params;
    const group = req.resource;

    if (!isValidObjectId(member_id)) {
        throw new ApiError(400, "Invalid member ID");
    }

    if (!group.admins?.some(_id => _id.equals(member_id))) {
        throw new ApiError(401, "User is not an admin");
    }

    if (!group.members?.some(_id => _id.equals(member_id))) {
        throw new ApiError(401, "User isn't a member to be demoted");
    }

    group.admins.pull(member_id);
    await group.save({ validateBeforeSave: false });

    return res
        .status(200) 
        .json(new ApiResponse(200, group, "You were demoted to member from admin in the group"));
});

//remove admin fom group
const removeAdminfromGroup = asyncHandler(async (req,res)=>{
    const {admin_id} = req.params

    if (!isValidObjectId(admin_id)) {
        throw new ApiError(400, "Invalid admin ID");
    }

    const group = req.resource;
    if(!group.admins?.some(_id => _id.equals(admin_id))){
        throw new ApiError(403,"the user isnt present as a admin")
    }

    if(!group?.owner.equals(req.user._id)){
        throw new ApiError(403,"Only owner can remove the admin from the group")
    }

    group.admins.pull(admin_id)
    group.members.pull(admin_id);
    
    await group.save({ validateBeforeSave: false });

    return res
    .status(200) 
    .json(new ApiResponse(200, group, "You were removed from the group by the owner"));

})

const deleteGroup = asyncHandler( async (req,res) => {
    const {group_id} = req.params
    if (!isValidObjectId(group_id)) {
        throw new ApiError(400, "Invalid group ID");
    }

    const group = req.resource

    const deletedGroupDetails = await group.deleteOne();

    return res
    .status(200)
    .json(new ApiResponse(200,deletedGroupDetails,"Group deleted"))

})
export {
    createGroup,
    AddMembersToGroup,
    removeMembersToGroup,
    promoteToGroupAdmin,
    removeFromGroupAdmin,
    removeAdminfromGroup,
    deleteGroup
};
