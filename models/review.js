const mongoose = require("mongoose");

const reviewschema = new mongoose.Schema({
    rating: {
        type: Number,
        min: 1,
        max: 5,
        required: true
    },
    comments: {
        type: String,
        required: true
    },
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    }
});

const Review = mongoose.model("Review", reviewschema);
module.exports = Review;
