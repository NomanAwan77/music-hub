const mongoose = require("mongoose")

const userSchema = new mongoose.Schema({
    userName: {
        type: String,
        required: true,
        unique: true
    },
    userEmail: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: function () {
            return this.authProvider === "local"
        },
    },
    authProvider: {
        type: String,
        enum: ["local", "google"],
        default: "local",
    },
    googleId: {
        type: String,
        unique: true,
        sparse: true,
    },
    googleCalendar: {
        connected: {
            type: Boolean,
            default: false,
        },
        refreshToken: {
            type: String,
        },
        email: {
            type: String,
        },
        connectedAt: {
            type: Date,
        },
    },
    role: {
        type: String,
        enum: ["user", "artist"],
        default: "user"
    }
})
const userModel = mongoose.model("userModel", userSchema)
module.exports = userModel;
