import mongoose from "mongoose";


// Define the FriendRequest Schema
const friendRequestSchema = new mongoose.Schema(
    {
        fromUser: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User', // who send the FriendRequest 
            required: true,
        },
        toUser: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User', // who receive the FriendRequest 
            required: true,
        },
        status: {
            type: String,
            enum: ['pending', 'accepted', 'rejected'],
            default: 'pending'
        },
    },
    { timestamps: true } // Adds createdAt and updatedAt fields automatically
);

// unique index 
friendRequestSchema.index({ fromUser: 1, toUser: 1 }, { unique: true });

// Create a FriendRequest Model
export const FriendRequest = mongoose.model('FriendRequest', friendRequestSchema);
