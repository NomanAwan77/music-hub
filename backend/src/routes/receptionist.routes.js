const express = require("express")
const receptionistController = require("../controller/receptionist.controller")

const router = express.Router()

router.post("/chat", receptionistController.chatWithReceptionist)

module.exports = router
