import { asyncHandler } from "../utilities/asyncHandler.js";
import { ApiError, ApiSuccess, isApiRequest, isUserUrl } from '../utilities/apiResponse.js';
import { validateFields } from "../utilities/validator.js";



const homePage = asyncHandler(async (req, res) => {

    if (isApiRequest(req.originalUrl)) {
        return res.status(200).json({ status: true });
    }

    

    return res.render('index', { title: 'Home Page' });
});


const listingsPage = asyncHandler(async (req, res) => {
    // Validate and set default values for page and limit
    const page = parseInt(req.query.page) > 0 ? parseInt(req.query.page) : 1;
    const limit = 16;

    const skip = (page - 1) * limit;

    const totalItems = await UserBusiness.countDocuments();

    // Retrieve documents with pagination
    const businessUsers = await UserBusiness.find({})
        .populate({
            path: "userId",
            select: "fullName"
        })
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit);

    const totalPages = Math.ceil(totalItems / limit);

    // Render the template with pagination details
    return res.render('business-listing', {
        businessUsers,
        currentPage: page,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
        nextPage: page + 1,
        previousPage: page - 1
    });
});




// contact page 
const getContacts = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const allContacts = await ContactUs.find().sort({ createdAt: 1 });

    if (!isApiRequest(req.originalUrl) && req.method === "GET") {

        if (isUserUrl(req.originalUrl)) {
            return res.render("dashboard/contacts", { allContacts });
        }

        return res.render("pages/contact-us", { CAPTCHA_SITE_KEY });
    }

    return res.status(200).json(new ApiSuccess(allContacts, 200, "contacts fetch successfully"));
})



const createContact = asyncHandler(async (req, res) => {

    const { fullName, emailOrPhone, message } = req.body;

    const validation = validateFields(req, res, {
        fullName: { required: true, message: "fullName is required" },
        emailOrPhone: { required: true, message: "Email or phone number is required" },
        message: { required: true, message: "Message cannot be empty" },
    })

    if (!validation) {
        if (isApiRequest(req.originalUrl)) {
            return res.status(400).json(new ApiError(400, res.locals.message.text));
        }
        return res.render("pages/contact-us");
    }

    if (message.length > 500) {
        return res.status(400).json(new ApiError(400, "Max 500 characters allowed!"));
    }

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    let email, phoneNumber;
    if (emailRegex.test(emailOrPhone)) {
        email = emailOrPhone;
    } else {
        phoneNumber = emailOrPhone;
    }

    const newContact = await ContactUs.create({
        fullName,
        email,
        phoneNumber,
        message,
    });

    return res.status(201).json(new ApiSuccess(null, 201, "Thank you for your message! We'll get back to you soon."));
})


const deleteContacts = asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!id) {
        return res.status(400).json(new ApiError(400, "contact ID is missing"));
    }
    const deletedcontact = await ContactUs.deleteOne({ _id: id });
    if (deleteContacts) {
        return res.status(200).json(new ApiSuccess(null, 200, "Contact deleted permanently"));

    }
    return res.status(500).json(new ApiError(500, "failed to delete contact"));
})

// contact page end




export { homePage, listingsPage, createContact, getContacts, deleteContacts }