const express = require("express")
const musicController = require("../controller/music.controller")
const multer = require("multer")
const authArtistMiddleware = require("../middleware/auth.middleware")
const uplaod = multer({
    storage: multer.memoryStorage()
})

const router = express.Router()
router.post("/upload", authArtistMiddleware.artistAuth, uplaod.single("music"), musicController.createMusic)
router.post("/album/create", authArtistMiddleware.artistAuth, musicController.createAlbum)
router.get("/music", authArtistMiddleware.userAuth, musicController.getAllMusic)
router.get("/albums", authArtistMiddleware.userAuth, musicController.getAllAlbum)
router.get("/albums/:AlbumId", authArtistMiddleware.userAuth, musicController.getAlbumById)



module.exports = router