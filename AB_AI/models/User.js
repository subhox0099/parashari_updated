
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: { // Matches new strict schema
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    password: { // CHANGED: From passwordHash to match existing DB
        type: String,
        required: true
    },
    purchasedCourses: [{ // Added to match existing DB
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course'
    }],

    // Multi-tenant support: employees belong to exactly one website.
    // Stored as a string to match `Website.websiteId`.
    websiteId: {
        type: String,
        default: null,
        index: true
    },

    role: { // Added role
        type: String,
        enum: ['student', 'admin', 'instructor'],
        default: 'student'
    },
    active: { // Added active
        type: Boolean,
        default: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);
