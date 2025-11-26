import express from 'express';
import { notificationMarkRead } from "../controllers/notificationController.js";
import verifyJWT, { checkPermission, isVerified } from "../middlewares/authMiddleware.js";
import { sendNotifications, userNotifications, notificationDelete } from '../controllers/notificationController.js';


const notificationRouter = express.Router();

// sent notifications to users
notificationRouter.route("/send").get(verifyJWT, isVerified, checkPermission("send_notifications"), sendNotifications)
notificationRouter.route("/send").post(verifyJWT, isVerified, checkPermission("send_notifications"), sendNotifications)
// get all user notification 

notificationRouter.route("/").get(verifyJWT, userNotifications)
// mark read 
notificationRouter.route("/read/:notificationId?").patch(verifyJWT, isVerified, notificationMarkRead);
// delete 
notificationRouter.route("/delete/:notificationId?").delete(verifyJWT, isVerified, notificationDelete);


export default notificationRouter;