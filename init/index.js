const mongoose = require("mongoose");
const initdata = require("./data.js");
const Listing = require("../models/listing.js");

async function main() {
    await mongoose.connect(process.env.ATLASDB_URL);
    console.log("Database connected successfully");
    
    await initdb(); 
    
}

const initdb = async () => {
    try {
        await Listing.deleteMany({});
        await Listing.insertMany(initdata.data);
        console.log("Data inserted successfully");
    } catch (err) {
        console.log("Error inserting data:", err);
    }
};

main().catch((err) => {
    console.log("Connection error:", err);
});
