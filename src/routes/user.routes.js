import { Router } from "express";
import { loginUser, logoutUser, registerUser } from "../controllers/user.controller.js";
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
            // Skip multer for JSON requests
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

export default router;