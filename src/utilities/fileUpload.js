import fs from "fs"
import { v2 as cloudinary } from "cloudinary";

// config 
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
})

export const removeLocalFile = (localFilePath) => {
    if (!localFilePath) {
        return
    }
    fs.unlinkSync(localFilePath)
}

// file upload from server to cloudinary 
const uploadFileOnCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath) {
            return null;
        }
        // upload to cloudinary 
        const uploadResponse = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto"
        })

        removeLocalFile(localFilePath)
        return uploadResponse;

    } catch (error) {
        // delete uploaded file from the server
        removeLocalFile(localFilePath)
        return null;
    }
}

export default uploadFileOnCloudinary;