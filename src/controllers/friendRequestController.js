import { asyncHandler } from "../utilities/asyncHandler.js";
import { ApiError, ApiSuccess } from "../utilities/apiResponse.js";
import { FriendRequest } from "../models/friendRequestModel.js";


const getFriendRequests = asyncHandler(async (req, res) => {

    const friendRequest = await FriendRequest.find({ toUser: req.user._id, status: "pending" }).populate("fromUser", "_id fullName avatar").sort({ createdAt: -1 });

    if (!friendRequest) {
        return res.status(404).json(new ApiError(404, "friendRequest not found"));
    }

    return res.status(200).json(new ApiSuccess(friendRequest, 200, "friendRequest retrive successfully"));
});





export {
    getFriendRequests,
};