const mongoose = require("mongoose")
const musicSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    uri: {
        type: String,
        required: true
    },
    artist: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: "userModel"

    }


})
const musicModel = mongoose.model("musicModel", musicSchema)

module.exports = musicModel