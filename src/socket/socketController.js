import { verifySocketJWT } from '../middlewares/authMiddleware.js';
import { User } from "../models/userModel.js";
import { FriendRequest } from "../models/friendRequestModel.js";
import { Message } from '../models/messageModel.js';

const socketController = (io) => {
    const onlineUsers = {};

    io.use(async (socket, next) => {
        try {
            let token = socket.handshake.auth.token || socket.handshake.query.token;
            // if token is not available try to get from cookies
            if (!token) {
                // Access cookies
                const rawCookie = socket.handshake.headers?.cookie || "";
                const cookies = Object.fromEntries(
                    rawCookie.split("; ").map(c => {
                        const [key, ...v] = c.split("=");
                        return [key, v.join("=")];
                    })
                );
                token = cookies.accessToken;
            }
            const user = await verifySocketJWT(token);
            socket.user = user;
            next();
        } catch (err) {
            console.error("Socket JWT verification failed", err.message);
            next(new Error("Unauthorized"));
        }
    });

    io.on('connection', async (socket) => {
        const currentUserId = socket.user.id;
        console.log(`socket.user ${currentUserId}: `, socket.id);

        // -- Connection & Presence ---
        onlineUsers[currentUserId] = onlineUsers[currentUserId] || [];
        onlineUsers[currentUserId].push(socket.id);

        // Broadcast presence (when user came online)
        io.emit('user_presence', { userId: currentUserId, online: true });
        //  Update DB status to online 
        await User.findByIdAndUpdate(currentUserId, { onlineStatus: true });

        //  Friend Request Handing ---

        // frontend: socket.emit('friend:send_request', 'targetUserId');
        socket.on('friend:send_request', async (toUserId) => {
            // Check if request already exists 

            const existingRequest = await FriendRequest.findOne({
                $or: [
                    { fromUser: currentUserId, toUser: toUserId },
                    { fromUser: toUserId, toUser: currentUserId }
                ]
            });

            if (existingRequest) {
                socket.emit('error:friend_request', 'Friend request already exists or is pending.');
                return;
            }

            if (currentUserId === toUserId) {
                socket.emit('error:friend_request', 'Cannot send request to yourself.');
                return;
            }

            const newRequest = await FriendRequest.create({ fromUser: currentUserId, toUser: toUserId });

            // Notify target user if online
            const targetSockets = onlineUsers[toUserId] || [];
            targetSockets.forEach(sid => io.to(sid).emit('friend:request_received', {
                requestId: newRequest._id,
                fromUser: currentUserId
            }));
        });


        // frontend socket.emit('friend:request_response', { requestId, action: 'accept' | 'delete' });
        socket.on('friend:request_response', async ({ requestId, action }) => {
            const request = await FriendRequest.findById(requestId);

            if (!request || request.toUser.toString() !== currentUserId) {
                socket.emit('error:friend_response', 'Invalid request or not authorized.');
                return;
            }

            const fromUserId = request.fromUser.toString();
            const toUserId = request.toUser.toString();

            if (action === 'accept') {
                // Check if they are already friends
                const isAlreadyFriends = await User.exists({_id: fromUserId,friends: toUserId});
                if (isAlreadyFriends) {
                    socket.emit('error:friend_request', 'You are already friends.');
                    return;
                }

                // Update both users to become friends
                await Promise.all([
                    User.updateOne({ _id: fromUserId },{ $addToSet: { friends: toUserId } }),
                    User.updateOne({ _id: toUserId },{ $addToSet: { friends: fromUserId } })
                ]);


                // Delete the pending request
                await FriendRequest.deleteOne({ _id: requestId });

                //  Get friend names for notification 
                const [requester, accepter] = await Promise.all([
                    User.findById(fromUserId, 'fullName'),
                    User.findById(toUserId, 'fullName')
                ]);

                //  Notify both users
                const requesterSockets = onlineUsers[fromUserId] || [];
                requesterSockets.forEach(sid => io.to(sid).emit('friend:accepted', {
                    newFriendId: toUserId,
                    fullName: accepter?.fullName
                }));

                socket.emit('friend:accepted', {
                    newFriendId: fromUserId,
                    fullName: requester?.fullName
                });

            } else if (action === 'delete') {
                // Delete the pending request
                await FriendRequest.deleteOne({ _id: requestId });

                // Notify the requester
                const requesterSockets = onlineUsers[fromUserId] || [];
                requesterSockets.forEach(sid => io.to(sid).emit('friend:rejected', {
                    byUserId: toUserId
                }));
            }
        });

        //  One-to-One Chat Messaging ---

        // fronten: socket.emit('chat:send_message', { toUserId, content });
        socket.on('chat:send_message', async ({ toUserId, content }) => {
            const senderId = currentUserId;

            //  Validate Friendship 
            const sender = await User.findById(senderId, 'friends');
            if (!sender || !sender.friends.map(f => f.toString()).includes(toUserId)) {
                socket.emit('error:chat', 'You are not friends with this user or user does not exist.');
                return;
            }

            //  Save the message to DB 
            const newMessage = await Message.create({
                sender: senderId,
                receiver: toUserId,
                content: content,
            });

            // Prepare message payload
            const messagePayload = {
                messageId: newMessage._id,
                senderId: senderId,
                content: content,
                timestamp: newMessage.createdAt,
            };

            //  Send the message to the receiver's online sockets
            const receiverSockets = onlineUsers[toUserId] || [];
            receiverSockets.forEach(sid => {
                io.to(sid).emit('chat:receive_message', messagePayload);
            });
        });

        //  Disconnect Logic --- remove from object
        socket.on('disconnect', async () => {
            console.log(`socket user disconnected: ${currentUserId}`, socket.id);

            //  Remove socket ID from onlineUsers map
            if (onlineUsers[currentUserId]) {
                onlineUsers[currentUserId] = onlineUsers[currentUserId].filter(sid => sid !== socket.id);
            }

            //  Broadcast user offline ONLY if all their sockets are gone
            if (onlineUsers[currentUserId] && onlineUsers[currentUserId].length === 0) {
                delete onlineUsers[currentUserId];
                io.emit('user_presence', { userId: currentUserId, online: false });

                //  Update DB status to offline 
                await User.findByIdAndUpdate(currentUserId, { onlineStatus: false, lastSeen: new Date() });
            }
        });
    });
};

export default socketController;