import dotenv from "dotenv";
import connectDatabase from "./src/database/connection.js";
import app from "./app.js";
import { createServer } from "http"; // Import createServer for Socket.io
import { Server } from "socket.io"; // Import Socket.io
import socketController from "./src/socket/socketController.js";
import firebaseInit from "./src/config/firebase.js";
import databaseSeeder from "./src/database/databaseSeeder.js";




dotenv.config({
    path: "./.env"
});

const port = process.env.PORT;

// If database is connected, start the Express server and Socket.io
connectDatabase().then(async () => {
    // await databaseSeeder();

    // init firebase 
    await firebaseInit();


    const httpServer = createServer(app);
    // Attach socket.io to the HTTP server
    const io = new Server(httpServer, {
        cors: {
            origin: "*",  // Allow all origins for simplicity (change for production)
            methods: ["GET", "POST"],
            credentials: true
        }
    });

    // init 
    socketController(io);

    await databaseSeeder();

    // Start the server on port 5050
    httpServer.listen(port, () => {
        console.log(`Server running on http://localhost:${port}`);
    });


}).catch((error) => {
    console.log("MongoDB connection Failed: ", error);
});
