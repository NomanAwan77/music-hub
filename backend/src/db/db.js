const mongoose = require("mongoose")
async function ConnectDb() {
    try {
        await mongoose.connect(process.env.CONNECTION_STRING)
        console.log("Databse  connected Successflly")
    } catch (error) {
        console.log(error)
    }

}
module.exports = ConnectDb