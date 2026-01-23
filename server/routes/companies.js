const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const GoogleSheetsAPIManager = require('../services/googleSheetsService');

/**
 * GET /api/companies/list
 * Get all available companies with their problem counts
 * Protected route - requires authentication
 */
router.get('/list', authMiddleware, async (req, res) => {
    try {
        console.log('\n Companies List Request');
        
        const companies = await GoogleSheetsAPIManager.getCompanies();
        
        // Calculate problem count for each company (endRow - startRow + 1)
        const companiesWithCount = companies.map(company => ({
            name: company.name,
            displayName: company.displayName,
            problemCount: company.endRow - company.startRow + 1
        }));

        // Sort alphabetically by display name
        companiesWithCount.sort((a, b) => a.displayName.localeCompare(b.displayName));

        console.log(` Returning ${companiesWithCount.length} companies\n`);
        
        res.json({
            companies: companiesWithCount,
            count: companiesWithCount.length
        });

    } catch (error) {
        console.error('Error fetching companies:', error);
        res.status(500).json({
            message: 'Failed to fetch companies',
            error: error.message
        });
    }
});

/**
 * GET /api/companies/:companyName/problems
 * Get all problems for a specific company
 * Query params:
 *   - difficulty: Filter by difficulty (Easy, Medium, Hard)
 * Protected route - requires authentication
 */
router.get('/:companyName/problems', authMiddleware, async (req, res) => {
    try {
        const { companyName } = req.params;
        const { difficulty } = req.query;

        console.log(`\n Company Problems Request: "${companyName}"`);
        if (difficulty) {
            console.log(`   Filter: Difficulty = ${difficulty}`);
        }

        // Fetch problems from Google Sheets
        let problems = await GoogleSheetsAPIManager.getCompanyProblems(companyName);

        // Apply difficulty filter if provided
        if (difficulty && difficulty !== 'all') {
            const originalCount = problems.length;
            problems = problems.filter(p => p.difficulty === difficulty);
            console.log(`   Filtered: ${originalCount} -> ${problems.length} problems`);
        }

        console.log(` Returning ${problems.length} problems for "${companyName}"\n`);

        res.json({
            problems,
            count: problems.length,
            companyName: companyName
        });

    } catch (error) {
        console.error(` Error fetching problems for "${req.params.companyName}":`, error);
        
        // Return appropriate status code
        const statusCode = error.message.includes('not found') ? 404 : 500;
        
        res.status(statusCode).json({
            message: error.message,
            error: error.message
        });
    }
});

/**
 * POST /api/companies/cache/clear
 * Clear the in-memory cache (useful for testing or manual refresh)
 * Protected route - requires authentication
 */
router.post('/cache/clear', authMiddleware, async (req, res) => {
    try {
        console.log('\n  Cache Clear Request');
        
        GoogleSheetsAPIManager.clearCache();
        
        console.log(' Cache cleared successfully\n');
        
        res.json({
            message: 'Cache cleared successfully'
        });

    } catch (error) {
        console.error('Error clearing cache:', error);
        res.status(500).json({
            message: 'Failed to clear cache',
            error: error.message
        });
    }
});

module.exports = router;
