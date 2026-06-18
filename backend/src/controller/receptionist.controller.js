const { GoogleGenerativeAI } = require("@google/generative-ai")
const userModel = require("../model/auth.model")
const albumModel = require("../model/album.model")
const musicModel = require("../model/music.model")
const receptionistPrompt = require("../prompts/receptionist.prompt")
const {
    createBooking,
    getAvailableSlotsForArtist,
} = require("../service/calendar.service")

const geminiModel = process.env.GEMINI_MODEL || "gemini-2.5-flash-lite"
const maxHistoryMessages = 10
const maxHistoryMessageLength = 800
const maxUserMessageLength = 1000
const maxOutputTokens = 220
const monthNumbers = {
    jan: 1,
    january: 1,
    feb: 2,
    february: 2,
    mar: 3,
    march: 3,
    apr: 4,
    april: 4,
    may: 5,
    jun: 6,
    june: 6,
    jul: 7,
    july: 7,
    aug: 8,
    august: 8,
    sep: 9,
    sept: 9,
    september: 9,
    oct: 10,
    october: 10,
    nov: 11,
    november: 11,
    dec: 12,
    december: 12,
}

function hasAny(text, patterns) {
    return patterns.some((pattern) => pattern.test(text))
}

function escapeRegex(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function matchesName(text, name) {
    const normalizedName = name.toLowerCase().trim()

    if (!normalizedName) {
        return false
    }

    return new RegExp(`(^|[^a-z0-9])${escapeRegex(normalizedName)}([^a-z0-9]|$)`).test(text)
}

function extractEmail(text) {
    const match = text.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i)
    return match ? match[0].toLowerCase() : ""
}

function extractEmails(text) {
    return [...text.matchAll(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi)].map((match) =>
        match[0].toLowerCase(),
    )
}

function hasDatabaseIntent(text) {
    return hasAny(text, [
        /\balbums?\b/,
        /\btracks?\b/,
        /\bsongs?\b/,
        /\bmusic\b/,
        /\busers?\b/,
        /\bartists?\b/,
        /\bcreators?\b/,
        /\bcreat(?:e|ed|es|ing)\b/,
        /\bmade\b/,
        /\bmake\b/,
        /\bupload(?:ed|s|ing)?\b/,
        /\breleas(?:e|ed|es|ing)\b/,
    ])
}

function hasCalendarIntent(text) {
    return hasAny(text, [
        /\bbook(?:ing)?\b/,
        /\bschedule\b/,
        /\bappointment\b/,
        /\bmeeting\b/,
        /\bcalendar\b/,
        /\bslots?\b/,
        /\bavailable times?\b/,
    ])
}

function getLastCalendarQuestion(history) {
    if (!Array.isArray(history)) {
        return ""
    }

    for (let index = history.length - 1; index >= 0; index -= 1) {
        const message = history[index]

        if (message?.role === "user" && typeof message.content === "string") {
            const text = message.content.trim()

            if (hasCalendarIntent(text.toLowerCase())) {
                return text
            }
        }
    }

    return ""
}

function getLastDatabaseQuestion(history) {
    if (!Array.isArray(history)) {
        return ""
    }

    for (let index = history.length - 1; index >= 0; index -= 1) {
        const message = history[index]

        if (message?.role === "user" && typeof message.content === "string") {
            const text = message.content.trim()

            if (hasDatabaseIntent(text.toLowerCase())) {
                return text
            }
        }
    }

    return ""
}

function formatParsedDate(year, month, day) {
    const parsedYear = Number(year)
    const parsedMonth = Number(month)
    const parsedDay = Number(day)
    const date = new Date(Date.UTC(parsedYear, parsedMonth - 1, parsedDay))

    if (
        date.getUTCFullYear() !== parsedYear ||
        date.getUTCMonth() !== parsedMonth - 1 ||
        date.getUTCDate() !== parsedDay
    ) {
        return ""
    }

    return `${parsedYear}-${String(parsedMonth).padStart(2, "0")}-${String(parsedDay).padStart(2, "0")}`
}

function parseDateValue(text) {
    const isoMatch = text.match(/\b(\d{4}-\d{2}-\d{2})\b/)

    if (isoMatch) {
        return isoMatch[1]
    }

    const monthNames = Object.keys(monthNumbers).join("|")
    const dayMonthMatch = text.match(
        new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?(?:\\s+of)?\\s+(${monthNames})\\s*,?\\s+(\\d{4})\\b`, "i"),
    )

    if (dayMonthMatch) {
        return formatParsedDate(dayMonthMatch[3], monthNumbers[dayMonthMatch[2].toLowerCase()], dayMonthMatch[1])
    }

    const monthDayMatch = text.match(
        new RegExp(`\\b(${monthNames})\\s+(\\d{1,2})(?:st|nd|rd|th)?\\s*,?\\s+(\\d{4})\\b`, "i"),
    )

    if (monthDayMatch) {
        return formatParsedDate(monthDayMatch[3], monthNumbers[monthDayMatch[1].toLowerCase()], monthDayMatch[2])
    }

    if (/\btomorrow\b/i.test(text)) {
        const tomorrow = new Date()
        tomorrow.setDate(tomorrow.getDate() + 1)
        return tomorrow.toISOString().slice(0, 10)
    }

    if (/\btoday\b/i.test(text)) {
        return new Date().toISOString().slice(0, 10)
    }

    return ""
}

function parseStartTime(text, dateValue) {
    if (!dateValue) {
        return null
    }

    const timeMatch =
        text.match(/\bat\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i) ||
        text.match(/\b(\d{1,2}):(\d{2})\b/)

    if (!timeMatch) {
        return null
    }

    let hour = Number(timeMatch[1])
    const minute = Number(timeMatch[2] || 0)
    const meridiem = timeMatch[3]?.toLowerCase()

    if (meridiem === "pm" && hour < 12) {
        hour += 12
    }

    if (meridiem === "am" && hour === 12) {
        hour = 0
    }

    if (hour > 23 || minute > 59) {
        return null
    }

    return new Date(`${dateValue}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00`)
}

function hasTimeValue(text) {
    return /\b(?:at\s+)?\d{1,2}(?::\d{2})?\s*(?:am|pm)\b/i.test(text) || /\b\d{1,2}:\d{2}\b/.test(text)
}

function parseRequesterName(text) {
    const match = text.match(/\b(?:my name is|name is|i am|i'm)\s+([a-z][a-z ]{1,40})/i)
    return match ? match[1].trim() : ""
}

function hasCalendarFollowUpDetails(text) {
    return Boolean(parseDateValue(text) || extractEmail(text) || hasTimeValue(text) || parseRequesterName(text))
}

function formatSlot(slot) {
    return `${new Date(slot.startTime).toLocaleString()}`
}

function extractRequestedArtistName(text) {
    const match =
        text.match(
            /\b(?:slots?|availability|available times?).*\b(?:of|for|with)\s+([a-z0-9][a-z0-9 _.-]*)/i,
        ) ||
        text.match(
            /\b(?:created|made|uploaded|released)?\s*(?:by|from|for|artist|creator|user)\s+([a-z0-9][a-z0-9 _.-]*)/i,
        ) ||
        text.match(
            /\b(?:book|schedule|meet|meeting|appointment)\s+(?:with\s+)?([a-z0-9][a-z0-9 _.-]*)/i,
        )

    if (!match) {
        return ""
    }

    return match[1]
        .replace(
            /\b(?:album|albums|track|tracks|song|songs|music|available|please|here|like|show|list|which|what|how|many|count|total|created|made|uploaded|released|on|at|with)\b.*$/i,
            "",
        )
        .trim()
}

function formatNamedItems(items, formatter) {
    if (!items.length) {
        return "None available"
    }

    return items.map(formatter).join(", ")
}

function formatHistoryForGemini(history) {
    if (!Array.isArray(history)) {
        return []
    }

    const formattedHistory = history
        .filter((message) => {
            return (
                message &&
                (message.role === "user" || message.role === "assistant") &&
                typeof message.content === "string" &&
                message.content.trim()
            )
        })
        .slice(-maxHistoryMessages)
        .map((message) => ({
            role: message.role === "assistant" ? "model" : "user",
            parts: [{ text: message.content.trim().slice(0, maxHistoryMessageLength) }],
        }))

    while (formattedHistory.length && formattedHistory[0].role !== "user") {
        formattedHistory.shift()
    }

    return formattedHistory
}

function getSafeReceptionistError(error) {
    if (error.statusCode) {
        return {
            statusCode: error.statusCode,
            message: error.message,
        }
    }

    if (error.message === "fetch failed" || error.cause?.code === "ERR_SOCKET_CONNECTION_TIMEOUT") {
        return {
            statusCode: 503,
            message: "AI provider is unreachable from the backend right now",
        }
    }

    if (error.status === 400 || error.status === 403 || error.status === 404) {
        return {
            statusCode: 502,
            message: "AI provider rejected the receptionist request",
        }
    }

    return {
        statusCode: 500,
        message: "AI receptionist is currently unavailable",
    }
}

async function findMatchingUsers(text) {
    const requestedArtistName = extractRequestedArtistName(text)
    const requestedEmail = extractEmail(text)
    const users = await userModel.find().select("userName userEmail role googleCalendar").lean()
    const emailMatchingUsers = requestedEmail
        ? users.filter((user) => user.userEmail.toLowerCase() === requestedEmail)
        : []
    const matchedArtistByEmail = emailMatchingUsers.length > 0
    let matchingUsers = emailMatchingUsers

    if (!matchingUsers.length) {
        matchingUsers = users.filter((user) => matchesName(text, user.userName))
    }

    if (requestedArtistName && !matchedArtistByEmail) {
        const requestedName = requestedArtistName.toLowerCase()
        const nameMatches = users.filter((user) => {
            return user.userName.toLowerCase().includes(requestedName)
        })
        const matchingUserIds = new Set(matchingUsers.map((user) => String(user._id)))

        nameMatches.forEach((user) => {
            if (!matchingUserIds.has(String(user._id))) {
                matchingUsers.push(user)
            }
        })
    }

    return {
        requestedEmail: matchedArtistByEmail ? requestedEmail : "",
        requestedArtistName,
        users,
        matchingUsers,
    }
}

function getArtistLabel(matchingUsers, requestedArtistName) {
    if (matchingUsers.length === 1) {
        return matchingUsers[0].userName
    }

    if (requestedArtistName) {
        return requestedArtistName
    }

    return "that artist"
}

async function getCalendarReceptionistInfo(userMessage, history = [], requester = null) {
    const currentText = userMessage.toLowerCase()
    const previousCalendarQuestion = getLastCalendarQuestion(history)
    const shouldUsePreviousQuestion =
        !hasCalendarIntent(currentText) && previousCalendarQuestion && hasCalendarFollowUpDetails(userMessage)
    const effectiveMessage = shouldUsePreviousQuestion
        ? `${previousCalendarQuestion} ${userMessage}`
        : userMessage
    const text = effectiveMessage.toLowerCase()

    if (!hasCalendarIntent(text)) {
        return {
            reply: "",
        }
    }

    const { requestedEmail, requestedArtistName, matchingUsers } = await findMatchingUsers(text)
    const wantsSlots = hasAny(text, [/\bslots?\b/, /\bavailable times?\b/, /\bfree\b/, /\bavailability\b/])
    const wantsBooking = hasAny(text, [/\bbook(?:ing)?\b/, /\bschedule\b/, /\bappointment\b/, /\bmeeting\b/])
    const dateValue = parseDateValue(effectiveMessage)
    const startTime = parseStartTime(effectiveMessage, dateValue)
    const requesterName = parseRequesterName(effectiveMessage) || requester?.userName || ""

    if (!matchingUsers.length && requestedArtistName) {
        return {
            reply: `I could not find an artist or user named ${requestedArtistName}.`,
        }
    }

    if (!matchingUsers.length) {
        return {
            reply: "Which artist would you like to book with?",
        }
    }

    if (matchingUsers.length > 1 && !requestedEmail) {
        const choices = matchingUsers.map((user) => `${user.userName} (${user.userEmail})`).join(", ")

        return {
            reply: `I found multiple matching artists: ${choices}. Which email do you mean?`,
        }
    }

    const artist = matchingUsers[0]
    const artistEmail = artist.userEmail.toLowerCase()
    const providedEmails = extractEmails(effectiveMessage)
    const requesterEmail = providedEmails.find((email) => email !== artistEmail) || requester?.userEmail || ""
    const onlyProvidedArtistEmail = providedEmails.length > 0 && providedEmails.every((email) => email === artistEmail)

    if (!artist.googleCalendar?.connected && !artist.googleCalendar?.refreshToken) {
        return {
            reply: `${artist.userName} has not connected Google Calendar yet.`,
        }
    }

    if (!dateValue) {
        return {
            reply: `What date should I check for ${artist.userName}? Please use YYYY-MM-DD, today, or tomorrow.`,
        }
    }

    if (wantsSlots && !startTime) {
        const result = await getAvailableSlotsForArtist(artist._id, dateValue)

        if (!result.slots.length) {
            return {
                reply: `I could not find any free slots for ${artist.userName} on ${dateValue}.`,
            }
        }

        return {
            reply: `Free slots for ${artist.userName} on ${dateValue}: ${result.slots
                .slice(0, 8)
                .map(formatSlot)
                .join(", ")}.`,
        }
    }

    if (!wantsBooking) {
        return {
            reply: "",
        }
    }

    if (!startTime) {
        return {
            reply: `What time should I book with ${artist.userName} on ${dateValue}? For example: ${dateValue} at 4pm.`,
        }
    }

    if (!requesterEmail) {
        return {
            reply: onlyProvidedArtistEmail
                ? "I have the artist's email. What is your email for the booking?"
                : "What is your email for the booking?",
        }
    }

    if (!requesterName) {
        return {
            reply: "What name should I use for the booking?",
        }
    }

    const endTime = new Date(startTime.getTime() + 30 * 60 * 1000)
    const result = await createBooking({
        artistId: artist._id,
        bookedBy: requester?._id,
        userName: requesterName,
        userEmail: requesterEmail,
        message: `Booked from AI receptionist. User message: ${userMessage}`,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
    })

    return {
        reply: `Booked with ${result.artist.userName} for ${startTime.toLocaleString()}. A calendar event has been created.`,
    }
}

async function getDatabaseReceptionistInfo(userMessage, history = []) {
    const currentText = userMessage.toLowerCase()
    const previousDatabaseQuestion = getLastDatabaseQuestion(history)
    const shouldUsePreviousQuestion =
        !hasDatabaseIntent(currentText) && extractEmail(currentText) && previousDatabaseQuestion
    const effectiveMessage = shouldUsePreviousQuestion
        ? `${previousDatabaseQuestion} ${userMessage}`
        : userMessage
    const text = effectiveMessage.toLowerCase()
    let wantsAlbums = hasAny(text, [/\balbums?\b/])
    let wantsTracks = hasAny(text, [/\btracks?\b/, /\bsongs?\b/, /\bmusic\b/])
    const wantsUsers = hasAny(text, [/\busers?\b/, /\bartists?\b/, /\bcreators?\b/])
    const wantsCount = hasAny(text, [/\bhow many\b/, /\bcount\b/, /\bnumber\b/, /\btotal\b/])
    const wantsList = hasAny(text, [/\bavailable\b/, /\blist\b/, /\bshow\b/, /\bwhich\b/, /\bwhat\b/])
    const wantsCreatorContent = hasAny(text, [
        /\bcreat(?:e|ed|es|ing)\b/,
        /\bmade\b/,
        /\bmake\b/,
        /\bupload(?:ed|s|ing)?\b/,
        /\breleas(?:e|ed|es|ing)\b/,
    ])

    if (!wantsAlbums && !wantsTracks && !wantsUsers && !wantsCreatorContent) {
        return {
            context: "",
            reply: "",
        }
    }

    const { requestedEmail, requestedArtistName, users, matchingUsers } = await findMatchingUsers(text)
    const hasArtistFilter = matchingUsers.length > 0 || Boolean(requestedArtistName)
    const artistIds = matchingUsers.map((user) => user._id)
    const artistLabel = getArtistLabel(matchingUsers, requestedArtistName)

    if (matchingUsers.length > 1 && !requestedEmail) {
        const choices = matchingUsers.map((user) => `${user.userName} (${user.userEmail})`).join(", ")

        return {
            context: "",
            reply: `I found multiple artists named ${artistLabel}: ${choices}. Which email do you mean?`,
        }
    }

    if (hasArtistFilter && wantsCreatorContent && !wantsAlbums && !wantsTracks) {
        wantsAlbums = true
        wantsTracks = true
    }

    const context = []
    let directReply = ""

    if (wantsAlbums) {
        const albumFilter = artistIds.length ? { artist: { $in: artistIds } } : {}
        const albumCount = await albumModel.countDocuments(albumFilter)
        const albums = await albumModel
            .find(albumFilter)
            .select("title artist")
            .populate("artist", "userName")
            .limit(15)
            .lean()
        const albumList = formatNamedItems(albums, (album) => {
            const artistName = album.artist?.userName || "Unknown artist"
            return `${album.title} by ${artistName}`
        })

        context.push(
            hasArtistFilter
                ? `Total albums by ${artistLabel}: ${albumCount}`
                : `Total albums: ${albumCount}`,
        )
        context.push(hasArtistFilter ? `Albums by ${artistLabel}: ${albumList}` : `Albums: ${albumList}`)

        if (hasArtistFilter && !artistIds.length) {
            directReply = `I could not find an artist or user named ${artistLabel}.`
        } else if (hasArtistFilter && !albumCount && !wantsTracks) {
            directReply = `I could not find any albums by ${artistLabel}.`
        } else if (wantsList && !wantsTracks) {
            directReply =
                albumCount === 0
                    ? hasArtistFilter
                        ? `I could not find any albums by ${artistLabel}.`
                        : "There are no albums available right now."
                    : hasArtistFilter
                      ? `Here are the albums by ${artistLabel}: ${albumList}.`
                      : `Here are the available albums: ${albumList}.`
        } else if ((wantsCount || hasArtistFilter) && !wantsTracks) {
            directReply =
                albumCount === 1
                    ? hasArtistFilter
                        ? `There is 1 album by ${artistLabel}: ${albumList}.`
                        : "There is 1 album available right now."
                    : hasArtistFilter
                      ? `There are ${albumCount} albums by ${artistLabel}: ${albumList}.`
                      : `There are ${albumCount} albums available right now.`
        }
    }

    if (wantsTracks) {
        const trackFilter = artistIds.length ? { artist: { $in: artistIds } } : {}
        const trackCount = await musicModel.countDocuments(trackFilter)
        const tracks = await musicModel
            .find(trackFilter)
            .select("title artist")
            .populate("artist", "userName")
            .limit(15)
            .lean()
        const trackList = formatNamedItems(tracks, (track) => {
            const artistName = track.artist?.userName || "Unknown artist"
            return `${track.title} by ${artistName}`
        })

        context.push(
            hasArtistFilter
                ? `Total tracks by ${artistLabel}: ${trackCount}`
                : `Total tracks: ${trackCount}`,
        )
        context.push(hasArtistFilter ? `Tracks by ${artistLabel}: ${trackList}` : `Tracks: ${trackList}`)

        if (hasArtistFilter && !artistIds.length) {
            directReply = `I could not find an artist or user named ${artistLabel}.`
        } else if (hasArtistFilter && !trackCount && !wantsAlbums) {
            directReply = `I could not find any tracks by ${artistLabel}.`
        } else if (wantsList && !wantsAlbums) {
            directReply =
                trackCount === 0
                    ? hasArtistFilter
                        ? `I could not find any tracks by ${artistLabel}.`
                        : "There are no tracks available right now."
                    : hasArtistFilter
                      ? `Here are the tracks by ${artistLabel}: ${trackList}.`
                      : `Here are the available tracks: ${trackList}.`
        } else if ((wantsCount || hasArtistFilter) && !wantsAlbums) {
            directReply =
                trackCount === 1
                    ? hasArtistFilter
                        ? `There is 1 track by ${artistLabel}: ${trackList}.`
                        : "There is 1 track available right now."
                    : hasArtistFilter
                      ? `There are ${trackCount} tracks by ${artistLabel}: ${trackList}.`
                      : `There are ${trackCount} tracks available right now.`
        }
    }

    if (wantsAlbums && wantsTracks && hasArtistFilter && artistIds.length) {
        const albumLine = context.find((line) => line.startsWith(`Albums by ${artistLabel}:`))
        const trackLine = context.find((line) => line.startsWith(`Tracks by ${artistLabel}:`))

        directReply = [
            albumLine?.replace(`Albums by ${artistLabel}: `, `Albums by ${artistLabel}: `),
            trackLine?.replace(`Tracks by ${artistLabel}: `, `Tracks by ${artistLabel}: `),
        ]
            .filter(Boolean)
            .map((line) => `${line}.`)
            .join(" ")
    }

    if (wantsUsers && !wantsAlbums && !wantsTracks) {
        const artists = users.filter((user) => user.role === "artist")
        const artistList = formatNamedItems(artists, (artist) => artist.userName)

        context.push(`Total users: ${users.length}`)
        context.push(`Total artists: ${artists.length}`)
        context.push(`Artists: ${artistList}`)

        if (wantsCount) {
            directReply = `There are ${users.length} users and ${artists.length} artists right now.`
        } else if (wantsList) {
            directReply =
                artists.length === 0
                    ? "There are no artist accounts available right now."
                    : `Here are the artists: ${artistList}.`
        }
    }

    return {
        context: context.join("\n"),
        reply: directReply,
    }
}

async function chatWithReceptionist(req, res) {
    try {
        const { message, history = [] } = req.body
        const userMessage = typeof message === "string" ? message.trim() : ""

        if (!userMessage) {
            return res.status(400).json({
                message: "Message is required",
            })
        }

        if (userMessage.length > maxUserMessageLength) {
            return res.status(400).json({
                message: `Message is too long. Please keep it under ${maxUserMessageLength} characters.`,
            })
        }

        const requester = req.user?.id
            ? await userModel.findById(req.user.id).select("userName userEmail role").lean()
            : null
        const calendarInfo = await getCalendarReceptionistInfo(userMessage, history, requester)

        if (calendarInfo.reply) {
            return res.status(200).json({
                reply: calendarInfo.reply,
            })
        }

        const databaseInfo = await getDatabaseReceptionistInfo(userMessage, history)

        if (databaseInfo.reply) {
            return res.status(200).json({
                reply: databaseInfo.reply,
            })
        }

        if (!process.env.GEMINI_API_KEY) {
            return res.status(500).json({
                message: "AI receptionist is not configured",
            })
        }

        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
        const model = genAI.getGenerativeModel({
            model: geminiModel,
            systemInstruction: receptionistPrompt,
        })

        const chat = model.startChat({
            history: formatHistoryForGemini(history),
            generationConfig: {
                temperature: 0.4,
                maxOutputTokens,
            },
        })

        const messageWithDatabaseContext = databaseInfo.context
            ? `${userMessage}\n\nCurrent database information:\n${databaseInfo.context}`
            : userMessage

        const result = await chat.sendMessage(messageWithDatabaseContext)
        const reply = result.response.text().trim()

        if (process.env.LOG_AI_USAGE === "true") {
            console.log("Gemini receptionist usage:", result.response.usageMetadata)
        }

        if (!reply) {
            return res.status(500).json({
                message: "AI receptionist could not respond",
            })
        }

        res.status(200).json({
            reply,
        })
    } catch (error) {
        const safeError = getSafeReceptionistError(error)
        console.log("Gemini receptionist error:", error)
        res.status(safeError.statusCode).json({
            message: safeError.message,
        })
    }
}

module.exports = { chatWithReceptionist }
