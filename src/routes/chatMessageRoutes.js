import express from 'express';
import { getChatHistory } from "../controllers/chatMessageController.js";
import verifyJWT, { isVerified } from '../middlewares/authMiddleware.js';

const chatMessageRouter = express.Router();


chatMessageRouter.route("/messages/:friendId").get(verifyJWT,isVerified,getChatHistory);


export default chatMessageRouter;
