import { asyncHandler } from "../utilities/asyncHandler.js";
import { ApiError } from "../utilities/apiResponse.js";

// verify jwt and add user to request 
const isEmailVerified = asyncHandler(async (req, res, next) => {
    // Check if the user is authenticated
    if (!req.user || req.user.email_verified_at === null) {
        return res.status(403).json(new ApiError(403, "Email is not verified"));
    }
    next();
});

// verify jwt and add user to request 
const isPhoneNumberVerified = asyncHandler(async (req, res, next) => {
    // Check if the user is authenticated
    if (!req.user || req.user.phoneNumber_verified_at === null) {
        return res.status(403).json(new ApiError(403, "Phone Number is not verified"));
    }
    next();
});


export { isEmailVerified, isPhoneNumberVerified }