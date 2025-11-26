class ApiSuccess {
    constructor(data = null, statusCode = 200, message = "success", success = true,) {
        this.statusCode = statusCode
        this.success = success
        this.message = message
        this.data = data
    }
}


class ApiError {
    constructor(statusCode = 500, message = "something went wrong", success = false,) {
        this.statusCode = statusCode
        this.success = success
        this.message = message
    }
}

function isApiRequest(url) {
    return url.startsWith("/api/");
}

function isUserUrl(url) {
    return url.startsWith("/users");
}

function isDriverUrl(url) {
    return url.startsWith("/drivers");
}

export { ApiSuccess, ApiError, isApiRequest ,isUserUrl,isDriverUrl}