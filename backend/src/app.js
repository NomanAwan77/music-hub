const express = require("express")
const cookieParser = require("cookie-parser")
const authRoutes = require("./routes/auth.routes")
const musicRoutes = require("./routes/music.routes")
const receptionistRoutes = require("./routes/receptionist.routes")
const calendarRoutes = require("./routes/calendar.routes")
const artistRoutes = require("./routes/artist.routes")
const bookingRoutes = require("./routes/booking.routes")
const app = express()
const allowedOrigins = [
    process.env.FRONTEND_URL,
    process.env.CLIENT_URL,
    "http://localhost:5173",
].filter(Boolean)

app.use((req, res, next) => {
    const origin = req.headers.origin

    if (origin && allowedOrigins.includes(origin)) {
        res.header("Access-Control-Allow-Origin", origin)
        res.header("Access-Control-Allow-Credentials", "true")
    }

    res.header("Vary", "Origin")
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization")
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")

    if (req.method === "OPTIONS") {
        return res.sendStatus(204)
    }

    next()
})

app.use(cookieParser())
app.use(express.json())
app.use("/auth/api", authRoutes)
app.use("/music/api", musicRoutes)
app.use("/api/receptionist", receptionistRoutes)
app.use("/api/calendar", calendarRoutes)
app.use("/api/artists", artistRoutes)
app.use("/api/bookings", bookingRoutes)
module.exports = app
