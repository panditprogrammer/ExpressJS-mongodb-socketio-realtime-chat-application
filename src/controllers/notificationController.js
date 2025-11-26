import { asyncHandler } from "../utilities/asyncHandler.js";
import { ApiError, ApiSuccess, isApiRequest } from "../utilities/apiResponse.js";
import { Notification } from "../models/notificationModel.js";
import { notificationTypes} from "../constants.js";
import { User } from "../models/userModel.js";
import { sendPushNotificationToUser } from "../utilities/functions.js";
import { isValidMongooseId, validateFields } from "../utilities/validator.js";



// send notifications to users
const sendNotifications = asyncHandler(async (req, res) => {
    const authUser = req.user;

    if (!isApiRequest(req.originalUrl) && req.method === "GET") {
        return res.render("dashboard/send-notification", { userRoles, notificationTypes });
    }

    const { title, message, type, redirectUrl, sendTouserRole } = req.body;

    const validation = validateFields(req, res, {
        title: { required: true, message: "Title is required" },
        message: { required: true, message: "Message can't be empty" },
        redirectUrl: { required: true, message: "Redirect url can not be empty" },
        sendTouserRole: { required: true, message: "User role is required for sending notification" }
    })
    if (!validation) {
        return res.status(400).json(new ApiError(400, res.locals.message.text));
    }

    //  check valid user role id 
    if (!userRoles.includes(sendTouserRole)) {
        return res.status(400).json(new ApiError(400, "Invalid sendTouserRole "));
    }

    if (!notificationTypes.includes(type)) {
        return res.status(400).json(new ApiError(400, "Invalid notification type"));
    }

    const role = await Role.findOne({ name: sendTouserRole });
    const users = await User.find({ roleId: role.id });

    let sentCount = users.length;
    if (sentCount === 0) {
        return res.status(200).json(new ApiSuccess(null, 200, `No users found with selected role - ${sendTouserRole}`));
    }

    for (const user of users) {
        await sendPushNotificationToUser(user, {
            title, message, redirectUrl, type, createdByUserId: authUser.id
        });
    }
    if (sentCount) {
        return res.status(201).json(new ApiSuccess(null, 201, `Notification sent to ${sentCount} users successfully`));
    }

    return res.status(500).json(new ApiError(500, "Failed to send notifications"));
})


// get all notifications 
const userNotifications = asyncHandler(async (req, res) => {
    const { unreads } = req.query;

    if (unreads) {
        const notificationUnread = await Notification.find({ userId: req.user.id, isRead: false }).countDocuments();
        if (isApiRequest(req.originalUrl)) {
            return res.status(200).json(new ApiSuccess(notificationUnread, 200, `${notificationUnread} unread notifications`));
        }
    }


    const notifications = await Notification.find({ userId: req.user.id }).sort({ createdAt: -1 });
    if (isApiRequest(req.originalUrl)) {
        return res.status(200).json(new ApiSuccess(notifications, 200, "notifications retrived successfully"));
    }
    return res.render("dashboard/notifications", { notifications });
})


const notificationMarkRead = asyncHandler(async (req, res) => {
    const { notificationId } = req.params;

    const { readAll } = req.query;

    if (readAll && readAll === "read") {
        await Notification.updateMany({ userId: req.user.id }, { isRead: true });
        return res.status(200).json(new ApiSuccess(true, 200, "All notifications marked as read"))
    }

    if (!isValidMongooseId(notificationId)) {
        return res.status(400).json(new ApiError(400, "invalid notification id"));
    }

    const notification = await Notification.findByIdAndUpdate(notificationId, { isRead: true }, { new: true });

    return res.status(200).json(new ApiSuccess(true, 200))
})

const notificationDelete = asyncHandler(async (req, res) => {
    const { notificationId } = req.params;

    const { clearall } = req.query;

    if (clearall && clearall === "delete") {
        await Notification.deleteMany({ userId: req.user.id });
        return res.status(200).json(new ApiSuccess(true, 200, "Notifications removed successfully"))
    }

    if (!isValidMongooseId(notificationId)) {
        return res.status(400).json(new ApiError(400, "invalid notification id"));
    }

    const notification = await Notification.findByIdAndDelete(notificationId);
    if (notification) {
        return res.status(200).json(new ApiSuccess(true, 200, "Notification deleted successfully"))
    }

    return res.status(500).json(new ApiError(500, "failed to delete notification"));

})


export { sendNotifications, userNotifications, notificationMarkRead, notificationDelete }