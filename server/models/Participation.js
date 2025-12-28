const mongoose = require('mongoose');

const participationSchema = new mongoose.Schema({
    contest_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Contest',
        required: true
    },
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    leetcode_username: {
        type: String,
        required: true
    },
    score: {
        type: Number,
        default: 0
    },
    total_penalty: {
        type: Number,
        default: 0
    },
    rank: {
        type: Number,
        default: null
    },
    problem_progress: [{
        slug: String,
        status: {
            type: String,
            enum: ['PENDING', 'ACCEPTED', 'FAIL'],
            default: 'PENDING'
        },
        fail_count: {
            type: Number,
            default: 0
        },
        solved_at: Date,
        penalty: {
            type: Number,
            default: 0
        }
    }],
    last_sync: {
        type: Date
    }
});

// Compound index to ensure one participation per user per contest
participationSchema.index({ contest_id: 1, user_id: 1 }, { unique: true });

module.exports = mongoose.model('Participation', participationSchema);
