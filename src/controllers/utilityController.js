import { asyncHandler } from "../utilities/asyncHandler.js";
import { ApiError, ApiSuccess, isApiRequest } from "../utilities/apiResponse.js";
import { deleteLocalFile } from "../utilities/functions.js";
import os from "os";




const uploadFile = asyncHandler(async (req, res) => {

    // Handle single upload file upload (optional)
    if (req.file && req.file.path) {
        let uploadedFile = req.file;
        let filepath = null;
        if (os.type() == "Linux" || os.platform() == "linux") {
            uploadedFile.path = uploadedFile.path.replace('public/', '');
        } else {
            uploadedFile.path = uploadedFile.path.replace('public\\', '');
        }
        filepath = uploadedFile.path;


        if (uploadedFile.fieldname === "postImageVideo") {
            if (!(uploadedFile.mimetype.startsWith("image") || uploadedFile.mimetype.startsWith("video"))) {
                deleteLocalFile(filepath);
                return res.status(400).json(new ApiError(400, "Only image or video file allowed"));
            }
        }


        res.locals.message.text = "File uploaded successfully";
        res.locals.message.type = true;
        if (isApiRequest(req.originalUrl)) {
            return res.status(201).json(new ApiSuccess(uploadedFile, 201, res.locals.message.text));
        }
    }


    res.locals.message.text = "Failed to upload";
    if (isApiRequest(req.originalUrl))
        return res.status(500).json(new ApiError(500, res.locals.message.text));
})




export {
    uploadFile,
}