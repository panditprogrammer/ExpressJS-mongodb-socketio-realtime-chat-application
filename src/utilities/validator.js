import mongoose from "mongoose";

export function validateEmail(email) {
    var emailRegex = /^[a-zA-Z0-9._%+-]+(?:[a-zA-Z0-9._%+-]*[a-zA-Z0-9]+)@([a-zA-Z0-9-]+\.[a-zA-Z]{2,})$/;
    return emailRegex.test(email);
}

export function isValidPassword(password) {
    const errors = [];

    if (password.length < 8) {
        errors.push("Password must be at least 8 characters.");
    }
    if (!/[A-Z]/.test(password)) {
        errors.push("Password must contain at least one uppercase letter.");
    }
    if (!/[a-z]/.test(password)) {
        errors.push("Password must contain at least one lowercase letter.");
    }
    if (!/[0-9]/.test(password)) {
        errors.push("Password must contain at least one number.");
    }
    if (!/[\W_]/.test(password)) {
        errors.push("Password must contain at least one special character.");
    }

    return errors;
}

export function isValidInput(field) {

    if (field === undefined || field === "") {
        return false;
    }

    if (field && typeof field === "string" && (field.trim() === "" || field.trim() === null)) {
        return false;
    }

    return true;
}


export function validateFields(req, res, options = {}) {

    for (let field in options) {

        if (options[field] && options[field].required) {

            if (field == "email" && (!validateEmail(req.body[field]))) {

                res.locals.fields = req.body;
                // add error messages for views
                res.locals.messages[field] = options[field].message;
                res.locals.message.type = false;
                res.locals.message.text = options[field].message;
                return false;
            }
            if (field == "phoneNumber" && (req.body[field].length != 10)) {
                res.locals.fields = req.body;
                // add error messages for views
                res.locals.messages[field] = options[field].message;
                res.locals.message.type = false;
                res.locals.message.text = options[field].message;
                return false;
            }

            if (isValidInput(req.body[field])) {
                // remove message from valid field 
                options[field].message = null;

            } else {
                res.locals.fields = req.body;
                // add error messages for views
                res.locals.messages[field] = options[field].message;
                res.locals.message.type = false;
                res.locals.message.text = options[field].message;
                return false;
            }
        }
    }
    return true;
}

export function isValidMongooseId(id) {
    return mongoose.Types.ObjectId.isValid(id);
}