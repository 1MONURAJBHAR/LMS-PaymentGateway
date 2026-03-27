import jwt from "jsonwebtoken";
import { AppError } from "./error.middleware.js";
import { catchAsync } from "./error.middleware.js";
import { User } from "../models/user.model.js";

export const isAuthenticated = catchAsync(async (req, res, next) => {
  // Check if token exists in cookies
  const token = req.cookies.token;
  if (!token) {
    throw new AppError(
      "You are not logged in. Please log in to get access.",
      401,
    );
  }

  try {
    // Verify token
    const decoded = await jwt.verify(token, process.env.JWT_SECRET);

    // Add user ID to request
    req.id = decoded.userId;
    const user = await User.findById(req.id);
    if (!user) {
      throw new AppError("User not found", 404);
    }

    req.user = user;

    next();
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      throw new AppError("Invalid token. Please log in again.", 401);
    }
    if (error.name === "TokenExpiredError") {
      throw new AppError("Your token has expired. Please log in again.", 401);
    }
    throw error;
  }
});

/*
The restrictTo function is a Role-Based Access Control (RBAC) middleware. You use it in your route definitions right after your "protect" or "authentication" middleware to limit specific actions to certain types of users.

How to use it in your Routes
Since this function returns a middleware, you call it inside your route stack. Order matters: you must authenticate the user first (so req.user exists) before you can check their role.
*/

// Middleware for role-based access control
export const restrictTo = (...roles) => {
  return catchAsync(async (req, res, next) => {
    // roles is an array ['admin', 'instructor', 'student']
    if (!roles.includes(req.user.role)) {
      throw new AppError(
        "You do not have permission to perform this action",
        403,
      );
    }
    next();
  });
};

/*
How the Logic Works
...roles (Rest Parameter): This allows you to pass any number of arguments (e.g., restrictTo('admin') or restrictTo('admin', 'mod', 'editor')). It turns them into an array.

req.user.role: This assumes that your isAuthenticated middleware has already run, verified the JWT, found the user in the database, and attached them to the request object (req.user = currentUser).

The Check: It checks if the user's role exists within the allowed array.

If Yes: It calls next() and the user proceeds to the controller.
If No: It throws an AppError with a 403 Forbidden status code.
*/



// Optional authentication middleware
export const optionalAuth = catchAsync(async (req, res, next) => {
  try {
    const token = req.cookies.token;
    if (token) {
      const decoded = await jwt.verify(token, process.env.JWT_SECRET);
      req.id = decoded.userId;
    }
    next();
  } catch (error) {
    // If token is invalid, just continue without authentication
    next();
  }
});
