const express = require('express');
const router = express.Router();
const Contest = require('../models/Contest');
const Participation = require('../models/Participation');
const authMiddleware = require('../middleware/auth');
const { getRecentSubmissions } = require('../services/leetcodeService');

/**
 * POST /api/sync/:contestId
 * Sync user's LeetCode submissions for a specific contest (Protected)
 */
router.post('/:contestId', authMiddleware, async (req, res) => {
    try {
        const { contestId } = req.params;

        // Find contest
        const contest = await Contest.findById(contestId);

        if (!contest) {
            return res.status(404).json({ 
                message: 'Contest not found' 
            });
        }

        // Find participation
        const participation = await Participation.findOne({
            contest_id: contestId,
            user_id: req.user._id
        });

        if (!participation) {
            return res.status(404).json({ 
                message: 'You are not enrolled in this contest' 
            });
        }

        // Check rate limiting (10 seconds between syncs)
        if (participation.last_sync) {
            const timeSinceLastSync = Date.now() - new Date(participation.last_sync).getTime();
            if (timeSinceLastSync < 10000) {
                return res.status(429).json({ 
                    message: `Please wait ${Math.ceil((10000 - timeSinceLastSync) / 1000)} seconds before syncing again` 
                });
            }
        }

        // Fetch recent submissions from LeetCode
        let submissions;
        try {
            submissions = await getRecentSubmissions(req.user.leetcode_username, 50);
        } catch (error) {
            return res.status(500).json({ 
                message: 'Failed to fetch submissions from LeetCode. Please ensure your profile is public.' 
            });
        }

        // Helper to get score based on difficulty
        const getScoreForDifficulty = (difficulty) => {
            if (difficulty === 'Easy') return 3;
            if (difficulty === 'Medium') return 4;
            if (difficulty === 'Hard') return 6;
            return 1; // fallback
        };

        // Process submissions
        let scoreChanged = false;
        const contestStartTime = new Date(contest.start_time).getTime() / 1000;
        const contestEndTime = new Date(contest.end_time).getTime() / 1000;

        // Iterate through contest problems
        for (const problem of contest.problems) {
            const slug = problem.slug;
            
            // Find this problem in participation
            const problemProgress = participation.problem_progress.find(p => p.slug === slug);
            
            if (!problemProgress) continue;

            // Skip if already solved
            if (problemProgress.status === 'ACCEPTED') continue;

            // Find relevant submissions for this problem
            const problemSubmissions = submissions.filter(sub => 
                sub.titleSlug === slug &&
                parseInt(sub.timestamp) >= contestStartTime &&
                parseInt(sub.timestamp) <= contestEndTime
            );

            // Sort by timestamp (oldest first)
            problemSubmissions.sort((a, b) => parseInt(a.timestamp) - parseInt(b.timestamp));

            // Process submissions
            let failCount = 0;
            let solvedAt = null;

            for (const sub of problemSubmissions) {
                if (sub.statusDisplay === 'Accepted') {
                    solvedAt = new Date(parseInt(sub.timestamp) * 1000);
                    break;
                } else {
                    failCount++;
                }
            }

            // Update problem progress
            if (solvedAt) {
                // Calculate penalty: ONLY failed attempts × 5 minutes
                const penalty = failCount * 5;

                problemProgress.status = 'ACCEPTED';
                problemProgress.solved_at = solvedAt;
                problemProgress.fail_count = failCount;
                problemProgress.penalty = penalty;

                // Update score if not already counted (use difficulty-based scoring)
                if (participation.score === 0 || !participation.problem_progress.some(p => p.slug === slug && p.status === 'ACCEPTED')) {
                    // Find the problem to get its difficulty
                    const fullProblem = await Contest.findById(contestId).populate('problems.problem_id');
                    const problemWithDetails = fullProblem.problems.find(p => p.slug === slug);
                    const difficulty = problemWithDetails?.problem_id?.difficulty || 'Medium';
                    
                    participation.score += getScoreForDifficulty(difficulty);
                    participation.total_penalty += penalty;
                    scoreChanged = true;
                }
            } else if (failCount > 0) {
                problemProgress.fail_count = failCount;
                problemProgress.status = 'FAIL';
            }
        }

        // Update last sync time
        participation.last_sync = new Date();
        await participation.save();

        res.json({
            message: scoreChanged ? 'Score updated successfully!' : 'No new submissions found',
            participation: {
                score: participation.score,
                total_penalty: participation.total_penalty,
                problem_progress: participation.problem_progress
            }
        });

    } catch (error) {
        console.error('Sync error:', error);
        res.status(500).json({ 
            message: 'Server error during sync' 
        });
    }
});

/**
 * GET /api/sync/leaderboard/:contestId
 * Get leaderboard for a contest (Protected)
 */
router.get('/leaderboard/:contestId', authMiddleware, async (req, res) => {
    try {
        const { contestId } = req.params;

        // Find all participations for this contest
        const participations = await Participation.find({ contest_id: contestId })
            .populate('user_id', 'username leetcode_username')
            .sort({ score: -1, total_penalty: 1 }); // Sort by score desc, then penalty asc

        // Get contest for start time calculation
        const contest = await Contest.findById(contestId);
        
        const leaderboard = participations.map((p, index) => {
            // Calculate total time: (last_accepted_time + penalties) - contest_start_time
            const acceptedProblems = p.problem_progress.filter(prob => prob.status === 'ACCEPTED');
            let totalTime = 0;
            
            if (acceptedProblems.length > 0) {
                // Find last solved time
                const lastSolvedTime = Math.max(...acceptedProblems.map(prob => 
                    new Date(prob.solved_at).getTime()
                ));
                
                const contestStart = new Date(contest.start_time).getTime();
                const timeDiff = (lastSolvedTime - contestStart) / 1000; // seconds
                const penaltyTime = p.total_penalty * 60; // convert minutes to seconds
                
                totalTime = Math.floor(timeDiff + penaltyTime);
            }
            
            return {
                rank: index + 1,
                username: p.user_id.username,
                leetcode_username: p.user_id.leetcode_username,
                score: p.score,
                penalty: Math.round(p.total_penalty * 100) / 100, // Round to 2 decimals
                total_time: totalTime, // in seconds
                solved: acceptedProblems.length,
                problem_progress: p.problem_progress
            };
        });

        res.json({ leaderboard });

    } catch (error) {
        console.error('Leaderboard error:', error);
        res.status(500).json({ 
            message: 'Server error fetching leaderboard' 
        });
    }
});

/**
 * POST /api/sync/sync-all/:contestId
 * Sync ALL participants' submissions for a contest (Protected)
 * Cooldown: 2 minutes between syncs
 */
router.post('/sync-all/:contestId', authMiddleware, async (req, res) => {
    try {
        const { contestId } = req.params;

        // Find contest
        const contest = await Contest.findById(contestId).populate('problems.problem_id');
        if (!contest) {
            return res.status(404).json({ message: 'Contest not found' });
        }

        // Check cooldown (store in contest or use a separate tracking mechanism)
        if (contest.last_bulk_sync) {
            const timeSinceLastSync = Date.now() - new Date(contest.last_bulk_sync).getTime();
            const twoMinutes = 2 * 60 * 1000;
            
            if (timeSinceLastSync < twoMinutes) {
                return res.status(429).json({
                    message: `Please wait ${Math.ceil((twoMinutes - timeSinceLastSync) / 1000)} seconds before syncing all again`,
                    cooldown: Math.ceil((twoMinutes - timeSinceLastSync) / 1000)
                });
            }
        }

        // Get all participations
        const participations = await Participation.find({ contest_id: contestId })
            .populate('user_id', 'leetcode_username');
        
        if (participations.length === 0) {
            return res.status(404).json({ message: 'No participants found' });
        }

        let syncedCount = 0;
        let errorCount = 0;
        const User = require('../models/User');

        // Sync each participant
        for (const participation of participations) {
            try {
                const user = participation.user_id;
                if (!user || !user.leetcode_username) {
                    console.log(`⚠️ Skipping participation - no LeetCode username`);
                    continue;
                }

                // Fetch submissions
                const submissions = await getRecentSubmissions(user.leetcode_username, 50);
                
                const contestStartTime = new Date(contest.start_time).getTime() / 1000;
                const contestEndTime = new Date(contest.end_time).getTime() / 1000;

                let hasChanges = false;

                // Process each problem
                for (const problem of contest.problems) {
                    const slug = problem.slug;
                    const problemProgress = participation.problem_progress.find(p => p.slug === slug);
                    
                    if (!problemProgress || problemProgress.status === 'ACCEPTED') continue;

                    const problemSubmissions = submissions.filter(sub =>
                        sub.titleSlug === slug &&
                        parseInt(sub.timestamp) >= contestStartTime &&
                        parseInt(sub.timestamp) <= contestEndTime
                    ).sort((a, b) => parseInt(a.timestamp) - parseInt(b.timestamp));

                    let failCount = 0;
                    let solvedAt = null;

                    for (const sub of problemSubmissions) {
                        if (sub.statusDisplay === 'Accepted') {
                            solvedAt = new Date(parseInt(sub.timestamp) * 1000);
                            break;
                        } else {
                            failCount++;
                        }
                    }

                    if (solvedAt) {
                        const penalty = failCount * 5;
                        problemProgress.status = 'ACCEPTED';
                        problemProgress.solved_at = solvedAt;
                        problemProgress.fail_count = failCount;
                        problemProgress.penalty = penalty;

                        // Update score
                        const difficulty = problem.problem_id?.difficulty || 'Medium';
                        const points = difficulty === 'Easy' ? 3 : difficulty === 'Medium' ? 4 : 6;
                        participation.score += points;
                        participation.total_penalty += penalty;
                        hasChanges = true;
                    } else if (failCount > 0) {
                        problemProgress.fail_count = failCount;
                        problemProgress.status = 'FAIL';
                        hasChanges = true;
                    }
                }

                if (hasChanges) {
                    participation.last_sync = new Date();
                    await participation.save();
                    syncedCount++;
                }

            } catch (error) {
                console.error(`Error syncing ${participation.user_id?.leetcode_username}:`, error.message);
                errorCount++;
            }
        }

        // Update last bulk sync time
        contest.last_bulk_sync = new Date();
        await contest.save();

        res.json({
            message: `Synced ${syncedCount} participants successfully`,
            synced: syncedCount,
            errors: errorCount,
            total: participations.length
        });

    } catch (error) {
        console.error('Sync all error:', error);
        res.status(500).json({ message: 'Server error during bulk sync' });
    }
});

module.exports = router;
