const checkRequestOrigin = function allowOnlyBizmapia(req, res, next) {
    try {
        const origin = req.get('origin') || req.get('referer') || '';
        const allowedDomain = 'bizmapia.com';

        // Check if the origin or referer contains your domain
        if (origin.includes(allowedDomain)) {
            return next();
        }

        // Optionally log unauthorized attempts
        return res.status(403).json({
            success: false,
            message: 'Access denied: This API is restricted to bizmapia.com requests only.'
        });
    } catch (err) {
        console.error('Origin validation error:', err);
        return res.status(500).json({
            success: false,
            message: 'Internal server error while validating origin.'
        });
    }
};

export default checkRequestOrigin;