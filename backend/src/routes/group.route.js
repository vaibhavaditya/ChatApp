import { Router } from "express";
import { isLoggedIn } from "../middlewares/auth.middleware.js";
import { 
    createGroup,
    AddMembersToGroup,
    removeMembersToGroup,
    promoteToGroupAdmin,
    removeFromGroupAdmin,
    removeAdminfromGroup,
    deleteGroup
} from "../controllers/group.controller.js";
import { checkOwner } from "../middlewares/owner.middleware.js";
import { Group } from "../models/groups.model.js";

const router = Router();

router.use(isLoggedIn);

router.route('/createGroup').post(createGroup)

router.route('/members/:group_id/:member_id').patch(checkOwner(Group,'params.group_id',"owner"),AddMembersToGroup).delete(checkOwner(Group,'params.group_id',"owner"),removeMembersToGroup)

router.route('/admins/:group_id/:member_id').patch(checkOwner(Group,'params.group_id',"owner"),promoteToGroupAdmin).delete(checkOwner(Group,'params.group_id',"owner"),removeFromGroupAdmin);

router.route('/admins/remove/:group_id/:admin_id').delete(checkOwner(Group,'params.group_id',"owner"),removeAdminfromGroup)

router.route('/deleteGroup/:group_id').delete(checkOwner(Group,'params.group_id',"owner",true),deleteGroup);

export default router
