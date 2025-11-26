import express from 'express';
import verifyJWT, { isVerified } from "../middlewares/authMiddleware.js";
import { getFriendRequests } from '../controllers/friendRequestController.js';

const friendRequestRouter = express.Router();

// file upload route for global 
friendRequestRouter.route("/pending").get(verifyJWT, isVerified, getFriendRequests);

export default friendRequestRouter;
