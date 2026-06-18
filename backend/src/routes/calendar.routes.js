const express = require("express")
const calendarController = require("../controller/calendar.controller")
const authMiddleware = require("../middleware/auth.middleware")

const router = express.Router()

router.get("/google/connect", authMiddleware.artistAuth, calendarController.connectGoogleCalendar)
router.get("/google/callback", calendarController.googleCalendarCallback)

module.exports = router
