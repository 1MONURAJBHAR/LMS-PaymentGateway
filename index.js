import express from 'express';
import dotenv from 'dotenv';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize'
import hpp from 'hpp';
import cookieParser from 'cookie-parser';
import cors from "cors";
import connectDB from "./database/db.js";

import healthRouter from "./routes/health.routes.js"

// Load environment variables
dotenv.config();

// Connect to database
await connectDB();

const app = express();
const PORT = process.env.PORT;

//Global rate limiting


const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes).
  message: "Too many requests from this IP. Please try later"
});

//Security middlewares
// Apply the rate limiting middleware to all requests starting with /api.
app.use(helmet());
app.use(mongoSanitize());
app.use(hpp());
app.use('/api', limiter);
app.use(cookieParser());

//logging middleware
if (process.env.NODE_ENV === "development") {
    app.use(morgan("dev"));
}

//Global error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(err.status || 500).json({
        status: "error",
        message: err.message || "Internal server error",
        ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
    });
});


//cors configuration
app.use(cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "device-remember-token",
      "Access-Control-Allow-Origin",
      "Origin",
      "Accept",
    ],
}))


//API Routes
app.use("/health", healthRouter);



//Body parser middleware
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));


//It should always be at the bottom, 404 handler.
app.use((req, res) => {
    res.status(404).json({
        status: "error",
        message: "Route not found !!"
    })
})


app.listen(PORT, () => {
    console.log(`Server is running at port ${PORT} in ${process.env.NODE_ENV} mode`);    
})
