import { asyncHandler } from "../utilities/asyncHandler.js";
import { User } from "../models/userModel.js"
import jwt from "jsonwebtoken"
import { ApiError, ApiSuccess, isApiRequest, isUserUrl } from "../utilities/apiResponse.js";
import { isValidMongooseId, isValidPassword, validateFields } from "../utilities/validator.js";
import { now } from "mongoose";
import { convertHtmlDateToMongoDate, generateRandomPassword, generateSecureOTP, sendPushNotificationToUser, stringToMongooseId, validatePageNoReq, validateSortByReq } from "../utilities/functions.js";
import { FriendRequest } from '../models/friendRequestModel.js';
// firebase auth 
import firebaseAdmin from 'firebase-admin';
import { APP_NAME } from "../constants.js";




const registerWithSocial = asyncHandler(async (req, res) => {

    if (!isApiRequest(req.originalUrl) && req.method === "GET") {
        return res.render("auth/register-with-social");
    }

    const { googleIdToken } = req.body;

    try {
        const decodedToken = await firebaseAdmin.auth().verifyIdToken(googleIdToken);

        const { uid, email, name, picture } = decodedToken;

        const emailExist = await User.findOne({ email: email.toLowerCase() });
        if (emailExist) {
            return loginSuccessResponse(req, res, emailExist);
        }

        // Create new user
        const newUser = await User.create({
            firebaseUid: uid,
            fullName: name,
            email: email,
            avatar: picture,
            email_verified_at: now(),
        });

        if (!newUser) {
            return res.status(500).json(new ApiError(500, "Failed to register user"));
        }

        return loginSuccessResponse(req, res, newUser);

    } catch (error) {
        console.error("Firebase token verification error:", error);
        return res.status(401).json(new ApiError(401, "Firebase token verification failed: " + error));
    }

});


const getAllUsers = asyncHandler(async (req, res) => {

    const authUser = req.user;
    const { id } = req.params || {};
    let { page, from, to, search, sortby, usertype, status } = req.query;

    // page 
    page = validatePageNoReq(page)

    const limit = 15;
    const skip = (page - 1) * limit;

    // sort 
    sortby = validateSortByReq(sortby);

    // filter by date range
    const fromDate = convertHtmlDateToMongoDate(from);
    const toDate = convertHtmlDateToMongoDate(to);

    if (toDate) {
        toDate.setHours(23, 59, 59, 999);
    }
    let dateRange = {};

    if (fromDate && toDate) { // Check if both dates are valid
        dateRange = {
            $or: [
                { createdAt: { $gte: fromDate, $lte: toDate } },
            ]
        }
    } else if (fromDate) {
        dateRange = {
            $or: [
                { createdAt: { $gte: fromDate } },
            ]
        }
    } else if (toDate) {
        dateRange = {
            $or: [
                { createdAt: { $lte: toDate } },
            ]
        };
    }

    // Create a search filter if a search term is provided
    let searchFilter = {};
    if (search) {
        searchFilter = {
            $or: [
                { "fullName": { $regex: search, $options: "i" } },
                { "email": { $regex: search, $options: "i" } },
                { "phoneNumber": { $regex: search, $options: "i" } },
            ],
        };
    }

    const andFilter = []



    if (status) {
        andFilter.push({ "status": status === "active" })
    }

    if (andFilter.length) {
        searchFilter.$and = andFilter;
    }

    // If ID is provided, find by ID
    if (isValidMongooseId(id)) {
        const userDetail = await User.findById(id).select("_id fullName avatar")
        if (!userDetail) {
            return res.status(404).json(new ApiError(404, "User not found"))
        }

        if (isApiRequest(req.originalUrl)) {
            return res.status(200).json(new ApiSuccess(userDetail, 200, "User retrieved successfully"));
        }

        return res.render("dashboard/user-details", { userDetail });

    }
    const users = await User.find({ $and: [searchFilter, dateRange] }).skip(skip).limit(limit).sort({ createdAt: sortby });

    const totalCount = await User.countDocuments({ $and: [searchFilter, dateRange] });
    const totalPages = Math.ceil(totalCount / limit);
    const data = {
        users,
        currentPage: page,
        totalPages,
        totalCount,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
        nextPage: page + 1,
        prevPage: page - 1,
        search,
        from,
        to,
        sortby,
        serialStart: skip,
        status,
        usertype
    };


    return res.status(200).json(new ApiSuccess(data, 200, "User retrived successfully"));
})

const registerUser = asyncHandler(async (req, res) => {

    return res.status(200).json(new ApiSuccess());
});

// generate new tokens
const generateAccessRefreshToken = async (userId) => {
    try {
        const user = await User.findById(userId)
        const accessToken = await user.generateAccessToken()
        const refreshToken = await user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false })

        return { accessToken, refreshToken }

    } catch (error) {
        console.log(error)
    }
}

const loginSuccessResponse = async (req, res, user) => {
    // Generate access and refresh tokens after successful login
    const { accessToken, refreshToken } = await generateAccessRefreshToken(user._id);

    // Remove password from the user object before sending the response
    const { password: removedPassword, ...userWithoutPassword } = user.toObject();

    // const role = await Role.findById(user.roleId);

    res.locals.message.text = `${user?.fullName} Logged in successfully`;
    res.locals.message.type = true;


    // =============== start session ===============

    // Store user in session
    // req.session.user = user;
    // Add user to request
    req.user = user;

    // response for client 
    res.locals.user = user;
    // =============== end session ===============


    // set the cookies 
    // Set options for secure cookies
    const options = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production', // secure only in production
        maxAge: 24 * 60 * 60 * 1000, //1 day
    };

    // Set options for secure cookies
    const refreshOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production', // secure only in production
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    };

    res.cookie("accessToken", accessToken, options);
    res.cookie("refreshToken", refreshToken, refreshOptions);
    // cookies set ends 

    // Send the tokens as cookies and user data in response
    if (isApiRequest(req.originalUrl)) {
        return res.status(200).json(new ApiSuccess({ user: userWithoutPassword, accessToken, refreshToken }, 200, res.locals.message.text));
    }

    return res.status(200).redirect("/")
}

// logout user 
const logoutUser = asyncHandler(async (req, res) => {

    const user = await User.findByIdAndUpdate(req.user._id,
        {
            $set: {
                refreshToken: null // remove from db
            }
        },
        {
            new: true
        }
    )

    // cookies send to client
    const options = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production', // secure only in production
    }

    // console.log("after logout user",user);
    // destroy session 
    // req.session.userBusiness = null;
    req.userBusiness = null;
    // req.session.user = null;


    res.locals.message.text = "User logged out successfully";
    res.locals.message.type = true;

    if (isApiRequest(req.originalUrl))
        return res.status(200)
            .clearCookie("accessToken", options)
            .clearCookie("refreshToken", options)
            .json(new ApiSuccess(null, 200, res.locals.message.text))

    return res.status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .redirect("/");
})


const loginUser = asyncHandler(async(req,res)=>{
    return res.render('auth/login');
})

// refresh token 
const refreshAccessToken = asyncHandler(async (req, res) => {
    const userRefreshToken = req.cookies?.refreshToken || req.body.refreshToken

    // cookies send to client
    const options = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production', // secure only in production
    }

    if (!userRefreshToken) {
        // if (isApiRequest(req.originalUrl)){
        //     return res.status(401).json(new ApiError(401, "unauthorized request"))
        // }
        // return res.redirect("/users/login");


        if (isApiRequest(req.originalUrl)) {
            return res.status(401)
                .clearCookie("accessToken", options)
                .clearCookie("refreshToken", options)
                .json(new ApiError(401, "invalid refreshToken"))
        }

        return res.status(200)
            .clearCookie("accessToken", options)
            .clearCookie("refreshToken", options)
            .redirect("/users/login");
    }

    try {
        const decodedToken = jwt.verify(userRefreshToken, process.env.REFRESH_TOKEN_SECRET)

        const user = await User.findById(decodedToken?._id)

        if (!user || (userRefreshToken !== user.refreshToken)) {
            if (isApiRequest(req.originalUrl)) {
                return res.status(401)
                    .clearCookie("accessToken", options)
                    .clearCookie("refreshToken", options)
                    .json(new ApiError(401, "invalid refreshToken"))
            }

            return res.status(200)
                .clearCookie("accessToken", options)
                .clearCookie("refreshToken", options)
                .redirect("/users/login");
        }

        return loginSuccessResponse(req, res, user);


    } catch (error) {
        if (isApiRequest(req.originalUrl)) {
            return res
                .clearCookie("accessToken", options)
                .clearCookie("refreshToken", options)
                .status(401).json(new ApiError(401, error?.message || "invalid or expired refreshToken"))
        }

        return res
            .clearCookie("accessToken", options)
            .clearCookie("refreshToken", options)
            .redirect("/users/login");
    }

})


// change the user password 
const changeCurrentPassword = asyncHandler(async (req, res) => {
    const { currentPassword, newPassword, confirmPassword } = req.body;


    const user = await User.findById(req.user._id);
    if (!user) {
        return res.status(404).json(new ApiError(404, "User not found"));
    }

    // Check current password
    const isMatch = await user.isPasswordCorrect(currentPassword);
    if (!isMatch) {
        return res.status(400).json(new ApiError(400, "Invalid current password"));
    }


    // Validate new password format first
    const passwordErrors = isValidPassword(newPassword);

    if (passwordErrors.length > 0) {
        return res.status(400).json(new ApiError(400, passwordErrors[0]));
    }

    if (newPassword !== confirmPassword) {
        return res.status(400).json(new ApiError(400, "Confirm password mismatch"));
    }


    // Update to new password
    user.password = newPassword;
    const isDone = await user.save(); // `pre('save')` hook will hash the password

    if (isDone) {
        // Remove password field from response if needed
        const userResponse = user.toObject();
        delete userResponse.password;


        await sendPushNotificationToUser(user, {
            title: `You have changed the password`,
            message: `Your password was changed successfully. Please login using the new password.`,
            redirectUrl: "/users/profile",
            type: "success"
        });

        return res.status(200).json(new ApiSuccess(userResponse, 200, "Password changed successfully"));
    }

    return res.status(500).json(new ApiError(500, "Failed to change password"));
});



// get logged in user profile 
const getCurrentUser = asyncHandler(async (req, res) => {

    let responseUser = req.user.toObject(); // convert to plain object

    if (req.user.role !== "customer") {
        const earnings = await req.user.getEarnings();
        responseUser.walletAmount = formatCurrency(earnings);
    }
    return res.status(200).json(new ApiSuccess(responseUser, 200, "user fetched successfully"))
})


// get all friends
const getFriends = asyncHandler(async (req, res) => {

    let friends = await User.find({ _id: { $in: req.user.friends } }).select('_id fullName avatar onlineStatus');


    return res.status(200).json(new ApiSuccess(friends, 200, "friends fetched successfully"))
})

// check friendship
const checkFriends = asyncHandler(async (req, res) => {

    const currentUserId = req.user._id;
    const postOwnerId = req.params.postOwnerId;

    const currentUser = await User.findById(currentUserId, 'friends');

    const isFriend = currentUser.friends.map(f => f.toString()).includes(postOwnerId.toString());

    if (isFriend) {
        return res.status(200).json(new ApiSuccess({
            isFriend: true,
            requestPending: false
        }, 200, "Friendship already exists."));
    }

    const requestPending = await FriendRequest.findOne({
        $or: [
            { fromUser: currentUserId, toUser: postOwnerId, status: 'pending' },
            { fromUser: postOwnerId, toUser: currentUserId, status: 'pending' }
        ]
    }).countDocuments();

    return res.status(200).json(new ApiSuccess({
        isFriend: false,
        requestPending: requestPending ? true : false
    }, 200, "Friendship status checked."));
});


// update account details 
const updateUser = asyncHandler(async (req, res) => {
    const {
        fullName, avatar, email, address, role, phoneNumber, status, verifyEmail, verifyPhone,
        pancardPhoto, pancardNumber, accountHolderName, accountNumber, ifscCode,
        passbookPhoto, bankName
    } = req.body
    let userId = req.user?.id;

    if (req.user?.role === "admin" || req.user?.role === "franchisor") {
        userId = req.params?.userId;
    }

    if (!isValidMongooseId(userId)) {
        return res.status(400).json(new ApiError(400, "user id not valid"));
    }

    // validate if provided
    let validationObject = {};
    let fieldsForUpdate = {};

    if (fullName?.trim()) {
        validationObject.fullName = { required: true, message: "full name is required" };
        fieldsForUpdate.fullName = fullName;
    }
    if (avatar?.trim()) {
        validationObject.avatar = { required: true, message: "avatar must be valid image url" };
        fieldsForUpdate.avatar = avatar;
    }
    if (email?.trim()) {
        validationObject.email = { required: true, message: "invalid email" };
        fieldsForUpdate.email = email;
    }
    if (address?.googleMapAddress) {
        validationObject.address = { required: true, message: "invalid address" };
        fieldsForUpdate.address = address;
    }
    if (phoneNumber?.trim()) {
        validationObject.phoneNumber = { required: true, message: "phone number is required" };
        fieldsForUpdate.phoneNumber = phoneNumber;
    }

    // bank details 
    fieldsForUpdate.pancard = {}
    if (pancardPhoto?.trim()) {
        validationObject.pancardPhoto = { required: true, message: "Pancard photo is required" };
        fieldsForUpdate.pancard.photo = pancardPhoto;
    }
    if (pancardNumber?.trim()) {
        validationObject.pancardNumber = { required: true, message: "Pancard Number is required" };
        fieldsForUpdate.pancard.number = pancardNumber;
    }
    fieldsForUpdate.bankAccount = {}
    if (accountHolderName?.trim()) {
        validationObject.accountHolderName = { required: true, message: "Account Holder Name is required" };
        fieldsForUpdate.bankAccount.accountHolderName = accountHolderName;
    }
    if (accountNumber?.trim()) {
        validationObject.accountNumber = { required: true, message: "Account number is required" };
        fieldsForUpdate.bankAccount.accountNumber = accountNumber;
    }
    if (ifscCode?.trim()) {
        validationObject.ifscCode = { required: true, message: "IFSC code is required" };
        fieldsForUpdate.bankAccount.ifscCode = ifscCode;
    }
    if (bankName?.trim()) {
        validationObject.bankName = { required: true, message: "Bank name is required" };
        fieldsForUpdate.bankAccount.bankName = bankName;
    }
    if (passbookPhoto?.trim()) {
        validationObject.passbookPhoto = { required: true, message: "Passbook photo is required" };
        fieldsForUpdate.bankAccount.passbookPhoto = passbookPhoto;
    }


    if (status !== null) {
        fieldsForUpdate.status = status;
    }

    if (verifyEmail) {
        fieldsForUpdate.email_verified_at = now();
    } else {
        fieldsForUpdate.email_verified_at = null;
    }

    if (verifyPhone) {
        fieldsForUpdate.phoneNumber_verified_at = now();
    } else {
        fieldsForUpdate.phoneNumber_verified_at = null;
    }

    const validation = validateFields(req, res, validationObject);

    if (!validation) {
        if (isApiRequest(req.originalUrl)) {
            return res.status(400).json(new ApiError(400, res.locals.message.text));
        }
    }

    const roleExists = await Role.findOne({ name: role.toLowerCase() });
    if (!roleExists) {
        if (isApiRequest(req.originalUrl))
            return res.status(400).json(new ApiError(400, "Invalid role provided. Must be customer, business or driver"));
    } else {
        fieldsForUpdate.roleId = roleExists.id;
    }



    const emailExist = await User.findOne(
        { email: email.toLowerCase(), _id: { $ne: userId } } // exclude current userId
    );
    if (emailExist)
        return res.status(403).json(new ApiError(403, "Email already registered"));

    const phoneExist = await User.findOne(
        { phoneNumber: phoneNumber, _id: { $ne: userId } } // exclude current userId
    );
    if (phoneExist) {
        return res.status(403).json(new ApiError(403, "Phone number already registered"));
    }


    const user = await User.findByIdAndUpdate(
        userId,
        {
            $set: fieldsForUpdate
        },
        {
            new: true // return updated value
        }
    ).select("-password -refreshToken")

    if (!user) {
        return res.status(500).json(new ApiError(500, "failed to update info"));
    }

    return res.status(200).json(new ApiSuccess(user, 200, "Info updated successfully"))
})



// update account details 
const updateUserProfile = asyncHandler(async (req, res) => {
    const { fullName, avatar, address, pancardPhoto, pancardNumber, accountHolderName, accountNumber, ifscCode, bankName, passbookPhoto } = req.body
    const authUser = req.user;

    // validate if provided
    let validationObject = {};
    let fieldsForUpdate = {};

    if (!fullName?.trim()) {
        validationObject.fullName = { required: true, message: "full name is required" };
    } else {
        fieldsForUpdate.fullName = fullName;
    }
    if (avatar?.trim()) {
        validationObject.avatar = { required: true, message: "avatar must be valid image url" };
        fieldsForUpdate.avatar = avatar;
    }


    if (address) {
        fieldsForUpdate.address = address;
    }

    if (address?.location?.length > 0 && isValidCoordinates(address?.location[1], address?.location[0])) {
        fieldsForUpdate.address.location = address.location
    }


    // bank details 
    fieldsForUpdate.pancard = {}
    if (pancardPhoto?.trim()) {
        validationObject.pancardPhoto = { required: true, message: "Pancard photo is required" };
        fieldsForUpdate.pancard.photo = pancardPhoto;
    }
    if (pancardNumber?.trim()) {
        validationObject.pancardNumber = { required: true, message: "Pancard Number is required" };
        fieldsForUpdate.pancard.number = pancardNumber;
    }
    fieldsForUpdate.bankAccount = {}
    if (accountHolderName?.trim()) {
        validationObject.accountHolderName = { required: true, message: "Account Holder Name is required" };
        fieldsForUpdate.bankAccount.accountHolderName = accountHolderName;
    }
    if (accountNumber?.trim()) {
        validationObject.accountNumber = { required: true, message: "Account number is required" };
        fieldsForUpdate.bankAccount.accountNumber = accountNumber;
    }
    if (ifscCode?.trim()) {
        validationObject.ifscCode = { required: true, message: "IFSC code is required" };
        fieldsForUpdate.bankAccount.ifscCode = ifscCode;
    }
    if (bankName?.trim()) {
        validationObject.bankName = { required: true, message: "Bank name is required" };
        fieldsForUpdate.bankAccount.bankName = bankName;
    }
    if (passbookPhoto?.trim()) {
        validationObject.passbookPhoto = { required: true, message: "Passbook photo is required" };
        fieldsForUpdate.bankAccount.passbookPhoto = passbookPhoto;
    }


    const validation = validateFields(req, res, validationObject);

    if (!validation) {
        if (isApiRequest(req.originalUrl)) {
            return res.status(400).json(new ApiError(400, res.locals.message.text));
        }
    }

    const user = await User.findByIdAndUpdate(
        authUser?.id,
        {
            $set: fieldsForUpdate
        },
        {
            new: true // return updated value
        }
    ).select("-password -refreshToken")

    if (!user) {
        return res.status(500).json(new ApiError(500, "failed to update profile info"));
    }

    if (isApiRequest(req.originalUrl)) {
        return res.status(200).json(new ApiSuccess(user, 200, "Profile updated successfully"))
    }
    return res.render('dashboard/user-profile');
})


// delete user account 
const deleteUserAccount = asyncHandler(async (req, res) => {
    const { id, email } = req.params

    if (!(id || email)) {
        return res.status(400).json(new ApiError(400, "user ID or email address is required"))
    }

    const user = await User.findByIdAndDelete(id);
    // delete all related data 
    if (user) {
        await UserBusiness.deleteMany({ userId: user.id });
        const subscription = await Subscription.deleteMany({ userId: user.id });


        if (user?.role === "franchisor" || user?.role === "admin" || user?.role === "branch") {
            await User.updateMany(
                { createdBy: user?.id },
                { $unset: { createdBy: "" } }
            );
        }

        // if driver 
        if (user.role === "driver") {
            const driver = await Driver.deleteOne({ userId: user.id });
            if (driver) {
                await Vehicle.deleteMany({ driverId: driver.id });
            }
        }
    }

    const userBusiness = await UserBusiness.find({ userId: user?.id });
    if (userBusiness) {
        const advertisement = await Advertisement.deleteMany({ userBusinessId: userBusiness.id });
        const addonFeaturedCredit = await AddonFeaturedCredit.deleteMany({ userBusinessId: userBusiness.id });
        const businessListing = await BusinessListing.deleteMany({ userBusinessId: userBusiness.id });
        const businessProfileAnalytics = await BusinessProfileAnalytics.deleteMany({ userBusinessId: userBusiness.id });
    }

    if (user) {
        return res.status(200).json(new ApiSuccess(user, 200, "account deleted successfully"))
    }

    return res.status(500).json(new ApiError(500, "failed to delete user account"))
})

const changeUserStatus = asyncHandler(async (req, res) => {
    const authUser = req.user;
    const { userId } = req.params;

    const user = await User.findById(userId);
    if (!user) {
        return res.status(404).json(new ApiError(404, 'User not found'));
    }

    user.status = !user.status;
    const restricted = await user.save();

    if (restricted && !user.status) {
        sendPushNotificationToUser(user, {
            title: "Account has been restricted!",
            message: `Dear ${user.fullName}, Your account has been restricted due to voilation of ${APP_NAME} terms & services.`,
            type: "danger",
            redirectUrl: "/users/login"
        });
    }

    // check if this user is driver 
    if (user.role === "driver") {
        const driver = await Driver.findOne({ userId: user.id });
        const vehicle = await Vehicle.findOneAndUpdate({ driverId: driver.id }, { status: "restricted" });
    }

    return res.status(200).json(new ApiSuccess(user.status, 200, 'User status changed successfully'));
})

// update profile image 
const updateProfileImage = asyncHandler(async (req, res) => {

    let avatar = null;
    if (req.file && req.file?.path) {
        avatar = req.files?.path // uploaded on local server
    }
    if (!avatar) {
        return res.status(400).json(new ApiError(400, "avatar file is required!"))
    }

    const oldAvatarImage = req.user.avatar;

    const user = User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                avatar
            }
        },
        {
            new: true
        }
    )

    removeLocalFile(oldAvatarImage);

    return res.status(200).json(new ApiSuccess(user, 200, "profile image updated successfully"))
})


const dashboard = asyncHandler(async (req, res) => {

    const user = req.user;
    if (user.role === "customer") {
        return res.status(200).redirect("/customers/dashboard");
    }
    if (user.role === "driver") {
        return res.status(200).redirect("/drivers/dashboard");
    }
    if (user.role === "admin" || user.role === "franchisor" || user.role === "branch" || user.role === "drivercenter") {
        return res.status(200).redirect("/branches/dashboard");
    }
    const userSubscription = await user.activePlan();

    let last7DaysData = null;
    let last30DayProfileVisits = null;
    let last7DayProfileVisits = null;
    let todayProfileVisits = null;

    // customer 
    let customerRecentTrips = [];
    // if (user?.role === "customer") {
    //     customerRecentTrips = await Booking.find({ userId: user.id }).populate({ path: "driverId" });
    // }


    const businessUser = await UserBusiness.findOne({ userId: user._id });
    if (businessUser) {
        // Get the start and end of today
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        const endOfToday = new Date();
        endOfToday.setHours(23, 59, 59, 999);


        // last 7 days 
        // Get the start of the date 7 days ago
        const startOfLast7Days = new Date();
        startOfLast7Days.setHours(0, 0, 0, 0); // Start of the day 7 days ago
        startOfLast7Days.setDate(startOfLast7Days.getDate() - 6); // Go back 6 days to include today


        // Find documents from the last 7 days
        last7DaysData = await BusinessProfileAnalytics.findOne({
            userBusinessId: businessUser._id,
            date: { $gte: startOfLast7Days, $lte: endOfToday }
        });

        todayProfileVisits = await getLastDaysProfileVisits(businessUser._id, 1);

        last7DayProfileVisits = await getLastDaysProfileVisits(businessUser._id, 7);
        last30DayProfileVisits = await getLastDaysProfileVisits(businessUser._id, 30);
    }


    return res.render("dashboard/index", { customerRecentTrips, userSubscription, todayProfileVisits, last7DaysData, last7DayProfileVisits, last30DayProfileVisits });
})


// user profile page 
const userProfile = asyncHandler(async (req, res) => {

    const { userId } = req.query;
    if (userId && isValidMongooseId(userId)) {
        const userProfile = await User.findById(userId).select("_id fullName email phoneNumber avatar roleId status createdBy").populate({ path: "roleId" });
        return res.status(200).json(new ApiSuccess(userProfile, 200, "User profile retrive successfully"));
    }

    const user = req.user;
    const userSubscription = await user.activePlan();


    // if user is driver 
    let driver = null;
    let vehicle = null;
    let vehicleCategories = [];

    if (user?.role === 'driver') {
        driver = await Driver.findOne({ userId: user?.id });
        if (driver) {
            vehicle = await Vehicle.findOne({ driverId: driver?.id }).populate({ path: "vehicleCategoryId", select: "_id vCategoryName" });
        }
        vehicleCategories = await VehicleCategory.find({ status: true }).select("_id vCategoryName");
    }

    return res.render("dashboard/user-profile", { userSubscription, vehicleFuelTyps, driver, vehicle, vehicleTypes, vehicleCategories });
})


const checkVerifiedVisitor = asyncHandler(async (req, res) => {
    const verified = req.cookies?.isVerifiedVisitor;
    return res.status(200).json(new ApiSuccess(verified, 200, "verification check successfully"));
})


const searchAndSelectUser = asyncHandler(async (req, res) => {
    let { search } = req.query;

    search = search.trim();

    // search in only role "drivercenter", "franchisor"
    // Get allowed role IDs
    const allowedRoles = await Role.find({
        name: { $in: ["drivercenter", "franchisor"] }
    }).select('_id');

    const roleIds = allowedRoles.map(r => r._id);

    const users = await User.find({
        roleId: { $in: roleIds },
        $or: [
            { fullName: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } },
            { phoneNumber: { $regex: search, $options: 'i' } },
            { code: { $regex: search, $options: 'i' } }
        ]
    })
        .select('_id fullName email phoneNumber code avatar')
        .limit(20);

    if (users.length) {
        const result = users.map(u => ({
            id: u._id,
            text: `${u.fullName} (${u.email})`
        }))
        return res.status(200).json(new ApiSuccess(result, 200, `${users.length} results found`));
    }


    return res.status(404).json(new ApiError(404, "No result found!"));
});




export {
    registerUser,
    registerWithSocial,
    logoutUser,
    loginUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateUser,
    updateProfileImage,
    updateUserProfile,
    dashboard,
    userProfile,
    getAllUsers,
    deleteUserAccount,
    changeUserStatus,
    checkVerifiedVisitor,
    searchAndSelectUser,
    getFriends,
    checkFriends
}