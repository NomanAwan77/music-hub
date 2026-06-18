const userModel = require("../model/auth.model")
const { getAvailableSlotsForArtist } = require("../service/calendar.service")

async function getArtists(req, res) {
    try {
        const artists = await userModel
            .find({ role: "artist" })
            .select("userName userEmail googleCalendar")
            .lean()

        res.status(200).json({
            artists: artists.map((artist) => ({
                id: artist._id,
                name: artist.userName,
                email: artist.userEmail,
                calendarConnected: Boolean(artist.googleCalendar?.connected),
                calendarEmail: artist.googleCalendar?.email || "",
            })),
        })
    } catch (error) {
        console.log(error)
        res.status(500).json({
            message: "Unable to fetch artists",
        })
    }
}

async function getArtistSlots(req, res) {
    try {
        const { artistId } = req.params
        const { date } = req.query
        const result = await getAvailableSlotsForArtist(artistId, date)

        res.status(200).json({
            artist: {
                id: result.artist._id,
                name: result.artist.userName,
                email: result.artist.userEmail,
            },
            date: result.date,
            slots: result.slots,
        })
    } catch (error) {
        console.log(error)
        res.status(error.statusCode || 500).json({
            message: error.statusCode ? error.message : "Unable to fetch artist slots",
        })
    }
}

module.exports = { getArtists, getArtistSlots }
