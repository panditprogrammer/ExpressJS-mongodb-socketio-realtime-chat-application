import jwt from "jsonwebtoken";
import { asyncHandler } from "../utilities/asyncHandler.js";
import { User } from "../models/userModel.js";
import { ApiError, isApiRequest } from "../utilities/apiResponse.js";
import { refreshAccessToken } from "../controllers/userController.js";

// verify jwt and add user to request 
const verifyJWT = asyncHandler(async (req, res, next) => {
    // if user if logged in 
    const authUser = req.user;

    if (!authUser) {
        res.locals.message.text = "Unauthorized request";
        if (isApiRequest(req.originalUrl))
            return res.status(401).json(new ApiError(401, res.locals.message.text));
        return res.redirect("/users/login");
    }
    next();
});


// Middleware to check if user is logged in
function redirectIfAuthenticated(req, res, next) {
    if (req.user) {
        return res.redirect('/');
    }
    next();
}


// Middleware to check if user is verified 
function isVerified(req, res, next) {

    const user = req.user;

    // Check if the user is admin
    if (user?.role === 'admin') {
        return next();
    }

    if (!user.email_verified_at) {
        res.locals.message.text = "Account verification required!";
        if (isApiRequest(req.originalUrl))
            return res.status(409).json(new ApiError(409, res.locals.message.text));
        return res.redirect("/users/account-verification");
    }
    next();
}

const globalAuthCheck = asyncHandler(async (req, res, next) => {
    let token;

    // Get token from cookies or Authorization header
    if (req.cookies?.accessToken) {
        token = req.cookies.accessToken;
    } else if (req.header("Authorization")?.startsWith("Bearer ")) {
        token = req.header("Authorization").split(" ")[1]; // More robust split
    }


    // Initialize user-related data to null
    // req.session.user = null;
    req.user = null;
    res.locals.user = null;
    // req.session.userBusiness = null;
    req.userBusiness = null;
    res.locals.userBusiness = null;
    // req.session.driver = null;
    req.driver = null;
    res.locals.driver = null;

    if (token) {
        try {
            // Verify token
            const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

            // Find user with the token
            const user = await User.findById(decodedToken?._id).select("-password");
            
            if (user) {
              

                if(!isApiRequest(req.originalUrl)){
                    const notifications = await user.getNotifications();
                    user.notifications = notifications;
                }

                // req.session.user = user;
                req.user = user;
                res.locals.user = user;

               

              
            }
        } catch (error) {
            // Token verification failed, clear user data
            console.error("JWT Verification Error:", error.message);
            // Optionally log the error in more detail

            // req.session.user = null;
            req.user = null;
            res.locals.user = null;
            // req.session.userBusiness = null;
            req.userBusiness = null;
            res.locals.userBusiness = null;
            // req.session.driver = null;
            req.driver = null;
            res.locals.driver = null;
            // Note: We still call next() to allow the request to proceed,
            // potentially to an unauthenticated route or error handler.

        }
    } else {
        // Get refresh token from cookies or Authorization header and auto renew accesstoken if expired
        let token;
        if (req.cookies?.refreshToken) {
            token = req.cookies.refreshToken;
        } else if (req.header("Authorization")?.startsWith("Bearer ")) {
            token = req.header("Authorization").split(" ")[1]; // More robust split
        }
        if (token) {
            return refreshAccessToken(req, res, next);
        }


    }

    next();
});

// check if user has permission
const checkPermission = (permission) => {
    return asyncHandler(async (req, res, next) => {
        // Check if the user has permission
        const hasPermission = await req.user?.hasPermission(permission);

        // If the user doesn't have permission
        if (!hasPermission) {
            if (isApiRequest(req.originalUrl)) {
                return res.status(403).json(new ApiError(403, "You don't have permission to " + permission.replace("_", " ")));
            }
            return res.redirect("/users/dashboard");
        }

        // If the user has permission, proceed to the next middleware
        next();
    });
};


const verifySocketJWT = async (token) => {
    if (!token) throw new Error("Token missing");

    // Verify token
    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    // Find user with the token
    const user = await User.findById(decodedToken?._id);

    if (!user) throw new Error("User not found");

    return {
        id: user._id.toString(),
        fullName: user.fullName,
        onlineStatus: user.onlineStatus,
    };
};


export { verifyJWT as default, redirectIfAuthenticated, isVerified, globalAuthCheck, checkPermission, verifySocketJWT };
