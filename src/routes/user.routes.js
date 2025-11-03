import { Router } from "express";
import { loginUser, logoutUser, registerUser, changeCurrentPassword, getCurrentUser, updateAccoounDetails, updateUserAvatar, updateUserCoverImage, getUserChannelProfile, getWatchHistroy } from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { refereshAccessToken } from "../controllers/user.controller.js";

const router = Router();

router.route("/register").post(
    (req, res, next) => {
        // Check if request has files (multipart) or JSON body
        if (req.headers['content-type']?.includes('multipart/form-data')) {
            // Use multer middleware for file uploads
            upload.fields([
                {
                    name: "avatar",
                    maxCount: 1
                },
                {
                    name: "coverImage",
                    maxCount: 1
                }
            ])(req, res, next);
        } else {
            // Skip multer for JSON requestsl
            next();
        }
    },
    registerUser
);

router.route("/login").post(
    loginUser
)

router.route("/logout").post(verifyJWT, logoutUser)

router.route("/refresh-token").post(refereshAccessToken)

router.route("/change-password").post(verifyJWT, changeCurrentPassword)

router.route("/current-user").get(verifyJWT, getCurrentUser)

router.route("/update-account").patch(verifyJWT, updateAccoounDetails)

router.route("/avatar").patch(verifyJWT, upload.single("avatar"), updateUserAvatar)

router.route("/cover-image").patch(verifyJWT, upload.single("coverImage"), updateUserCoverImage)

router.route("/c/:username").get(verifyJWT, getUserChannelProfile)

router.route("/history").get(verifyJWT, getWatchHistroy)


export default router;