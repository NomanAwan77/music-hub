const express = require("express")
const artistController = require("../controller/artist.controller")
const authMiddleware = require("../middleware/auth.middleware")

const router = express.Router()

router.get("/", authMiddleware.userAuth, artistController.getArtists)
router.get("/:artistId/slots", authMiddleware.userAuth, artistController.getArtistSlots)

module.exports = router
