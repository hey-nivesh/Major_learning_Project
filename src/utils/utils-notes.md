# 🧠 Backend Utils Folder Notes --- Express, MongoDB, Cloudinary

## 🗂 Folder: `utils/`

The **utils** folder holds helper functions and reusable logic that keep
your backend modular, clean, and production-ready.\
This folder improves maintainability and reduces code duplication.

------------------------------------------------------------------------

## 1️⃣ `ApiError.js` --- Custom Error Handler

### 📖 Definition

A **custom error class** extends the built-in `Error` class to provide
structured and consistent error objects.

### 💡 Purpose

To throw and manage API errors in a unified way rather than sending
random messages.

### 🧩 Code Summary

``` js
class ApiError extends Error {
  constructor(statusCode, message = 'Something went wrong', errors = [], stack = '') {
    super(message);
    this.statusCode = statusCode;
    this.message = message;
    this.data = null;
    this.success = false;
    this.errors = errors;
    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}
export { ApiError };
```

### 🧠 Explanation

-   `extends Error`: Inherits base JS error behavior.
-   `statusCode`: HTTP status code like 400, 404, 500.
-   `message`: Error message for debugging and client use.
-   `errors`: Array of validation or field-level errors.
-   `Error.captureStackTrace`: Captures the error call stack for
    debugging.

### ✅ Example Usage

``` js
if (!user) throw new ApiError(404, "User not found");
```

------------------------------------------------------------------------

## 2️⃣ `ApiResponse.js` --- Standardized Success Response

### 📖 Definition

A **response wrapper class** for consistent success messages and data
structure.

### 💡 Purpose

To maintain uniform responses across APIs for easier frontend
consumption.

### 🧩 Code Summary

``` js
class ApiResponse {
  constructor(statusCode, data, message = "Success") {
    this.statusCode = statusCode;
    this.data = data;
    this.message = message;
    this.success = statusCode < 400;
  }
}
export default ApiResponse;
```

### 🧠 Explanation

-   `statusCode`: HTTP code (200 OK, 201 Created).
-   `data`: The actual payload or returned content.
-   `message`: A short success message.
-   `success`: Boolean that automatically checks if the code \< 400.

### ✅ Example Usage

``` js
res.status(200).json(new ApiResponse(200, { user }, "User fetched successfully"));
```

------------------------------------------------------------------------

## 3️⃣ `asyncHandler.js` --- Async Error Wrapper

### 📖 Definition

A **higher-order function (HOF)** that catches async errors
automatically, removing the need for repetitive try/catch blocks.

### 💡 Purpose

To handle unhandled promise rejections gracefully and avoid backend
crashes.

### 🧩 Code Summary

``` js
const asyncHandler = (requestHandler) => {
  return (req, res, next) => {
    Promise.resolve(requestHandler(req, res, next)).catch((error) => next(error));
  };
};
export { asyncHandler };
```

### 🧠 Explanation

-   `Promise.resolve()`: Ensures returned value is always a promise.
-   `.catch(next)`: Passes any caught error to Express middleware.
-   Keeps route controllers clean and short.

### ✅ Example Usage

``` js
app.get('/user/:id', asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, "User not found");
  res.status(200).json(new ApiResponse(200, user));
}));
```

------------------------------------------------------------------------

## 4️⃣ `cloudinary.js` --- Cloud File Upload Utility

### 📖 Definition

A function that uploads local files to Cloudinary and ensures failed
uploads clean up local temporary files.

### 💡 Purpose

To integrate secure cloud-based media storage (images/videos) and
prevent server disk clutter.

### 🧩 Code Summary

``` js
import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_CLOUD_API_KEY,
  api_secret: process.env.CLOUDINARY_CLOUD_API_SECRET
});

const uploadToCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) return null;
    const response = await cloudinary.uploader.upload(localFilePath, { resource_type: 'auto' });
    console.log("File uploaded:", response.url);
    return response;
  } catch (error) {
    fs.unlinkSync(localFilePath); // delete local file if upload fails
    return null;
  }
};

export { uploadToCloudinary };
```

### 🧠 Explanation

-   `cloudinary.config()`: Connects app using environment credentials.
-   `uploader.upload()`: Uploads the file to Cloudinary.
-   `resource_type: 'auto'`: Detects file type automatically.
-   `fs.unlinkSync()`: Deletes local file after upload or failure
    (prevents memory leaks).

### ✅ Example Usage

``` js
const upload = await uploadToCloudinary(req.file?.path);
if (!upload) throw new ApiError(500, "Cloudinary upload failed");
res.status(200).json(new ApiResponse(200, { url: upload.url }, "Upload successful"));
```

------------------------------------------------------------------------

## ⚙️ Combined Workflow in Production

1.  **asyncHandler** wraps every route → catches async errors.
2.  **ApiError** used to throw structured errors.
3.  **ApiResponse** ensures all responses look the same.
4.  **cloudinary** safely handles file uploads and cleanup.

------------------------------------------------------------------------

## 🧾 Summary Table

  ----------------------------------------------------------------------------------
  File                Purpose          Key Concept           Example Use
  ------------------- ---------------- --------------------- -----------------------
  `ApiError.js`       Custom           Custom Error Class    Throw 404/500/400
                      structured error                       
                      handling                               

  `ApiResponse.js`    Standard success Response Wrapper      API Responses
                      format                                 

  `asyncHandler.js`   Handles async    Higher Order Function Wrapping routes
                      errors                                 

  `cloudinary.js`     Uploads to       Cloud Integration +   Media Upload APIs
                      Cloudinary       Cleanup               
                      safely                                 
  ----------------------------------------------------------------------------------

------------------------------------------------------------------------

### 🚀 Takeaway

These utility files are foundational for any **Express.js production
backend**.\
They ensure your app remains **robust, maintainable, and scalable** ---
a standard expected in professional development environments.
