const { GoogleGenerativeAI } = require("@google/generative-ai")
const userModel = require("../model/auth.model")
const albumModel = require("../model/album.model")
const musicModel = require("../model/music.model")
const receptionistPrompt = require("../prompts/receptionist.prompt")

const geminiModel = process.env.GEMINI_MODEL || "gemini-2.5-flash-lite"

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

function extractRequestedArtistName(text) {
    const match = text.match(
        /\b(?:created|made|uploaded|released)?\s*(?:by|from|artist|creator|user)\s+([a-z0-9][a-z0-9 _.-]*)/i,
    )

    if (!match) {
        return ""
    }

    return match[1]
        .replace(
            /\b(?:album|albums|track|tracks|song|songs|music|available|please|here|like|show|list|which|what|how|many|count|total|created|made|uploaded|released)\b.*$/i,
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
        .slice(-10)
        .map((message) => ({
            role: message.role === "assistant" ? "model" : "user",
            parts: [{ text: message.content.trim() }],
        }))

    while (formattedHistory.length && formattedHistory[0].role !== "user") {
        formattedHistory.shift()
    }

    return formattedHistory
}

async function findMatchingUsers(text) {
    const requestedArtistName = extractRequestedArtistName(text)
    const users = await userModel.find().select("userName userEmail role").lean()
    let matchingUsers = users.filter((user) => matchesName(text, user.userName))

    if (!matchingUsers.length && requestedArtistName) {
        const requestedName = requestedArtistName.toLowerCase()
        matchingUsers = users.filter((user) => {
            return user.userName.toLowerCase().includes(requestedName)
        })
    }

    return {
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

async function getDatabaseReceptionistInfo(userMessage) {
    const text = userMessage.toLowerCase()
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

    const { requestedArtistName, users, matchingUsers } = await findMatchingUsers(text)
    const hasArtistFilter = matchingUsers.length > 0 || Boolean(requestedArtistName)
    const artistIds = matchingUsers.map((user) => user._id)
    const artistLabel = getArtistLabel(matchingUsers, requestedArtistName)

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

        const databaseInfo = await getDatabaseReceptionistInfo(userMessage)

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
            },
        })

        const messageWithDatabaseContext = databaseInfo.context
            ? `${userMessage}\n\nCurrent database information:\n${databaseInfo.context}`
            : userMessage

        const result = await chat.sendMessage(messageWithDatabaseContext)
        const reply = result.response.text().trim()

        if (!reply) {
            return res.status(500).json({
                message: "AI receptionist could not respond",
            })
        }

        res.status(200).json({
            reply,
        })
    } catch (error) {
        console.log("Gemini receptionist error:", error)
        res.status(500).json({
            message: "AI receptionist is currently unavailable",
        })
    }
}

module.exports = { chatWithReceptionist }
