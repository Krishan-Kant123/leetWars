const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const User = require('../models/User');
const { validateLeetCodeUsername } = require('../services/leetcodeService');

/**
 * @route GET /api/onboarding/validate-leetcode/:username
 * @desc Validate if a LeetCode username exists and is public
 * @access Public (no auth required for validation)
 */
router.get('/validate-leetcode/:username', async (req, res) => {
    try {
        const { username } = req.params;

        if (!username || username.length < 1) {
            return res.status(400).json({
                valid: false,
                message: 'Username is required'
            });
        }

        // Validate the LeetCode username using the existing service
        const isValid = await validateLeetCodeUsername(username);

        res.json({
            valid: isValid,
            username: username,
            message: isValid ? 'Valid LeetCode profile found' : 'Username not found or profile is not public'
        });

    } catch (error) {
        console.error('LeetCode validation error:', error);
        res.status(500).json({
            valid: false,
            message: 'Failed to validate LeetCode username'
        });
    }
});

/**
 * @route POST /api/onboarding/set-leetcode-id
 * @desc Set the LeetCode username for the authenticated user
 * @access Private (requires auth)
 */
router.post('/set-leetcode-id', authMiddleware, async (req, res) => {
    try {
        const { leetcode_username, name } = req.body;
        const userId = req.user._id;

        if (!leetcode_username || leetcode_username.trim().length < 1) {
            return res.status(400).json({
                message: 'LeetCode username is required'
            });
        }

        // Validate the LeetCode username
        const isValid = await validateLeetCodeUsername(leetcode_username);

        if (!isValid) {
            return res.status(400).json({
                message: 'Invalid LeetCode username. Please ensure your profile exists and is public.'
            });
        }

        // Check if this LeetCode username is already taken by another user
        const existingUser = await User.findOne({
            leetcode_username: leetcode_username.trim(),
            _id: { $ne: userId }
        });

        if (existingUser) {
            return res.status(400).json({
                message: 'This LeetCode username is already linked to another account'
            });
        }

        // Prepare update object
        const updateData = {
            leetcode_username: leetcode_username.trim(),
            // If username is not set, use leetcode_username as fallback
            ...(req.user.username ? {} : { username: leetcode_username.trim() })
        };

        // If name is provided, update it
        if (name && name.trim()) {
            updateData.name = name.trim();
        }

        // Update the user's LeetCode username and name
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            updateData,
            { new: true, select: '-password_hash' }
        );

        if (!updatedUser) {
            return res.status(404).json({
                message: 'User not found'
            });
        }

        res.json({
            message: 'Profile updated successfully',
            user: {
                id: updatedUser._id,
                username: updatedUser.username,
                name: updatedUser.name,
                email: updatedUser.email,
                leetcode_username: updatedUser.leetcode_username
            }
        });

    } catch (error) {
        console.error('Set LeetCode username error:', error);
        res.status(500).json({
            message: 'Failed to update profile'
        });
    }
});

module.exports = router;
