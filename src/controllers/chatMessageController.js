import { asyncHandler } from "../utilities/asyncHandler.js";
import { Message } from "../models/messageModel.js";
import { ApiError, ApiSuccess } from "../utilities/apiResponse.js";




const getChatHistory = asyncHandler(async (req, res) => {

    const friendId = req.params.friendId;
    const currentUserId = req.user._id;


    const messages = await Message.find({
        $or: [
            { sender: currentUserId, receiver: friendId },
            { sender: friendId, receiver: currentUserId }
        ]
    }).sort({ createdAt: 1 }).limit(20);

    if (!messages || messages.length === 0) {
        return res.status(404).json(new ApiError(404, "No chat history found."));
    }

    await Message.updateMany(
        { sender: friendId, receiver: currentUserId, read: false },
        { $set: { read: true } }
    );

    return res.status(200).json(new ApiSuccess({ messages }, 200, "Chat history retrieved successfully."));
});

export {
    getChatHistory
};