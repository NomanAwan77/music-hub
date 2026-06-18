const mongoose = require("mongoose")

const bookingSchema = new mongoose.Schema(
    {
        artist: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: "userModel",
        },
        bookedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "userModel",
        },
        userName: {
            type: String,
            required: true,
        },
        userEmail: {
            type: String,
            required: true,
        },
        message: {
            type: String,
        },
        startTime: {
            type: Date,
            required: true,
        },
        endTime: {
            type: Date,
            required: true,
        },
        status: {
            type: String,
            enum: ["confirmed", "cancelled"],
            default: "confirmed",
        },
        calendarEventId: {
            type: String,
        },
    },
    {
        timestamps: true,
    },
)

const bookingModel = mongoose.model("bookingModel", bookingSchema)

module.exports = bookingModel
