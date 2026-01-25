const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: false, // Optional for OAuth users (will use name or email prefix)
        unique: true,
        sparse: true, // Allow multiple nulls for uniqueness
        trim: true,
        minlength: 3
    },
    name: {
        type: String,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    emailVerified: {
        type: Date,
        default: null
    },
    image: {
        type: String,
        default: null
    },
    password_hash: {
        type: String,
        required: false // Optional - not used for OAuth users
    },
    leetcode_username: {
        type: String,
        required: false, // Optional initially - enforced via onboarding flow
        trim: true
    },
    created_at: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('User', userSchema);
