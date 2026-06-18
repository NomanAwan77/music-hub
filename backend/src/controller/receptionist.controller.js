const { GoogleGenerativeAI } = require("@google/generative-ai")
require("../model/auth.model")
const albumModel = require("../model/album.model")
const musicModel = require("../model/music.model")
const receptionistPrompt = require("../prompts/receptionist.prompt")

const geminiModel = process.env.GEMINI_MODEL || "gemini-2.5-flash-lite"

function hasAny(text, patterns) {
    return patterns.some((pattern) => pattern.test(text))
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

async function getDatabaseReceptionistInfo(userMessage) {
    const text = userMessage.toLowerCase()
    const wantsAlbums = hasAny(text, [/\balbums?\b/])
    const wantsTracks = hasAny(text, [/\btracks?\b/, /\bsongs?\b/, /\bmusic\b/])
    const wantsCount = hasAny(text, [/\bhow many\b/, /\bcount\b/, /\bnumber\b/, /\btotal\b/])
    const wantsList = hasAny(text, [/\bavailable\b/, /\blist\b/, /\bshow\b/, /\bwhich\b/, /\bwhat\b/])

    if (!wantsAlbums && !wantsTracks) {
        return {
            context: "",
            reply: "",
        }
    }

    const context = []
    let directReply = ""

    if (wantsAlbums) {
        const albumCount = await albumModel.countDocuments()
        const albums = await albumModel
            .find()
            .select("title artist")
            .populate("artist", "userName")
            .limit(10)
            .lean()
        const albumList = formatNamedItems(albums, (album) => {
            const artistName = album.artist?.userName || "Unknown artist"
            return `${album.title} by ${artistName}`
        })

        context.push(`Total albums: ${albumCount}`)
        context.push(`Albums: ${albumList}`)

        if (wantsCount && !wantsTracks) {
            directReply =
                albumCount === 1
                    ? "There is 1 album available right now."
                    : `There are ${albumCount} albums available right now.`
        } else if (wantsList && !wantsTracks) {
            directReply =
                albumCount === 0
                    ? "There are no albums available right now."
                    : `Here are the available albums: ${albumList}.`
        }
    }

    if (wantsTracks) {
        const trackCount = await musicModel.countDocuments()
        const tracks = await musicModel
            .find()
            .select("title artist")
            .populate("artist", "userName")
            .limit(10)
            .lean()
        const trackList = formatNamedItems(tracks, (track) => {
            const artistName = track.artist?.userName || "Unknown artist"
            return `${track.title} by ${artistName}`
        })

        context.push(`Total tracks: ${trackCount}`)
        context.push(`Tracks: ${trackList}`)

        if (wantsCount && !wantsAlbums) {
            directReply =
                trackCount === 1
                    ? "There is 1 track available right now."
                    : `There are ${trackCount} tracks available right now.`
        } else if (wantsList && !wantsAlbums) {
            directReply =
                trackCount === 0
                    ? "There are no tracks available right now."
                    : `Here are the available tracks: ${trackList}.`
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
