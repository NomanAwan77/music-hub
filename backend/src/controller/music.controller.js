const musicModel = require("../model/music.model")
const albumModel = require("../model/album.model")
const { uploadFile } = require("../service/storage.service")
async function createMusic(req, res) {

    const { title } = req.body;
    const file = req.file;
    const resultFile = await uploadFile(file.buffer.toString("base64"))
    const music = await musicModel.create({
        title: title,
        uri: resultFile.url,
        artist: req.user.id
    })

    res.status(201).json({
        message: "Music Uploaded",
        music: {
            id: music._id,
            title: music.title,
            uri: music.uri,
            artist: music.artist
        }
    })


}

async function createAlbum(req, res) {

    const { title, music } = req.body
    const album = await albumModel.create({
        title,
        music,
        artist: req.user.id
    })
    res.status(201).json({
        message: "Album created",
        album: {
            title: album.title,
            music: album.music,
            artist: album.artist
        }

    })



}
async function getAllMusic(req, res) {
    const music = await musicModel.find().populate("artist", "userName userEmail")
    res.status(200).json({
        message: "All Musics fetched",
        music: music
    })

}
async function getAllAlbum(req, res) {
    const album = await albumModel.find().select("title artist").populate("artist", "userName userEmail")
    res.status(200).json({
        message: "All Albums fetched",
        album: album
    })

}
async function getAlbumById(req, res) {
    const AlbumId = req.params.AlbumId;
    console.log("AlbumId", AlbumId)
    const album = await albumModel.findById(AlbumId).populate("artist", "userName userEmail").populate("music")
    res.status(200).json({
        message: "All Albums fetched",
        album: album
    })

}


module.exports = { createMusic, createAlbum, getAllMusic, getAllAlbum, getAlbumById }