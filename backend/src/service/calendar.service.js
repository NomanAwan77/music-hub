const { OAuth2Client } = require("google-auth-library")
const bookingModel = require("../model/booking.model")
const userModel = require("../model/auth.model")

const calendarScopes = [
    "openid",
    "email",
    "https://www.googleapis.com/auth/calendar.events",
    "https://www.googleapis.com/auth/calendar.freebusy",
]

const defaultSlotDurationMinutes = 30
const defaultWorkStartHour = 9
const defaultWorkEndHour = 17

function getCalendarRedirectUri() {
    return process.env.GOOGLE_CALENDAR_REDIRECT_URI || "http://localhost:3000/api/calendar/google/callback"
}

function getFrontendUrl() {
    return process.env.FRONTEND_URL || process.env.CLIENT_URL || "http://localhost:5173"
}

function getBookingTimeZone() {
    return process.env.BOOKING_TIMEZONE || "Asia/Karachi"
}

function getOAuthClient() {
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
        throw new Error("Google Calendar OAuth is not configured")
    }

    return new OAuth2Client(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        getCalendarRedirectUri(),
    )
}

function addMinutes(date, minutes) {
    return new Date(date.getTime() + minutes * 60 * 1000)
}

function formatDateOnly(date) {
    return date.toISOString().slice(0, 10)
}

function getSlotWindow(dateValue) {
    const date = dateValue || formatDateOnly(new Date())
    const start = new Date(`${date}T${String(defaultWorkStartHour).padStart(2, "0")}:00:00`)
    const end = new Date(`${date}T${String(defaultWorkEndHour).padStart(2, "0")}:00:00`)

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        throw new Error("Invalid date")
    }

    return { date, start, end }
}

function isOverlapping(startA, endA, startB, endB) {
    return startA < endB && endA > startB
}

function createCalendarRequestError(error) {
    const googleMessage = error.response?.data?.error?.message || error.message || ""
    const normalizedMessage = googleMessage.toLowerCase()
    const calendarError = new Error("Google Calendar is currently unavailable")
    calendarError.statusCode = 502

    if (normalizedMessage.includes("calendar api has not been used") || normalizedMessage.includes("disabled")) {
        calendarError.message = "Google Calendar API is not enabled for this app"
        calendarError.statusCode = 503
    } else if (normalizedMessage.includes("insufficient authentication scopes")) {
        calendarError.message = "Artist needs to reconnect Google Calendar permissions"
        calendarError.statusCode = 409
    } else if (normalizedMessage.includes("invalid_grant") || normalizedMessage.includes("invalid credentials")) {
        calendarError.message = "Artist needs to reconnect Google Calendar"
        calendarError.statusCode = 409
    }

    calendarError.originalError = error
    return calendarError
}

async function getConnectedArtist(artistId) {
    const artist = await userModel.findById(artistId)

    if (!artist || artist.role !== "artist") {
        const error = new Error("Artist not found")
        error.statusCode = 404
        throw error
    }

    if (!artist.googleCalendar?.connected || !artist.googleCalendar?.refreshToken) {
        const error = new Error("Artist calendar is not connected")
        error.statusCode = 409
        throw error
    }

    return artist
}

function getArtistCalendarClient(artist) {
    const client = getOAuthClient()
    client.setCredentials({
        refresh_token: artist.googleCalendar.refreshToken,
    })
    return client
}

async function getBusySlots(client, timeMin, timeMax) {
    try {
        const response = await client.request({
            url: "https://www.googleapis.com/calendar/v3/freeBusy",
            method: "POST",
            data: {
                timeMin: timeMin.toISOString(),
                timeMax: timeMax.toISOString(),
                items: [{ id: "primary" }],
            },
        })

        return response.data.calendars?.primary?.busy || []
    } catch (error) {
        throw createCalendarRequestError(error)
    }
}

async function getAvailableSlotsForArtist(artistId, dateValue, durationMinutes = defaultSlotDurationMinutes) {
    const artist = await getConnectedArtist(artistId)
    const client = getArtistCalendarClient(artist)
    const { date, start, end } = getSlotWindow(dateValue)
    const busySlots = await getBusySlots(client, start, end)
    const slots = []

    for (let slotStart = start; addMinutes(slotStart, durationMinutes) <= end; slotStart = addMinutes(slotStart, durationMinutes)) {
        const slotEnd = addMinutes(slotStart, durationMinutes)
        const isBusy = busySlots.some((busy) => {
            return isOverlapping(slotStart, slotEnd, new Date(busy.start), new Date(busy.end))
        })

        if (!isBusy && slotStart > new Date()) {
            slots.push({
                startTime: slotStart.toISOString(),
                endTime: slotEnd.toISOString(),
            })
        }
    }

    return {
        artist,
        date,
        slots,
    }
}

async function ensureSlotIsAvailable(artist, startTime, endTime) {
    const client = getArtistCalendarClient(artist)
    const busySlots = await getBusySlots(client, startTime, endTime)

    if (busySlots.length) {
        const error = new Error("This slot is no longer available")
        error.statusCode = 409
        throw error
    }

    return client
}

async function createBooking({
    artistId,
    bookedBy,
    userName,
    userEmail,
    message,
    startTime,
    endTime,
}) {
    const artist = await getConnectedArtist(artistId)
    const parsedStartTime = new Date(startTime)
    const parsedEndTime = endTime ? new Date(endTime) : addMinutes(parsedStartTime, defaultSlotDurationMinutes)

    if (Number.isNaN(parsedStartTime.getTime()) || Number.isNaN(parsedEndTime.getTime())) {
        const error = new Error("Invalid booking time")
        error.statusCode = 400
        throw error
    }

    if (parsedEndTime <= parsedStartTime) {
        const error = new Error("End time must be after start time")
        error.statusCode = 400
        throw error
    }

    const calendarClient = await ensureSlotIsAvailable(artist, parsedStartTime, parsedEndTime)
    let eventResponse

    try {
        eventResponse = await calendarClient.request({
            url: "https://www.googleapis.com/calendar/v3/calendars/primary/events?sendUpdates=all",
            method: "POST",
            data: {
                summary: `Music Hub booking with ${userName}`,
                description: message || "Booking created from Music Hub.",
                start: {
                    dateTime: parsedStartTime.toISOString(),
                    timeZone: getBookingTimeZone(),
                },
                end: {
                    dateTime: parsedEndTime.toISOString(),
                    timeZone: getBookingTimeZone(),
                },
                attendees: [
                    {
                        email: userEmail,
                        displayName: userName,
                    },
                ],
            },
        })
    } catch (error) {
        throw createCalendarRequestError(error)
    }

    const booking = await bookingModel.create({
        artist: artist._id,
        bookedBy,
        userName,
        userEmail,
        message,
        startTime: parsedStartTime,
        endTime: parsedEndTime,
        calendarEventId: eventResponse.data.id,
    })

    return {
        artist,
        booking,
        event: eventResponse.data,
    }
}

module.exports = {
    calendarScopes,
    createBooking,
    getAvailableSlotsForArtist,
    getBookingTimeZone,
    getCalendarRedirectUri,
    getFrontendUrl,
    getOAuthClient,
}
