const express = require('express');
const router = express.Router();
const Problem = require('../models/Problem');
const authMiddleware = require('../middleware/auth');
const { searchProblemsOnLeetCode } = require('../services/leetcodeService');

/**
 * GET /api/problems/search
 * Search problems - first in local DB, then LeetCode API (Protected)
 */
router.get('/search', authMiddleware, async (req, res) => {
    try {
        const { query, difficulty, tags, page = 1, limit = 20 } = req.query;
        
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;
        
        console.log('\n Problem Search Request:');
        console.log('   Query:', query || 'none');
        console.log('   Difficulty:', difficulty || 'none');
        console.log('   Tags:', tags || 'none');
        console.log('   Page:', pageNum, '| Limit:', limitNum);

        // Step 1: Search local database
        let filter = {};

        if (query) {
            filter.$or = [
                { title: { $regex: query, $options: 'i' } },
                { title_slug: { $regex: query, $options: 'i' } }
            ];
        }

        if (difficulty) {
            filter.difficulty = difficulty;
        }

        if (tags) {
            const tagArray = tags.split(',').map(t => t.trim());
            filter.tags = { $in: tagArray };
        }

        console.log('   DB Filter:', JSON.stringify(filter));
        
        // Get total count for pagination
        const totalCount = await Problem.countDocuments(filter);
        
        // Get paginated problems
        let problems = await Problem.find(filter)
            .skip(skip)
            .limit(limitNum)
            .sort({ questionId: 1 });
            
        console.log(`Found ${problems.length} problems (Page ${pageNum}/${Math.ceil(totalCount / limitNum)}, Total: ${totalCount})`);

        // Step 2: If no results in local DB and it's the first page, search LeetCode API
        if (problems.length === 0 && pageNum === 1) {
            console.log('No local results, searching LeetCode API...');
            
            try {
                const leetcodeResults = await searchProblemsOnLeetCode({
                    difficulty,
                    tags: tags ? tags.split(',').map(t => t.trim()) : undefined,
                    searchKeywords: query,
                    limit: limitNum
                });

                console.log(`LeetCode API returned ${leetcodeResults.length} problems`);

                // Step 3: Cache results in local database (async, don't wait)
                if (leetcodeResults.length > 0) {
                    console.log(`Caching ${leetcodeResults.length} problems to database...`);
                    // Save to database in background
                    setImmediate(async () => {
                        try {
                            let cached = 0;
                            for (const problem of leetcodeResults) {
                                await Problem.findOneAndUpdate(
                                    { title_slug: problem.title_slug },
                                    problem,
                                    { upsert: true, new: true }
                                );
                                cached++;
                            }
                            console.log(`Successfully cached ${cached} problems`);
                        } catch (error) {
                            console.error('Error caching problems:', error.message);
                        }
                    });
                }

                problems = leetcodeResults;
            } catch (error) {
                console.error('LeetCode API search failed:', error.message);
                console.error('   Full error:', error);
                // Return empty array if LeetCode API also fails
                return res.json({ 
                    problems: [], 
                    source: 'none',
                    message: 'No results found in local database and LeetCode API search failed',
                    error: error.message,
                    pagination: {
                        page: pageNum,
                        limit: limitNum,
                        total: 0,
                        totalPages: 0,
                        hasMore: false
                    }
                });
            }
        }

        const totalPages = Math.ceil(totalCount / limitNum);
        const hasMore = pageNum < totalPages;

        console.log(`Returning ${problems.length} problems\n`);
        res.json({ 
            problems,
            source: problems.length > 0 ? (problems[0]._id ? 'database' : 'leetcode') : 'none',
            count: problems.length,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total: totalCount,
                totalPages,
                hasMore
            }
        });

    } catch (error) {
        console.error('Problem search error:', error);
        res.status(500).json({ 
            message: 'Server error searching problems',
            error: error.message
        });
    }
});

/**
 * GET /api/problems/:slug
 * Get problem by slug (Protected)
 */
router.get('/:slug', authMiddleware, async (req, res) => {
    try {
        const problem = await Problem.findOne({ title_slug: req.params.slug });

        if (!problem) {
            return res.status(404).json({ 
                message: 'Problem not found' 
            });
        }

        res.json({ problem });

    } catch (error) {
        console.error('Get problem error:', error);
        res.status(500).json({ 
            message: 'Server error fetching problem' 
        });
    }
});

module.exports = router;
