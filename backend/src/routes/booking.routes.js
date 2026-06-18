const express = require("express")
const bookingController = require("../controller/booking.controller")
const authMiddleware = require("../middleware/auth.middleware")

const router = express.Router()

router.post("/", authMiddleware.userAuth, bookingController.createArtistBooking)
router.get("/my", authMiddleware.userAuth, bookingController.getMyBookings)

module.exports = router
