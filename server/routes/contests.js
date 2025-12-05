const express = require('express');
const router = express.Router();
const Contest = require('../models/Contest');
const Participation = require('../models/Participation');
const Problem = require('../models/Problem');
const authMiddleware = require('../middleware/auth');
const { nanoid } = require('nanoid');

/**
 * POST /api/contests/create
 * Create a new contest (Protected)
 */
router.post('/create', authMiddleware, async (req, res) => {
    try {
        const { name, start_time, duration, problems, isPublic = false } = req.body;

        // Validate input
        if (!name || !start_time || !duration || !problems || problems.length === 0) {
            return res.status(400).json({ 
                message: 'All fields are required and at least one problem must be selected' 
            });
        }

        // Validate duration range
        const durationNum = parseInt(duration);
        if (isNaN(durationNum) || durationNum < 20 || durationNum > 180) {
            return res.status(400).json({
                message: 'Contest duration must be between 20 and 180 minutes (3 hours)'
            });
        }

        // Generate unique code (unique among active/upcoming contests only)
        let unique_code;
        let isUnique = false;
        let attempts = 0;
        const maxAttempts = 10;

        while (!isUnique && attempts < maxAttempts) {
            unique_code = nanoid(8);
            
            // Check if code exists in active or upcoming contests (not ended)
            const existingContest = await Contest.findOne({
                unique_code,
                end_time: { $gt: new Date() } // Only check non-ended contests
            });
            
            if (!existingContest) {
                isUnique = true;
            }
            attempts++;
        }

        if (!isUnique) {
            return res.status(500).json({
                message: 'Failed to generate unique contest code. Please try again.'
            });
        }

        console.log(`✅ Generated unique code: ${unique_code} (attempts: ${attempts})`);

        // Calculate end time
        const startDate = new Date(start_time);
        
        // Validate that start time is not in the past
        const now = new Date();
        if (startDate < now) {
            return res.status(400).json({
                message: 'Contest start time cannot be in the past'
            });
        }
        
        const endDate = new Date(startDate.getTime() + duration * 60000);

        // Create contest
        const contest = new Contest({
            unique_code,
            name,
            creator_id: req.user._id,
            start_time: startDate,
            end_time: endDate,
            duration,
            isPublic,
            problems: problems.map(p => ({
                problem_id: p.problem_id,
                slug: p.slug,
                points: p.points || 1
            })),
            participants: []
        });

        await contest.save();

        res.status(201).json({
            message: 'Contest created successfully',
            contest: {
                id: contest._id,
                name: contest.name,
                unique_code: contest.unique_code,
                start_time: contest.start_time,
                end_time: contest.end_time,
                duration: contest.duration,
                isPublic: contest.isPublic,
                problems: contest.problems
            }
        });

    } catch (error) {
        console.error('Contest creation error:', error);
        res.status(500).json({ 
            message: 'Server error during contest creation' 
        });
    }
});

/**
 * POST /api/contests/enroll/:code
 * Enroll in a contest (Protected)
 */
router.post('/enroll/:code', authMiddleware, async (req, res) => {
    try {
        const { code } = req.params;

        // Find contest (only active/upcoming, not ended)
        const contest = await Contest.findOne({ 
            unique_code: code,
            end_time: { $gt: new Date() } // Only find non-ended contests
        });

        if (!contest) {
            return res.status(404).json({ 
                message: 'Contest not found or has already ended' 
            });
        }

        // Check if already enrolled
        if (contest.participants.includes(req.user._id)) {
            return res.status(400).json({ 
                message: 'You are already enrolled in this contest' 
            });
        }

        // No need to check end_time again since we already filtered it in findOne

        // Add user to participants
        contest.participants.push(req.user._id);
        await contest.save();

        // Create participation record
        const participation = new Participation({
            contest_id: contest._id,
            user_id: req.user._id,
            leetcode_username: req.user.leetcode_username,
            problem_progress: contest.problems.map(p => ({
                slug: p.slug,
                status: 'PENDING',
                fail_count: 0
            }))
        });

        await participation.save();

        res.json({
            message: 'Successfully enrolled in contest',
            contest: {
                id: contest._id,
                name: contest.name,
                start_time: contest.start_time,
                end_time: contest.end_time
            }
        });

    } catch (error) {
        console.error('Enrollment error:', error);
        res.status(500).json({ 
            message: 'Server error during enrollment' 
        });
    }
});

/**
 * GET /api/contests/:code
 * Get contest details (Protected)
 */
router.get('/:code', authMiddleware, async (req, res) => {
    try {
        const { code } = req.params;

        // First, try to find active/upcoming contest with this code
        let contest = await Contest.findOne({ 
            unique_code: code,
            end_time: { $gt: new Date() }
        })
            .populate('creator_id', 'username')
            .populate('problems.problem_id', 'title difficulty');

        // If no active contest found, check if there's an ended contest with this code
        // (allow viewing if user is enrolled)
        if (!contest) {
            contest = await Contest.findOne({ unique_code: code })
                .populate('creator_id', 'username')
                .populate('problems.problem_id', 'title difficulty');
            
            // If found but ended, check enrollment
            if (contest && new Date() > contest.end_time) {
                const isEnrolled = contest.participants.includes(req.user._id);
                if (!isEnrolled) {
                    return res.status(404).json({ 
                        message: 'Contest not found or has ended' 
                    });
                }
            }
        }

        if (!contest) {
            return res.status(404).json({ 
                message: 'Contest not found' 
            });
        }

        // Check if user is enrolled
        const isEnrolled = contest.participants.includes(req.user._id);

        res.json({
            contest: {
                id: contest._id,
                name: contest.name,
                unique_code: contest.unique_code,
                creator: contest.creator_id.username,
                start_time: contest.start_time,
                end_time: contest.end_time,
                duration: contest.duration,
                problems: contest.problems,
                isEnrolled,
                participantCount: contest.participants.length
            }
        });

    } catch (error) {
        console.error('Get contest error:', error);
        res.status(500).json({ 
            message: 'Server error fetching contest' 
        });
    }
});

/**
 * GET /api/contests/my/enrolled
 * Get all contests user is enrolled in (Protected)
 */
router.get('/my/enrolled', authMiddleware, async (req, res) => {
    try {
        const contests = await Contest.find({ 
            participants: req.user._id 
        }).populate('creator_id', 'username');

        res.json({ contests });

    } catch (error) {
        console.error('Get enrolled contests error:', error);
        res.status(500).json({ 
            message: 'Server error fetching enrolled contests' 
        });
    }
});

/**
 * GET /api/contests/my/created
 * Get all contests created by user (Protected)
 */
router.get('/my/created', authMiddleware, async (req, res) => {
    try {
        const contests = await Contest.find({ 
            creator_id: req.user._id 
        });

        res.json({ contests });

    } catch (error) {
        console.error('Get created contests error:', error);
        res.status(500).json({ 
            message: 'Server error fetching created contests' 
        });
    }
});

/**
 * GET /api/contests/public/all
 * Get all public contests (Protected)
 */
router.get('/public/all', authMiddleware, async (req, res) => {
    try {
        const contests = await Contest.find({ 
            isPublic: true 
        })
        .populate('creator_id', 'username')
        .sort({ start_time: -1 }); // Newest first

        // Categorize into upcoming, live, and past
        const now = new Date();
        const upcoming = [];
        const live = [];
        const past = [];

        contests.forEach(contest => {
            const start = new Date(contest.start_time);
            const end = new Date(contest.end_time);
            const isEnrolled = contest.participants.includes(req.user._id);

            const contestData = {
                id: contest._id,
                name: contest.name,
                unique_code: contest.unique_code,
                creator: contest.creator_id.username,
                start_time: contest.start_time,
                end_time: contest.end_time,
                duration: contest.duration,
                problemCount: contest.problems.length,
                participantCount: contest.participants.length,
                isEnrolled
            };

            if (now < start) {
                upcoming.push(contestData);
            } else if (now >= start && now <= end) {
                live.push(contestData);
            } else {
                past.push(contestData);
            }
        });

        res.json({ 
            upcoming,
            live,
            past
        });

    } catch (error) {
        console.error('Get public contests error:', error);
        res.status(500).json({ 
            message: 'Server error fetching public contests' 
        });
    }
});

/**
 * POST /api/contests/enroll-by-id/:contestId
 * Enroll in a public contest by ID (Protected)
 */
router.post('/enroll-by-id/:contestId', authMiddleware, async (req, res) => {
    try {
        const { contestId } = req.params;

        // Find contest
        const contest = await Contest.findById(contestId);

        if (!contest) {
            return res.status(404).json({ 
                message: 'Contest not found' 
            });
        }

        // Check if contest is public
        if (!contest.isPublic) {
            return res.status(403).json({ 
                message: 'This contest is private. Please use the contest code to join.' 
            });
        }

        // Check if already enrolled
        if (contest.participants.includes(req.user._id)) {
            return res.status(400).json({ 
                message: 'You are already enrolled in this contest' 
            });
        }

        // Check if contest has already ended
        if (new Date() > contest.end_time) {
            return res.status(400).json({ 
                message: 'This contest has already ended' 
            });
        }

        // Add user to participants
        contest.participants.push(req.user._id);
        await contest.save();

        // Create participation record
        const participation = new Participation({
            contest_id: contest._id,
            user_id: req.user._id,
            leetcode_username: req.user.leetcode_username,
            problem_progress: contest.problems.map(p => ({
                slug: p.slug,
                status: 'PENDING',
                fail_count: 0
            }))
        });

        await participation.save();

        res.json({
            message: 'Successfully enrolled in contest',
            contest: {
                id: contest._id,
                name: contest.name,
                unique_code: contest.unique_code,
                start_time: contest.start_time,
                end_time: contest.end_time
            }
        });

    } catch (error) {
        console.error('Enrollment error:', error);
        res.status(500).json({ 
            message: 'Server error during enrollment' 
        });
    }
});

module.exports = router;
