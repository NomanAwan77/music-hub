const jwt = require("jsonwebtoken")
const userModel = require("../model/auth.model")
const {
    calendarScopes,
    getFrontendUrl,
    getOAuthClient,
} = require("../service/calendar.service")

async function connectGoogleCalendar(req, res) {
    try {
        const state = jwt.sign(
            {
                id: req.user.id,
                role: req.user.role,
                type: "calendar-connect",
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "10m",
            },
        )
        const oauthClient = getOAuthClient()
        const authUrl = oauthClient.generateAuthUrl({
            access_type: "offline",
            prompt: "consent",
            scope: calendarScopes,
            state,
        })

        res.redirect(authUrl)
    } catch (error) {
        console.log(error)
        res.status(500).json({
            message: "Unable to start Google Calendar connection",
        })
    }
}

async function googleCalendarCallback(req, res) {
    const frontendUrl = getFrontendUrl()

    try {
        const { code, state } = req.query

        if (!code || !state) {
            return res.redirect(`${frontendUrl}/artists?calendar=missing-code`)
        }

        const decoded = jwt.verify(state, process.env.JWT_SECRET)

        if (decoded.type !== "calendar-connect" || decoded.role !== "artist") {
            return res.redirect(`${frontendUrl}/artists?calendar=invalid-state`)
        }

        const oauthClient = getOAuthClient()
        const { tokens } = await oauthClient.getToken(code)
        oauthClient.setCredentials(tokens)

        let calendarEmail = ""

        if (tokens.id_token) {
            const ticket = await oauthClient.verifyIdToken({
                idToken: tokens.id_token,
                audience: process.env.GOOGLE_CLIENT_ID,
            })
            calendarEmail = ticket.getPayload()?.email || ""
        }

        const artist = await userModel.findById(decoded.id)

        if (!artist || artist.role !== "artist") {
            return res.redirect(`${frontendUrl}/artists?calendar=artist-not-found`)
        }

        const refreshToken = tokens.refresh_token || artist.googleCalendar?.refreshToken

        if (!refreshToken) {
            return res.redirect(`${frontendUrl}/artists?calendar=missing-refresh-token`)
        }

        artist.googleCalendar = {
            connected: true,
            refreshToken,
            email: calendarEmail || artist.googleCalendar?.email || artist.userEmail,
            connectedAt: new Date(),
        }
        await artist.save()

        res.redirect(`${frontendUrl}/artists?calendar=connected`)
    } catch (error) {
        console.log(error)
        res.redirect(`${frontendUrl}/artists?calendar=failed`)
    }
}

module.exports = { connectGoogleCalendar, googleCalendarCallback }
