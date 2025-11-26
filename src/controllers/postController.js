import { asyncHandler } from "../utilities/asyncHandler.js";
import { Post } from "../models/postModel.js";
import { ApiError, ApiSuccess } from "../utilities/apiResponse.js";
import { convertHtmlDateToMongoDate } from "../utilities/functions.js";

function getFileType(path) {
    if (!path) return null;

    // Remove trailing quotes if any (e.g., "file.jpg'")
    path = path.replace(/['"]+$/, "");

    const extension = path.split('.').pop().toLowerCase();

    const imageExtensions = ["jpg", "jpeg", "png", "gif", "webp", "bmp", "svg"];
    const videoExtensions = ["mp4", "mov", "avi", "mkv", "webm", "flv", "wmv"];

    if (imageExtensions.includes(extension)) {
        return "image";
    }

    if (videoExtensions.includes(extension)) {
        return "video";
    }

    return null; // unknown type
}



const createPost = asyncHandler(async (req, res) => {

    const { title, imageVideo } = req.body;

    // Check if required fields are present
    if (!title) {
        return res.status(400).json(new ApiError(400, "Please write something..."));
    }

    let filetype = getFileType(imageVideo);


    // Create the new Post document
    const newPost = await Post.create({
        userId: req.user._id,
        title: title,
        image: filetype === "image" ? imageVideo : '',
        video: filetype === "video" ? imageVideo : ''
    });

    return res.status(201).json(new ApiSuccess(newPost, 201, "Post created successfully"));
});



const getPostes = asyncHandler(async (req, res) => {

    let { page, from, to, search } = req.query;

    if (isNaN(page)) {
        page = 1;
    }
    page = parseInt(page);
    if (page < 1) {
        page = 1;
    }
    const limit = 15;
    const skip = (page - 1) * limit;

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
                { "title": { $regex: search, $options: "i" } },
            ],
        };
    }



    // admin or other 
    // Fetch all Postes
    const Postes = await Post.find({ $and: [searchFilter, dateRange] }).populate({ path: 'userId', select: "_id fullName avatar" }).sort({ createdAt: -1 }).skip(skip).limit(limit);

    const totalCount = await Post.countDocuments({ $and: [searchFilter, dateRange] });
    const totalPages = Math.ceil(totalCount / limit);
    const data = {
        posts: Postes,
        currentPage: page,
        totalPages,
        totalCount,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
        nextPage: page + 1,
        prevPage: page - 1,
    };

    data.search = search;
    data.from = from;
    data.to = to;

    return res.status(200).json(new ApiSuccess(data, 200, "Post retrieved successfully"));

});



const updatePost = asyncHandler(async (req, res) => {
    const { title, image, video } = req.body;

    const { id } = req.params; // Assuming Post ID is passed as a URL parameter

    // Validate that the Post ID is provided
    if (!id) {
        return res.status(400).json(new ApiError(400, "Post ID is required"));
    }

    // Validate the Post existence
    const existingPost = await Post.findById(id);
    if (!existingPost) {
        return res.status(404).json(new ApiError(404, "Post not found"));
    }
    
    if (!existingPost.userId.equals(req.user._id)) {
        return res.status(403).json(new ApiError(403, "Post can't be updated"));
    }


    // Update required fields validation (if provided)
    if (title && typeof title !== 'string') {
        return res.status(400).json(new ApiError(400, "Invalid Post title"));
    }


    // Perform the update
    const updatedPost = await Post.findByIdAndUpdate(
        id,
        {
            $set: {
                title,
            }
        },
        { new: true, runValidators: true }
    );

    if (!updatedPost) {
        return res.status(500).json(new ApiError(500, "Failed to update Post"));
    }

    return res.status(200).json(new ApiSuccess(updatedPost, 200, "Post updated successfully"));
});


const deletePost = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const post = await Post.findById(id);

    if (!post.userId.equals(req.user._id)) {
        return res.status(403).json(new ApiError(403, "Post can't be deleted"));
    }

    const deletedPost = await Post.findByIdAndDelete(id);

    if (!deletedPost) {
        return res.status(404).json(new ApiError(404, "Post not found"));
    }

    return res.status(200).json(new ApiSuccess(null, 200, "Post deleted successfully"));
});




const getPostById = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const post = await Post.findById(id);
    if (!post.userId.equals(req.user._id)) {
        return res.status(403).json(new ApiError(403, "Post can't be edited"));
    }

    if (!post) {
        return res.status(404).json(new ApiError(404, "Post not found"));
    }

    return res.status(200).json(new ApiSuccess(post, 200, "Post retrive successfully"));
});




export {
    createPost,
    getPostes,
    updatePost,
    deletePost,
    getPostById,
};