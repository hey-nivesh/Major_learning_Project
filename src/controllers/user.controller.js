import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js'
import { User } from '../models/user.model.js';
import { upload } from '../middlewares/multer.middleware.js';
import { uploadToCloudinary } from '../utils/cloudinary.js'
import ApiResponse from '../utils/ApiResponse.js'
import jwt from 'jsonwebtoken'
import mongoose from 'mongoose';

const generateAccessAndRefreshToken = async (userId) => {
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false })

        return { accessToken, refreshToken }

    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating the access and refresh token")
    }
}
const registerUser = asyncHandler(async (req, res) => {
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

    const { fullName, email, username, password } = req.body
    console.log("email:", email)
    if ([fullName, email, username, password].some((field) =>
        field?.trim() === "")) {
        throw new ApiError(400, "All fields are required!")
    }
    const existedUser = await User.findOne({
        $or: [{ username }, { email }]
    })
    if (existedUser) {
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
        if (!avatar) {
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

    const { email, username, password } = req.body
    if (!username && !email) {
        throw new ApiError(400, "username or email is required !")
    }

    const user = await User.findOne({
        $or: [{ username }, { email }]
    })

    if (!user) {
        throw new ApiError(404, "User does not exist")
    }

    const isPasswordValid = await user.isPasswordCorrect(password)

    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid user credentials !")
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id)

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

const logoutUser = asyncHandler(async (req, res, next) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
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

const refereshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if (!incomingRefreshToken) {
        throw new ApiError(401, "unauthorized request")
    }

    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        )

        const user = await User.findById(decodedToken?._id)

        if (!user) {
            throw new ApiError(401, "Invalid refresh token")
        }

        if (incomingRefreshToken !== user?.refereshAccessToken) {
            throw new ApiError(401, "Refresh Token is expiered or used")
        }

        const options = {
            httpOnly: true,
            secure: true
        }

        const { accessToken, newRefreshToken } = await generateAccessAndRefreshToken(user._id)
        return res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", newRefreshToken, options)
            .json(
                new ApiResponse(200,
                    { accessToken, refreshToken: newRefreshToken },
                    "Access token refreshed successfully!"
                )
            )
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token")
    }
})

const changeCurrentPassword = asyncHandler(async (req, res) => {
    const { oldPassword, newPassword } = req.body
    const user = await User.findById(req.user?._id)
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if (!isPasswordCorrect) {
        throw new ApiError(400, "Old password is incorrect")
    }
    user.password = newPassword
    await user.save({ validateBeforeSave: false })

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Password changed successfully"))
})

const getCurrentUser = asyncHandler(async (req, res) => {
    return res
        .status(200)
        .json(200, req.user, "current user fetched successfully!")
})

const updateAccoounDetails = asyncHandler(async (req, res) => {
    const { fullname, email } = req.body
    if (!fullname || !email) {
        throw new ApiError(400, "all fields are rquired")
    }
    const user = User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullname,
                email
            }
        },
        { new: true }
    ).select("-password")
    return res
        .status(200)
        .json(new ApiResponse(200, user, "Account details updated successfully!"))
})

const updateUserAvatar = asyncHandler(async (req, res) => {
    const avatarLocalPath = req.file?.path;
    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is missing!");
    }

    const user = await User.findById(req.user?._id);
    if (!user) {
        throw new ApiError(404, "User not found!");
    }

    let oldPublicId = null;
    if (user.avatar && user.avatar.includes("cloudinary.com")) {
        const parts = user.avatar.split("/");
        const fileName = parts[parts.length - 1];
        oldPublicId = fileName.split(".")[0];
    }

    const avatar = await uploadToCloudinary(avatarLocalPath);
    if (!avatar.url) {
        throw new ApiError(400, "Error while uploading avatar!");
    }

    if (oldPublicId) {
        try {
            await cloudinary.uploader.destroy(oldPublicId);
        } catch (error) {
            console.error("Error deleting old avatar:", error);
        }
    }

    const updatedUser = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                avatar: avatar.url,
            },
        },
        { new: true }
    ).select("-password");

    return res
        .status(200)
        .json(new ApiResponse(200, updatedUser, "Avatar updated successfully!"));
}
)

const updateUserCoverImage = asyncHandler(async (req, res) => {
    const coverImageLocalPath = req.file?.path
    if (!coverImageLocalPath) {
        throw new ApiError(400, "Cover Image file is missing!")
    }
    const coverImage = await uploadToCloudinary(coverImageLocalPath)
    if (!coverImage.url) {
        throw new ApiError(400, "Error while uploading on cover image")
    }
    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                coverImage: coverImage.url
            }
        },
        { new: true }
    ).select("-password")
    return res
        .status(200)
        .json(new ApiResponse(200, user, "Cover image updated successfully!"))
}
)

const getUserChannelProfile = asyncHandler(async (req, res) => {
    const { username } = req.params
    if (!username?.trim()) {
        throw new ApiError(400, "username is missing!")
    }
    const channel = await User.aggregate([
        {
            $match: {
                username: username?.toLowerCase()
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "+_id",
                foreignField: "channel",
                as: "subscribers"
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "+_id",
                foreignField: "subscriber",
                as: "subscribedTO"
            }
        },
        {
            $addFields: {
                subscriberCount:{
                    $size: "$subscribers" 
                },
                channelSubscribedToCount:{
                    $size: "$subscribedTO"
                },
                isSubscribed: {
                    $cond:{
                        if: {$in: [req.user?._id, "$subscribers.subscriber"]},
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project:{
                fullName: 1,
                username: 1,
                subscriberCount: 1,
                channelSubscribedToCount: 1,
                isSubscribed: 1,
                avatar: 1,
                coverImage: 1,
                email: 1,
            }
        }
    ])
    if(!channel?.length){
        throw new ApiError(404, "Channel does not exist!")
    }
    return res
    .status(200)
    .json(new ApiResponse(200, channel, "User channel profile fetched successfully!"))
})

const getWatchHistroy = asyncHandler(async(req, res)=>{
    const user = await User.aggregate([
        {
            $match:{
                _id: new mongoose.Types.ObjectId(req.user?._id)
            }
        },
        {
            $lookup:{
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                pipeline: [
                    {
                        $lookup:{
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline:[
                                {
                                    $project:{
                                        fullName: 1,
                                        username: 1,
                                        avatar: 1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields:{
                            owner: {
                                $first: "$owner"
                            }
                        }
                    }
                ]
            }
        }
    ])
    return res
    .status(200)
    .json(new ApiResponse(200, user?.[0]?.watchHistory || [], "User watch history fetched successfully!"))
})

export {
    registerUser,
    loginUser,
    logoutUser,
    refereshAccessToken,
    getCurrentUser,
    updateAccoounDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile,
    getWatchHistroy,
    changeCurrentPassword
}