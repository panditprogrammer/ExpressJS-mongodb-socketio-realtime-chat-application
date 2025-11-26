import { Router } from "express";
import { deleteUserAccount, getAllUsers, dashboard, getFriends,checkFriends, logoutUser, refreshAccessToken,  updateUser, userProfile, registerWithSocial, updateUserProfile, getCurrentUser,  searchAndSelectUser, changeUserStatus, loginUser } from "../controllers/userController.js";

import verifyJWT, { checkPermission, isVerified, redirectIfAuthenticated } from "../middlewares/authMiddleware.js";
import { userNotifications } from "../controllers/notificationController.js"


const userRouter = Router();

userRouter.route("/users/:id?").get(verifyJWT, isVerified,  getAllUsers)

userRouter.route("/auth/get").get(verifyJWT, getCurrentUser);

// friends 
userRouter.route("/me/friends-data").get(verifyJWT, getFriends);
userRouter.route("/check-friendship/:postOwnerId").get(verifyJWT, checkFriends);



userRouter.route("/users/:id?").delete(verifyJWT, isVerified, checkPermission("delete_user"), deleteUserAccount)
userRouter.route("/update/:userId?").put(verifyJWT, isVerified, checkPermission("update_user"), updateUser)

userRouter.route("/status/:userId").put(verifyJWT, isVerified, checkPermission('restrict_user'), changeUserStatus)
userRouter.route("/search/select").get(verifyJWT, isVerified, searchAndSelectUser)

// user dashbaord 
userRouter.route("/dashboard").get(verifyJWT, isVerified, dashboard)
userRouter.route("/profile").get(verifyJWT, isVerified, userProfile)
userRouter.route("/profile").post(verifyJWT, isVerified, updateUserProfile)


userRouter.route("/notifications").get(verifyJWT, userNotifications)


// ================== user auth routes  ================== 
// by google register avatar is not required  
userRouter.route("/register/social").get(redirectIfAuthenticated, registerWithSocial);
userRouter.route("/register/social").post(registerWithSocial);

userRouter.route("/login").get(redirectIfAuthenticated, loginUser)
userRouter.route("/logout").post(verifyJWT, logoutUser)
userRouter.route("/refresh-token").post(refreshAccessToken)


export default userRouter;