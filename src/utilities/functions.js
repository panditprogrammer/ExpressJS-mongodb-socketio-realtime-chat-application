import fs from "fs";
import mongoose from "mongoose";
import { Notification } from "../models/notificationModel.js";
import crypto from "crypto";
import firebaseAdmin from 'firebase-admin';

export function generateRandomPassword(length = 8) {
    if (isNaN(length)) {
        length = 8;
    }
    const upperCaseChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowerCaseChars = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const specialChars = '!@#$%&*()_[]{}?';

    const allChars = upperCaseChars + lowerCaseChars + numbers + specialChars;
    let password = '';

    for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * allChars.length);
        password += allChars.charAt(randomIndex);
    }

    return password;
}



export function convertHtmlDateToMongoDate(dateString) {
    if (!dateString) {
        return null; // Handle null or undefined input
    }

    const parts = dateString.split("-");
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // Months are 0-indexed in JavaScript Date
    const day = parseInt(parts[2], 10);

    return new Date(year, month, day);
}


// validate mongodb sort type 
export function validateSortByReq(sortby) {
    if (sortby === 'asc' || sortby === 'desc') {
        return sortby;
    } else {
        return "asc";
    }
}


// validate mongodb page number 
export function validatePageNoReq(page) {
    if (!isNaN(page) && parseInt(page) >= 1) {
        return parseInt(page);
    } else {
        return 1;
    }
}


// delete file 
export function deleteLocalFile(filepath) {

    // Delete the old file if it exists
    fs.access("public\\" + filepath, fs.constants.F_OK, (err) => {
        if (!err) {
            fs.unlink("public\\" + filepath, (err) => {
                if (err) {
                    return false;
                }
            });
        }
    });
    return true;
}

// string to mongoose object id 
export function stringToMongooseId(id) {
    try {
        return new mongoose.Types.ObjectId(id);
    } catch (error) {
        console.error('Error converting string to ObjectId:', error);
        return false;
    }
}

export function stripHtmlTags(str) {
    if (!str || typeof str !== 'string') return '';
    return str.replace(/<[^>]*>/g, '').trim();
}


const sendFirebasePushNotification = async (fcmToken, title, body, data = {}) => {
    const message = {
        token: fcmToken,
        notification: {
            title,
            body,
        },
        android: {
            priority: 'high',
            notification: {
                sound: 'default',
                channelId: 'default',
            },
        },
        apns: {
            payload: {
                aps: {
                    sound: 'default',
                },
            },
            headers: {
                'apns-priority': '10',
            },
        },
        data, // Optional custom data
    };

    try {
        const response = await firebaseAdmin.messaging().send(message);
        console.log('✅ Notification sent:', response);
        return { success: true, response };
    } catch (error) {
        console.error('❌ Error sending notification:', error);
        return { success: false, error };
    }
};


export async function sendPushNotificationToUser(user, data = {}) {

    try {
        const newNotification = await Notification.create({
            userId: user?.id || user?._id,
            title: data?.title,
            message: data?.message,
            redirectUrl: data?.redirectUrl,
            type: data?.type || "info",
            createdByUserId: data?.createdByUserId
        });

        if (newNotification) {
            if (user?.fcmToken) {
                await sendFirebasePushNotification(user?.fcmToken, stripHtmlTags(data?.title), stripHtmlTags(data?.message));
            }
            await user.sendPushNotification(newNotification)
            return true;
        }
    } catch (error) {
        console.log("error while sending notification: " + error);
    }
    return false;
}


// String utilities 
export function capitalize(word) {
    if (!word) return '';
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

// get the formated current time 
export function formatAnyDateToHHMM(date = new Date()) {
    if (!(date instanceof Date)) {
        date = new Date(date);
        if (isNaN(date)) return null; // invalid date
    }
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
}



export function generateSecureOTP(n = 6) {
    if (n <= 0) throw new Error("OTP length must be greater than 0");

    const max = Math.pow(10, n);
    const randomNumber = crypto.randomInt(0, max); // cryptographically strong random number
    return randomNumber.toString().padStart(n, '0');
}

