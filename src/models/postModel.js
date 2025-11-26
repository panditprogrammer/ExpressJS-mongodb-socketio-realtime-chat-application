import mongoose from "mongoose";


// Define the Post Schema
const postSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User', // 'User' model to associate the Post 
            required: true,
        },
        title: {
            type: String,
            required: true,
        },
        image: {
            type: String,
        },
        video: {
            type: String,
        },
    },
    { timestamps: true } // Adds createdAt and updatedAt fields automatically
);


// Add post hook to delete documents when a post is deleted
postSchema.post('remove', async function () {
    try {
        if (this.image) {
            deleteLocalFile(this.image)
        }

        if (this.video) {
            deleteLocalFile(this.video)
        }

    } catch (err) {
        console.error("Error deleting post related document:", err);
    }
});

// Create a Post Model
export const Post = mongoose.model('Post', postSchema);
