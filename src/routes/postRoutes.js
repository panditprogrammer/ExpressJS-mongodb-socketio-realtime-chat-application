import express from 'express';
import { createPost, deletePost, getPostById, getPostes, updatePost } from '../controllers/postController.js';
import verifyJWT, { isVerified } from '../middlewares/authMiddleware.js';


const postRouter = express.Router();


postRouter.route("/").get(getPostes);
postRouter.route("/edit/:id").get(verifyJWT, isVerified, getPostById);
postRouter.route("/").post(verifyJWT, isVerified, createPost);
postRouter.route("/:id").put(verifyJWT, isVerified, updatePost);
postRouter.route("/:id").delete(verifyJWT, isVerified, deletePost);


export default postRouter;
