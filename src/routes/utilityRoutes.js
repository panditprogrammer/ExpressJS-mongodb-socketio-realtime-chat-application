import express from 'express';
import verifyJWT, { isVerified } from "../middlewares/authMiddleware.js";
import { uploadFile } from "../controllers/utilityController.js";
import upload from '../middlewares/multerMiddleware.js';


const utilityRouter = express.Router();

// file upload route for global 
utilityRouter.route("/upload/post-image-video").post(verifyJWT, isVerified, upload.single('postImageVideo'), uploadFile);

export default utilityRouter;
