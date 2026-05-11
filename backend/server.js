require("dotenv").config()
const app = require("./src/app")
const ConnectDb = require("./src/db/db")

ConnectDb();
app.listen(3000, () => {
    console.log("Server is running on port 3000")
})