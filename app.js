import cookieParser from "cookie-parser";
import cors from "cors"
import express from "express"
import helmet from "helmet";
import session from "express-session";
import { API_PREFIX, APP_NAME } from "./src/constants.js";
import webPush from 'web-push';
import { globalAuthCheck } from "./src/middlewares/authMiddleware.js";




const app = express();


// 1. Core Express Settings & Trust Proxy (Highest Priority)
// These don't directly process requests but configure Express's behavior
app.set('view engine', 'ejs');
app.set('trust proxy', 1); // Essential when behind a reverse proxy like Nginx

// 2. Security & Basic Request Parsing (Early - before anything else relies on parsed data)
// These should generally come before most other middleware to apply security
// and parse basic request components like cookies and body.

app.use(helmet({
    contentSecurityPolicy: false // Reconsider enabling this if possible for better security
}));

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}));

app.use(cookieParser()); // Parses cookies from the request headers

// 3. Session Middleware (Relies on cookies, so comes after cookieParser)
app.use(
    session({
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: false,
        cookie: {
            secure: process.env.NODE_ENV === "production",
            httpOnly: true,
            maxAge: 15 * 24 * 60 * 60 * 1000,
            sameSite: 'Strict',
        },
    })
);



// 4. Body Parsers (Relies on raw request body, comes after session if session needs body)
// These should come before any routes or middleware that need to access req.body
app.use(express.json({
    limit: "100mb" // Adjust as needed, 200MB is very large
}));
app.use(express.urlencoded({ extended: true, limit: "20kb" }));

// 5. Static File Serving (Critical: Should come *before* any authentication or rate limiting
//    if you want public assets to be served without those checks)
app.use(express.static("public"));

// Your custom full URL middleware (doesn't change req/res much, so flexible)
app.use((req, res, next) => {
    var fullUrl = req.protocol + '://' + req.get('host') + req.originalUrl;
    // You might want to actually *do* something with fullUrl here, like logging it
    next();
});



// 8. Global Variable/Local Setup (Can be flexible, but often useful before auth or routes)
// This middleware populates res.locals, which is good to have before rendering views
// or if subsequent middleware/routes might use these locals.
app.use((req, res, next) => {
    res.locals.websiteName = APP_NAME;
    res.locals.request = req;
    res.locals.data = {};
    res.locals.messages = {};
    res.locals.message = { text: null, type: null };
    res.locals.fields = {};
    res.locals.ogData = null;


    const path = req.originalUrl.split('?')[0];
    const cleanedPath = path.replace(/\/p\/[a-f0-9]{24}/, '');
    const titleParts = cleanedPath.replace(/^\/+/, '').split('/');
    const generatedTitle = titleParts
        .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
        .join(' ') || APP_NAME;
    res.locals.websiteTitle = generatedTitle;

    next();
});

// 9. Global Authentication/Authorization (Should come before routes that require auth)
// This is where globalAuthCheck fits well. It runs for all requests that haven't
// been handled by static files, before they hit your specific API or page routes.
app.use(globalAuthCheck);

// log the requests 

// 10. Web Push Setup (This is a setup, not a middleware, so placement doesn't affect request flow)
// It only sets up details for future web push operations, not processing incoming requests.
//webPush.setVapidDetails(
//    'mailto:panditprogrammer@gmail.com',
 //   process.env.WEB_PUSH_VAPID_PUBLIC_KEY,
 //   process.env.WEB_PUSH_VAPID_PRIVATE_KEY
//);




//--------------- routes -----------------
import userRouter from "./src/routes/userRoutes.js";
import utilityRouter from "./src/routes/utilityRoutes.js";
import notificationRouter from "./src/routes/notificationRoutes.js";
import pagesRouter from "./src/routes/pagesRoutes.js";
import postRouter from "./src/routes/postRoutes.js";
import friendRequestRouter from "./src/routes/friendRequestRoutes.js";
import chatMessageRouter from "./src/routes/chatMessageRoutes.js";

app.use(`/`, pagesRouter);

// Register routes
app.use(`/users`, userRouter);
app.use(`/notifications`, notificationRouter);


// api for mobile
app.use(`${API_PREFIX}/friend-requests`, friendRequestRouter);
app.use(`${API_PREFIX}/chats`, chatMessageRouter);

app.use(`${API_PREFIX}/posts`, postRouter);
app.use(`${API_PREFIX}/users`, userRouter);
app.use(`${API_PREFIX}/utilities`, utilityRouter);
app.use(`${API_PREFIX}/notifications`, notificationRouter);




// app.use(errorHandler);
export default app;
