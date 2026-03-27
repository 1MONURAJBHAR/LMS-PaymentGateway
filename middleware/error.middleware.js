/*
Gemini said
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

//To throw a standardized error
export class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith("4") ? "fail" : "error";
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}