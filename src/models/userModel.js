import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import { Notification } from "../models/notificationModel.js";
import webPush from "web-push";

const userSchema = new mongoose.Schema(
    {
        fullName: {
            type: String,
            required: true,
            trim: true,
        },
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },

        avatar: { // image url
            type: String,
        },
        refreshToken: {
            type: String,
        },
        firebaseUid: {
            type: String,
            trim: true
        },

        status: {
            type: Boolean,
            default: true // default to active
        },

        email_verified_at: {
            type: Date,
            default: null 
        },
        fcmToken: {
            type: String,
            default: null,
        },
        //  
        onlineStatus: { //  
            type: Boolean,
            default: false
        },
        socketId: {
            type: String,
            default: null,
        },
        friends: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }],
    },
    { timestamps: true }
);



userSchema.methods.generateAccessToken = function () {
    return jwt.sign(
        {
            _id: this._id,
            email: this.email,
            userName: this.userName,
            fullName: this.fullName
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY
        }
    )
}

userSchema.methods.generateRefreshToken = function () {
    return jwt.sign(
        {
            _id: this._id,
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY
        }
    )
}


userSchema.methods.verifyEmail = function (token) {
    // Verify the emal by link 
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, async (err, decoded) => {
        if (err) {
            return res.status(400).json(new ApiError(400, 'Invalid or expired token.'));
        }

        const user = await User.findByIdAndUpdate(
            decoded.userId,
            {
                $set: {
                    email_verified_at: true
                }
            },
            {
                new: true // return updated value
            }
        ).select("-password -refreshToken")

        return user;
    });
}


userSchema.methods.getNotifications = async function () {
    const notifications = await Notification.find({ userId: this._id, isRead: false }).sort({ createdAt: -1 });
    return notifications;
}


userSchema.methods.sendPushNotification = async function (notificationData) {
    const subscriptions = await NotificationSubscription.find({ userId: this._id });

    if (subscriptions.length) {
        // Loop through each subscription and send the push notification
        for (const subscription of subscriptions) {
            const notificationPayload = {
                title: notificationData.title,
                body: notificationData.message,
                icon: '/images/favicon.png',
                data: {
                    redirectUrl: notificationData.redirectUrl
                }
            };

            try {
                // Send the push notification
                await webPush.sendNotification(subscription, JSON.stringify(notificationPayload));
            } catch (error) {
                // Handle errors when sending the notification
                if (error.statusCode === 410) {
                    // Subscription has expired or unsubscribed, delete it
                    console.log(`Subscription expired or unsubscribed, removing it: ${subscription.endpoint}`);
                    await NotificationSubscription.deleteOne({ _id: subscription._id });
                } else {
                    // Log any other errors
                    console.error(`Error sending push notification: ${error.message}`);
                }
            }
        }
        return true;
    }
    return false;
}



// Add post hook to delete documents when a user is deleted
userSchema.post('remove', async function () {
    try {
        if (this.avatar) {
            deleteLocalFile(this.avatar)
        }


    } catch (err) {
        console.error("Error deleting user related documents:", err);
    }
});
//-------------- custom methods ends --------------


export const User = mongoose.model("User", userSchema)