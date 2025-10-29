import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js'
import { User } from '../models/user.model.js';
import { upload } from '../middlewares/multer.middleware.js';
import { uploadToCloudinary } from '../utils/cloudinary.js'
import ApiResponse from '../utils/ApiResponse.js'
import jwt from 'jsonwebtoken'

const generateAccessAndRefreshToken = async(userId) => {
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({validateBeforeSave: false})

        return {accessToken, refreshToken}

    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating the access and refresh token")
    }
}
const registerUser = asyncHandler(async (req, res)=>{
    // for testing we can use:
    // return res.status(200).json({
    //     message: "OK"
    // })
    // get user details from frontend
    //validation - not empty
    // check if user is already exists: username, email
    // upload them to cloudinary
    // create user object - create empty DB
    // remove password from refresh token field from response
    // check for user creation
    //return response

    const {fullName, email, username, password} = req.body
    console.log("email:", email)
    if ([fullName, email, username, password].some((field)=>
    field?.trim()==="")) {
        throw new ApiError(400, "All fields are required!")
    }
    const existedUser = await User.findOne({
        $or: [{username}, {email}]
    })
    if(existedUser){
        throw new ApiError(409, "User with email or username already exists")
    }
    // Check if avatar is provided as file upload or URL
    let avatar, coverImage;
    
    if (req.files?.avatar || req.file?.path) {
        // File upload path
        const avatarLocalPath = Array.isArray(req.files?.avatar) ? req.files.avatar[0]?.path : req.file?.path
        const coverImageLocalPath = Array.isArray(req.files?.coverImage) ? req.files.coverImage[0]?.path : undefined

        if (!avatarLocalPath) {
            throw new ApiError(400, "Avatar file is required")
        }
        
        avatar = await uploadToCloudinary(avatarLocalPath)
        coverImage = await uploadToCloudinary(coverImageLocalPath)
        if(!avatar){
            throw new ApiError(400, "Avatar file is required")
        }
    } else if (req.body.avatar) {
        // URL path - directly use the provided URLs
        avatar = { url: req.body.avatar }
        coverImage = req.body.coverImage ? { url: req.body.coverImage } : null
    } else {
        throw new ApiError(400, "Avatar is required (either as file upload or URL)")
    }

    const user = await User.create({
        fullname: fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()
    })

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if (!createdUser) {
        throw new ApiError(500, "Some thing went wrong while registering the user!")
    }

    return res.status(201).json(
        new ApiResponse(201, createdUser, "User registered successfully!")
    )
})

const loginUser = asyncHandler(async (req, res) => {
    // req body -> data 
    // username or email
    // find the user
    // password check
    // access and refresh token
    // send cookies

    const {email, username, password} = req.body
    if(!username && !email){
        throw new ApiError(400, "username or email is required !")
    }
    
    const user = await User.findOne({
        $or: [{username}, {email}]
    })

    if(!user){
        throw new ApiError(404, "User does not exist")
    }

    const isPasswordValid = await user.isPasswordCorrect(password)

    if(!isPasswordValid){
        throw new ApiError(401, "Invalid user credentials !")
    }

    const {accessToken, refreshToken} = await generateAccessAndRefreshToken(user._id)

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    const options = {
        httpOnly: true,
        secure: true
    }
    return res.status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new ApiResponse(
            200,
            {
                user: loggedInUser, accessToken,
                refreshToken
            },
            "user logged in successfully !"
        )
    )
})

const logoutUser = asyncHandler(async(req, res, next)=>{
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set:{
                refreshToken: undefined
            }
        },
        {
            new: true
        }
    )
    const options = {
        httpOnly: true,
        secure: true
    }
    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User Logged Out"))
})

const refereshAccessToken = asyncHandler(async(req, res)=>{
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if(!incomingRefreshToken){
        throw new ApiError(401, "unauthorized request")
    }

    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        )
    
        const user = await User.findById(decodedToken?._id)
    
        if(!user){
            throw new ApiError(401, "Invalid refresh token")
        }
    
        if(incomingRefreshToken !== user?.refereshAccessToken){
            throw new ApiError(401, "Refresh Token is expiered or used")
        }
    
        const options = {
            httpOnly: true,
            secure: true
        }
    
        const {accessToken, newRefreshToken} = await generateAccessAndRefreshToken(user._id)
        return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", newRefreshToken, options)
        .json(
            new ApiResponse(200, 
                {accessToken, refreshToken: newRefreshToken},
                "Access token refreshed successfully!"
            )
        )
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token")
    }
})

const changeCurrentPassword = asyncHandler(async(req, res)=>{
    const {oldPassword, newPassword} = req.body
    const user = await User.findById(req.user?._id)
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if(!isPasswordCorrect){
        throw new ApiError(400, "Old password is incorrect")
    }
    user.password = newPassword
    await user.save({validateBeforeSave: false})

    return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password changed successfully"))
})

const getCurrentUser = asyncHandler(async(req, res)=>{
    return res
    .status(200)
    .json(200, req.user, "current user fetched successfully!")
})

const updateAccoounDetails = asyncHandler(async(req, res)=>{
    const {fullname, email} = req.body
    if(!fullname || !email){
        throw new ApiError(400, "all fields are rquired")
    }
    const user = User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                fullname,
                email
            }
        },
        {new: true}
    ).select("-password")
    return res
    .status(200)
    .json(new ApiResponse(200, user, "Account details updated successfully!"))
})

const updateUserAvatar = asyncHandler(async(req, res)=>{
    const avatarLocalPath = req.file?.path
    if(!avatarLocalPath){
        throw new ApiError(400, "Avatar file is missing!")
    }
    const avatar  = await uploadToCloudinary(avatarLocalPath)
    if(!avatar.url){
        throw new ApiError(400, "Error while uploading on avatar")
    }
    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                avatar: avatar.url
            }
        },
        {new: true}
    ).select("-password")
    return res
    .status(200)
    .json(new ApiResponse(200, user, "Avatar updated successfully!"))
}
)
const updateUserCoverImage = asyncHandler(async(req, res)=>{
    const coverImageLocalPath = req.file?.path
    if(!coverImageLocalPath){
        throw new ApiError(400, "Cover Image file is missing!")
    }
    const coverImage  = await uploadToCloudinary(coverImageLocalPath)
    if(!coverImage.url){
        throw new ApiError(400, "Error while uploading on cover image")
    }
    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                coverImage: coverImage.url
            }
        },
        {new: true}
    ).select("-password")
    return res
    .status(200)
    .json(new ApiResponse(200, user, "Cover image updated successfully!"))
}
)

export { registerUser,
    loginUser,
    logoutUser,
    refereshAccessToken,
    getCurrentUser,
    updateAccoounDetails,
    updateUserAvatar,
    updateUserCoverImage
}   