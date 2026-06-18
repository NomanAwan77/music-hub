const express = require("express")
const receptionistController = require("../controller/receptionist.controller")
const authMiddleware = require("../middleware/auth.middleware")

const router = express.Router()

router.post("/chat", authMiddleware.optionalAuth, receptionistController.chatWithReceptionist)

module.exports = router
