const express = require("express");
const authController = require("../controller/auth.controller");
const authMiddleware = require("../middleware/auth.middleware");

const router = express.Router();

router.post("/register", authController.registerUser);
router.post("/login", authController.loginUser);
router.post("/google", authController.googleLogin);
router.post("/logout", authController.logoutUser);
router.get("/me", authMiddleware.userAuth, authController.getCurrentUser);

module.exports = router;
