const errorHandler = (err, req, res, next) => {
    const statusCode = err.statusCode || 500; // Default to 500 if no status code is provided

    res.status(statusCode).json({
        success: false,
        message: err.message || 'Internal Server Error', // Use error message or default
        errors: err.errors || [], // Additional error details, if provided
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined // Show stack trace in development only
    });
};

export default errorHandler;
