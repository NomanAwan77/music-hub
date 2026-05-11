const mongoose = require("mongoose")
const albumSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,

    },
    artist: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: "userModel"
    },
    music: [
        {

            type: mongoose.Schema.Types.ObjectId,
            ref: "musicModel",
        }

    ]

})
const albumModel = mongoose.model("albumModel", albumSchema)

module.exports = albumModel