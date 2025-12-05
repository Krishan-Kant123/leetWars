const express = require('express');
const router = express.Router();
const Contest = require('../models/Contest');
const Participation = require('../models/Participation');
const authMiddleware = require('../middleware/auth');
const { getUserProfile, getUserSolvedByTags, getUserContestHistory } = require('../services/leetcodeService');

/**
 * GET /api/profile/leetcode-stats
 * Get user's LeetCode stats (Protected)
 */
router.get('/leetcode-stats', authMiddleware, async (req, res) => {
    try {
        const user = req.user;

        if (!user.leetcode_username) {
            return res.status(400).json({ message: 'LeetCode username not set' });
        }

        // Fetch from LeetCode API
        const profile = await getUserProfile(user.leetcode_username);
        const tagStats = await getUserSolvedByTags(user.leetcode_username);
        const contestData = await getUserContestHistory(user.leetcode_username);

        res.json({
            profile,
            tagStats,
            contestRanking: contestData.contestRanking,
            contestHistory: contestData.contestHistory
        });

    } catch (error) {
        console.error('Error fetching LeetCode stats:', error);
        res.status(500).json({ 
            message: 'Failed to fetch LeetCode stats',
            error: error.message
        });
    }
});

/**
 * GET /api/profile/contest-history
 * Get user's contest history (Protected)
 */
router.get('/contest-history', authMiddleware, async (req, res) => {
    try {
        const userId = req.user._id;

        // Find all participations
        const participations = await Participation.find({ user: userId })
            .populate('contest')
            .sort({ createdAt: -1 });

        // Categorize into live and past
        const now = new Date();
        const liveContests = [];
        const pastContests = [];

        for (const participation of participations) {
            if (!participation.contest) continue;

            const contest = participation.contest;
            const endTime = new Date(contest.end_time);

            const contestData = {
                _id: contest._id,
                name: contest.name,
                unique_code: contest.unique_code,
                start_time: contest.start_time,
                end_time: contest.end_time,
                duration: contest.duration,
                problemCount: contest.problems?.length || 0,
                participantCount: contest.participantCount,
                yourScore: participation.score,
                yourPenalty: participation.penalty,
                yourRank: participation.rank || '—',
                problemProgress: participation.problem_progress
            };

            if (now >= new Date(contest.start_time) && now <= endTime) {
                liveContests.push(contestData);
            } else if (now > endTime) {
                pastContests.push(contestData);
            }
        }

        console.log(`📊 Contest History: ${participations.length} total, ${liveContests.length} live, ${pastContests.length} past`);

        res.json({
            live: liveContests,
            past: pastContests
        });

    } catch (error) {
        console.error('Error fetching contest history:', error);
        res.status(500).json({ 
            message: 'Failed to fetch contest history' 
        });
    }
});

/**
 * GET /api/profile/stats
 * Get overall platform stats (Protected)
 */
router.get('/stats', authMiddleware, async (req, res) => {
    try {
        const userId = req.user._id;

        // Count created contests
        const createdContests = await Contest.countDocuments({ creator: userId });

        // Count participated contests
        const participatedContests = await Participation.countDocuments({ user: userId });

        // Get best rank and total problems solved
        const participations = await Participation.find({ user: userId }).sort({ rank: 1 });
        
        let bestRank = null;
        let totalSolved = 0;
        
        if (participations.length > 0) {
            bestRank = participations[0].rank;
            totalSolved = participations.reduce((sum, p) => sum + p.score, 0);
        }

        res.json({
            createdContests,
            participatedContests,
            bestRank,
            totalSolved
        });

    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({ 
            message: 'Failed to fetch stats' 
        });
    }
});

/**
 * GET /api/profile/platform-stats
 * Get LeetWars platform statistics (Protected)
 */
router.get('/platform-stats', authMiddleware, async (req, res) => {
    try {
        const userId = req.user._id;

        // Count created contests
        const totalContestsCreated = await Contest.countDocuments({ creator: userId });

        // Count participated contests
        const totalContestsParticipated = await Participation.countDocuments({ user: userId });

        // Calculate average rank
        const participations = await Participation.find({ user: userId });
        
        let averageRank = null;
        let recentContests = [];
        
        if (participations.length > 0) {
            const rankedParticipations = participations.filter(p => p.rank && p.rank > 0);
            if (rankedParticipations.length > 0) {
                const totalRanks = rankedParticipations.reduce((sum, p) => sum + p.rank, 0);
                averageRank = Math.round(totalRanks / rankedParticipations.length);
            }

            // Get recent contests with details
            const recentParticipations = await Participation.find({ user: userId })
                .populate('contest')
                .sort({ createdAt: -1 })
                .limit(5);

            recentContests = recentParticipations
                .filter(p => p.contest)
                .map(p => ({
                    name: p.contest.name,
                    date: p.contest.start_time,
                    rank: p.rank || 'N/A',
                    score: p.score || 0
                }));
        }

        res.json({
            totalContestsCreated,
            totalContestsParticipated,
            averageRank,
            recentContests
        });

    } catch (error) {
        console.error('Error fetching platform stats:', error);
        res.status(500).json({ 
            message: 'Failed to fetch platform stats',
            error: error.message
        });
    }
});

module.exports = router;
