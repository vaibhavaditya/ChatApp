import { Router } from "express";
import { loginUser, logoutUser, registerUser, getCurrentUser} from "../controllers/user.controller.js";
import { isLoggedIn } from "../middlewares/auth.middleware.js";

const router = Router();

router.route('/register').post(registerUser)
router.route('/login').post(loginUser)
router.route('/logout').post(isLoggedIn,logoutUser)
router.route('/me').get(isLoggedIn,getCurrentUser)

export default router;