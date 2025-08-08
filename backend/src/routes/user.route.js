import { Router } from "express";
import { loginUser, logoutUser, registerUser, getCurrentUser,getUserDetails,searchUsers, getUserPublicKey} from "../controllers/user.controller.js";
import { isLoggedIn } from "../middlewares/auth.middleware.js";

const router = Router();

router.route('/register').post(registerUser)
router.route('/login').post(loginUser)
router.route('/logout').post(isLoggedIn,logoutUser)
router.route('/me').get(isLoggedIn,getCurrentUser)
// router.route('/:userId').get(isLoggedIn,getUserDetails)
router.route('/search').get(isLoggedIn,searchUsers)
router.route('/publicKey/:username').get(getUserPublicKey)


export default router;