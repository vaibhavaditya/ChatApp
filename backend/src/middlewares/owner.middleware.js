import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const getValueFromPath = (path,req) => { 
    const keys = path.split('.')
    let val = req;
    for(const key of keys){
        if(val[key]==undefined) return undefined;
        val = val[key];
    }

    return val;
}

export const checkOwner = (Model,idpath,ownerFeild="owner",deleteGrp=false) => asyncHandler(async (req,_,next) => {
    const required_id = getValueFromPath(idpath,req);

    if(required_id==undefined){
        throw new ApiError(401,"Invalid Id given as a parameter")
    }

    const modelDetails = await Model.findById(required_id);
    if(!modelDetails){
        throw new ApiError(404,"Cannot find the group")
    }

    if(!modelDetails[ownerFeild]?.equals(req.user._id)){
        //only for admins if my model is group
        if(Model.modelName === "Group"){
            if(!deleteGrp){
                if(!(modelDetails.admins?.some((_id) =>  _id.equals(req.user._id)))){
                throw new ApiError(403,"You are not eligible")
                }
            }
        }
    }

    req.resource = modelDetails;
    // console.log(modelDetails);
    
    next();
}) 