import { Router } from "express";
import { isLoggedIn } from "../middlewares/auth.middleware.js";
import { fetchAllMessagesfromGroup, fetchAllMessagesfromUser, fetchAllUsersAndGroups, removeGroupMessage, removeUserMessage, sendMessageToGroup, sendMessageToUser } from "../controllers/message.controller.js";


const router = Router();

router.use(isLoggedIn);

router.route('/').get(fetchAllUsersAndGroups)
router.route('/user/:receiver_id').get(fetchAllMessagesfromUser).post(sendMessageToUser)
router.route('/user/del/:chat_id').delete(removeUserMessage)
router.route('/group/:group_id').get(fetchAllMessagesfromGroup).post(sendMessageToGroup)
router.route('/group/del/:message_id').delete(removeGroupMessage)


export default router