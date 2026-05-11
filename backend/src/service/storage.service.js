const Imagekit = require("@imagekit/nodejs")

const clientImageKit = new Imagekit({
    privateKey: process.env.IMAGEKIT_PRIVATE_KEY
})
async function uploadFile(file) {

    const response = await clientImageKit.files.upload({
        file: file,
        fileName: "music-" + Date.now,
        folder: "music/spotify"
    })
    return response
}
module.exports = { uploadFile }
