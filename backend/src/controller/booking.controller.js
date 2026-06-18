const bookingModel = require("../model/booking.model")
const userModel = require("../model/auth.model")
const { createBooking } = require("../service/calendar.service")

async function createArtistBooking(req, res) {
    try {
        const { artistId, userName, userEmail, message = "", startTime, endTime } = req.body

        if (!artistId || !userName || !userEmail || !startTime) {
            return res.status(400).json({
                message: "Artist, name, email, and start time are required",
            })
        }

        const result = await createBooking({
            artistId,
            bookedBy: req.user?.id,
            userName,
            userEmail,
            message,
            startTime,
            endTime,
        })

        res.status(201).json({
            message: "Booking confirmed",
            booking: {
                id: result.booking._id,
                artist: {
                    id: result.artist._id,
                    name: result.artist.userName,
                    email: result.artist.userEmail,
                },
                userName: result.booking.userName,
                userEmail: result.booking.userEmail,
                startTime: result.booking.startTime,
                endTime: result.booking.endTime,
                calendarEventId: result.booking.calendarEventId,
            },
        })
    } catch (error) {
        console.log(error)
        res.status(error.statusCode || 500).json({
            message: error.statusCode ? error.message : "Unable to create booking",
        })
    }
}

async function getMyBookings(req, res) {
    try {
        const user = await userModel.findById(req.user.id).select("userEmail").lean()
        const bookings = await bookingModel
            .find({ userEmail: user?.userEmail })
            .populate("artist", "userName userEmail")
            .sort({ startTime: 1 })
            .lean()

        res.status(200).json({
            bookings: bookings.map((booking) => ({
                id: booking._id,
                artist: {
                    id: booking.artist?._id,
                    name: booking.artist?.userName || "Unknown artist",
                    email: booking.artist?.userEmail || "",
                },
                startTime: booking.startTime,
                endTime: booking.endTime,
                message: booking.message,
                status: booking.status,
            })),
        })
    } catch (error) {
        console.log(error)
        res.status(500).json({
            message: "Unable to fetch bookings",
        })
    }
}

module.exports = { createArtistBooking, getMyBookings }
