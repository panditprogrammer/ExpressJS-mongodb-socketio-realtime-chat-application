import mongoose from "mongoose";
import { notificationTypes } from "../constants.js";

// Define the Notification Schema
const notificationSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User', // Assuming you have a 'User' model to associate the notification with a user
            required: true,
        },
        title: {
            type: String,
            required: true,
        },
        message: {
            type: String,
            required: true,
        },
        type: {
            type: String,
            enum: notificationTypes, // You can define different types of notifications
            default: "info",
            required: true,
        },
        redirectUrl: {
            type: String,
            trim: true
        },
        isRead: {
            type: Boolean,
            default: false, // Track whether the notification is read or not
        },
        createdByUserId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User', // when notification create by an admin 
        }
    },
    { timestamps: true } // Adds createdAt and updatedAt fields automatically
);

// Create a Notification Model
export const Notification = mongoose.model('Notification', notificationSchema);
