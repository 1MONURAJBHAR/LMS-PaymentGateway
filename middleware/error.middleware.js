/*
The catchAsync function is a higher-order function (a function that returns another function) designed to simplify error handling in Express.js routes.
In Express, when an error occurs inside an asynchronous function (using async/await), the error isn't automatically caught by the global error handler unless you manually pass it to next(error). Without catchAsync, your code would be littered with repetitive try...catch blocks.

How it Works Step-by-Step:
The Wrapper: You pass your asynchronous route handler (fn) into catchAsync.

The Return: It returns a standard Express middleware function: (req, res, next).

The Execution: When a request hits the route, it executes your function fn(req, res, next).

The Catch: Because fn is an async function, it returns a Promise. The .catch(next) at the end automatically catches any rejected promise (error) and forwards it to the next middleware—which in Express is usually your global error-handling function.
*/

// Error handler for async functions
export const catchAsync = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};

//Custom error class, to throw a standardized error
export class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith("4") ? "fail" : "error";
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}




// Global error handling middleware
export const errorHandler = (err, req, res, next) => {
    err.statusCode = err.statusCode || 500;
    err.status = err.status || 'error';

    if (process.env.NODE_ENV === 'development') {
        // Development error response
        res.status(err.statusCode).json({
            status: err.status,
            error: err,
            message: err.message,
            stack: err.stack
        });
    } else {
        // Production error response
        if (err.isOperational) {
            // Operational, trusted error: send message to client
            res.status(err.statusCode).json({
                status: err.status,
                message: err.message
            });
        } else {
            // Programming or other unknown error: don't leak error details
            console.error('ERROR 💥', err);
            res.status(500).json({
                status: 'error',
                message: 'Something went wrong!'
            });
        }
    }
};

// Handle specific MongoDB errors
export const handleMongoError = (err) => {
    if (err.name === 'CastError') {
        return new AppError(`Invalid ${err.path}: ${err.value}`, 400);
    }
    if (err.code === 11000) {
        const value = err.errmsg.match(/(["'])(\\?.)*?\1/)[0];
        return new AppError(`Duplicate field value: ${value}. Please use another value!`, 400);
    }
    if (err.name === 'ValidationError') {
        const errors = Object.values(err.errors).map(el => el.message);
        return new AppError(`Invalid input data. ${errors.join('. ')}`, 400);
    }
    return err;
};

//To centralize the JWT errors
// Handle JWT errors
export const handleJWTError = () => 
    new AppError('Invalid token. Please log in again!', 401);

export const handleJWTExpiredError = () => 
    new AppError('Your token has expired! Please log in again.', 401);
