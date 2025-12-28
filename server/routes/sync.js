const express = require('express');
const router = express.Router();
const Contest = require('../models/Contest');
const Participation = require('../models/Participation');
const authMiddleware = require('../middleware/auth');
const { getRecentSubmissions } = require('../services/leetcodeService');

/**
 * POST /api/sync/:contestId
 * Sync user's LeetCode submissions for a specific contest (Protected)
 * contestId can be either MongoDB ObjectId or contest unique_code
 */
router.post('/:contestId', authMiddleware, async (req, res) => {
    try {
        const { contestId } = req.params;

        // Find contest - try by ObjectId first, then by unique_code
        let contest;
        if (contestId.match(/^[0-9a-fA-F]{24}$/)) {
            contest = await Contest.findById(contestId);
        }
        if (!contest) {
            contest = await Contest.findOne({ unique_code: contestId });
        }

        if (!contest) {
            return res.status(404).json({ 
                message: 'Contest not found' 
            });
        }

        // Find participation using contest._id
        const participation = await Participation.findOne({
            contest_id: contest._id,
            user_id: req.user._id
        });

        if (!participation) {
            return res.status(404).json({ 
                message: 'You are not enrolled in this contest' 
            });
        }

        // Check rate limiting (30 seconds between syncs)
        if (participation.last_sync) {
            const timeSinceLastSync = Date.now() - new Date(participation.last_sync).getTime();
            if (timeSinceLastSync < 30000) {
                return res.status(429).json({ 
                    message: `Please wait ${Math.ceil((30000 - timeSinceLastSync) / 1000)} seconds before syncing again` 
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
        
        console.log('=== SYNC DEBUG ===');
        console.log('Contest:', contest.name);
        console.log('Contest time range:', new Date(contestStartTime * 1000), 'to', new Date(contestEndTime * 1000));
        console.log('Total submissions fetched:', submissions.length);
        console.log('Submissions:', submissions.map(s => ({ slug: s.titleSlug, status: s.statusDisplay, time: new Date(parseInt(s.timestamp) * 1000) })));

        // Iterate through contest problems
        for (const problem of contest.problems) {
            const slug = problem.slug;
            
            console.log('Processing problem:', slug);
            
            // Find this problem in participation
            const problemProgress = participation.problem_progress.find(p => p.slug === slug);
            
            if (!problemProgress) {
                console.log('  No progress entry for:', slug);
                continue;
            }

            // Skip if already solved
            if (problemProgress.status === 'ACCEPTED') {
                console.log('  Already solved:', slug);
                continue;
            }

            // Find relevant submissions for this problem
            const problemSubmissions = submissions.filter(sub => 
                sub.titleSlug === slug &&
                parseInt(sub.timestamp) >= contestStartTime &&
                parseInt(sub.timestamp) <= contestEndTime
            );
            
            console.log('  Found', problemSubmissions.length, 'submissions for', slug);

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
                    const fullProblem = await Contest.findById(contest._id).populate('problems.problem_id');
                    const problemWithDetails = fullProblem.problems.find(p => p.slug === slug);
                    const difficulty = problemWithDetails?.problem_id?.difficulty || 'Medium';
                    
                    participation.score += getScoreForDifficulty(difficulty);
                    participation.total_penalty += penalty;
                    scoreChanged = true;
                }
            } else if (failCount > 0) {
                problemProgress.fail_count = failCount;
                problemProgress.status = 'FAIL';
                console.log('  Updated FAIL status:', slug, 'fail_count:', failCount);
            }
        }

        console.log('=== SAVING PARTICIPATION ===');
        console.log('Score:', participation.score);
        console.log('Total Penalty:', participation.total_penalty);
        console.log('Problem Progress:', participation.problem_progress.map(p => ({ 
            slug: p.slug, 
            status: p.status, 
            fail_count: p.fail_count 
        })));

        // Update last sync time
        participation.last_sync = new Date();
        await participation.save();
        
        console.log('Participation saved successfully');

        // Recalculate ranks for all participants in this contest
        if (scoreChanged) {
            const allParticipations = await Participation.find({ contest_id: contest._id })
                .sort({ score: -1, total_penalty: 1 });
            
            for (let i = 0; i < allParticipations.length; i++) {
                const p = allParticipations[i];
                const newRank = i + 1;
                if (p.rank !== newRank) {
                    p.rank = newRank;
                    await p.save();
                }
            }
        }

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
 * contestId can be either MongoDB ObjectId or contest unique_code
 */
router.get('/leaderboard/:contestId', authMiddleware, async (req, res) => {
    try {
        const { contestId } = req.params;

        // Find contest - try by ObjectId first, then by unique_code
        let contest;
        if (contestId.match(/^[0-9a-fA-F]{24}$/)) {
            contest = await Contest.findById(contestId);
        }
        if (!contest) {
            contest = await Contest.findOne({ unique_code: contestId });
        }
        
        if (!contest) {
            return res.status(404).json({ message: 'Contest not found' });
        }

        // Find all participations for this contest using contest._id
        const participations = await Participation.find({ contest_id: contest._id })
            .populate('user_id', 'username leetcode_username')
            .sort({ score: -1, total_penalty: 1 }); // Sort by score desc, then penalty asc

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
            
            // Calculate total attempts across all problems
            const totalAttempts = p.problem_progress.reduce((sum, prob) => 
                sum + (prob.fail_count || 0), 0
            );
            
            return {
                rank: index + 1,
                username: p.user_id?.username || 'Unknown',
                leetcode_username: p.user_id?.leetcode_username || 'Unknown',
                score: p.score,
                penalty: Math.round(p.total_penalty * 100) / 100, // Round to 2 decimals
                total_time: totalTime, // in seconds
                solved: acceptedProblems.length,
                attempts: totalAttempts, // NEW: Total failed attempts
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
 * Cooldown: 10 minutes between syncs
 * contestId can be either MongoDB ObjectId or contest unique_code
 */
router.post('/sync-all/:contestId', authMiddleware, async (req, res) => {
    try {
        const { contestId } = req.params;

        // Find contest - try by ObjectId first, then by unique_code
        let contest;
        if (contestId.match(/^[0-9a-fA-F]{24}$/)) {
            contest = await Contest.findById(contestId).populate('problems.problem_id');
        }
        if (!contest) {
            contest = await Contest.findOne({ unique_code: contestId }).populate('problems.problem_id');
        }
        
        if (!contest) {
            return res.status(404).json({ message: 'Contest not found' });
        }

        // Check if contest is finalized (no more syncs allowed)
        if (contest.finalized) {
            return res.status(400).json({ 
                message: 'Contest has been finalized. Rankings are locked.' 
            });
        }

        const now = Date.now();
        const contestEndTime = new Date(contest.end_time).getTime();
        const gracePeriodMs = 60 * 60 * 1000; // 1 hour grace period
        const isGracePeriod = now > contestEndTime && now <= (contestEndTime + gracePeriodMs);
        const isContestEnded = now > contestEndTime;
        const isPastGracePeriod = now > (contestEndTime + gracePeriodMs);

        // If past grace period and not finalized, auto-finalize (no syncs allowed)
        if (isPastGracePeriod) {
            // Mark as finalized if not already
            if (!contest.finalized) {
                contest.finalized = true;
                await contest.save();
            }
            return res.status(400).json({ 
                message: 'Grace period has ended. Rankings are now locked.' 
            });
        }

        // Check cooldown - use reduced cooldown (2 min) during grace period
        if (contest.last_bulk_sync) {
            const timeSinceLastSync = now - new Date(contest.last_bulk_sync).getTime();
            const cooldownMs = isGracePeriod ? 2 * 60 * 1000 : 10 * 60 * 1000; // 2 min during grace, 10 min otherwise
            
            if (timeSinceLastSync < cooldownMs) {
                const waitTime = Math.ceil((cooldownMs - timeSinceLastSync) / 1000);
                return res.status(429).json({
                    message: `Please wait ${waitTime} seconds before syncing all again`,
                    cooldown: waitTime,
                    isGracePeriod: isGracePeriod
                });
            }
        }

        // Get all participations using contest._id
        const participations = await Participation.find({ contest_id: contest._id })
            .populate('user_id', 'leetcode_username');
        
        if (participations.length === 0) {
            return res.status(404).json({ message: 'No participants found' });
        }
        
        let syncedCount = 0;
        let errorCount = 0;
        const User = require('../models/User');

        // Sync each participant with delay to avoid rate limiting
        for (let i = 0; i < participations.length; i++) {
            const participation = participations[i];
            
            try {
                const user = participation.user_id;
                if (!user || !user.leetcode_username) {
                    console.log(`Skipping participation - no LeetCode username`);
                    continue;
                }

                // Add delay between requests to avoid rate limiting (except for first request)
                if (i > 0) {
                    const delay = 2000 + Math.random() * 1000; // 2-3 seconds random delay
                    await new Promise(resolve => setTimeout(resolve, delay));
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

        // Calculate and save ranks for all participants
        const allParticipations = await Participation.find({ contest_id: contest._id })
            .sort({ score: -1, total_penalty: 1 }); // Sort by score desc, penalty asc
        
        for (let i = 0; i < allParticipations.length; i++) {
            const participation = allParticipations[i];
            const newRank = i + 1;
            if (participation.rank !== newRank) {
                participation.rank = newRank;
                await participation.save();
            }
        }
        console.log(`Updated ranks for ${allParticipations.length} participants`);

        // Refetch contest to get latest state for grace period check
        const nowAfterSync = Date.now();
        const endTimeCheck = new Date(contest.end_time).getTime();
        const gracePeriodCheck = 60 * 60 * 1000;
        const isInGracePeriod = nowAfterSync > endTimeCheck && nowAfterSync <= (endTimeCheck + gracePeriodCheck);
        const contestEnded = nowAfterSync > endTimeCheck;

        res.json({
            message: `Synced ${syncedCount} participants successfully`,
            synced: syncedCount,
            errors: errorCount,
            total: participations.length,
            isGracePeriod: isInGracePeriod,
            contestEnded: contestEnded,
            finalized: contest.finalized
        });

    } catch (error) {
        console.error('Sync all error:', error);
        res.status(500).json({ message: 'Server error during bulk sync' });
    }
});

module.exports = router;
