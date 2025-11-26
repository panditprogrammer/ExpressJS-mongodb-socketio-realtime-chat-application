import express from 'express';
import { homePage } from "../controllers/pagesController.js";


const pagesRouter = express.Router();
// index page 
pagesRouter.route("/").get(homePage);


export default pagesRouter;
