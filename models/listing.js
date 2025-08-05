const mongoose = require("mongoose");
const Review = require("./review.js");

const listingSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true,
    },
    description: {
        type: String,
        trim: true,
    },
    image: {
        type: String,
        default: "https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=800&q=60",
    },
    price: {
        type: Number,
        min: 0,
    },
    location: {
        type: String,
        trim: true,
    },
    country: {
        type: String,
        trim: true,
    },
    category: {
        type: String,
        enum: [
            "Trending",
            "Room",
            "IconicCities",
            "Mountains",
            "Castles",
            "AmazingPools",
            "Camping",
            "Farms",
            "Arctic"
        ],
        required: true
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    review: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Review",
        },
    ],
}, {
    timestamps: true,
});

listingSchema.post("findOneAndDelete", async function (doc) {
    if (doc && doc.review.length) {
        await Review.deleteMany({ _id: { $in: doc.review } });
        console.log(`Deleted ${doc.review.length} associated reviews.`);
    }
});

const Listing = mongoose.model("Listing", listingSchema);
module.exports = Listing;
