import fs from "fs";

// a common async wrapper function for api
const asyncHandler = (reqHandlerFunction) => async (req, res, next) => {
    try {
        return await reqHandlerFunction(req, res, next)
    } catch (error) {
console.log("error........",error);

        // Delete the file if error occur during upload
        if (req.file) {
            fs.access(req.file.path, fs.constants.F_OK, (err) => {
                if (!err) {
                    fs.unlink(req.file.path, (err) => {
                        if (err) {
                            return false;
                        }
                    });
                }
            });
        }

        // Ensure a valid HTTP status code
        const statusCode = Number.isInteger(error.statusCode) ? error.statusCode : 500;

        return res.status(statusCode).json({
            success: false,
            message: error.message
        })
    }
}



export { asyncHandler }