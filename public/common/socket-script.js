const socket = io();

// =======================
// SOCKET CONNECTION
// =======================
socket.on("connect", () => {
    console.log("Connected to socket server");
});

socket.on("disconnect", (reason) => {
    console.log("Socket disconnected:", reason);
});
