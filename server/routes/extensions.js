const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const Contest = require('../models/Contest');
const Participation = require('../models/Participation');

const getScoreForDifficulty = (difficulty) => {
  if (difficulty === 'Easy') return 3;
  if (difficulty === 'Medium') return 4;
  if (difficulty === 'Hard') return 6;
  return 1; // fallback
};

const computeFinishTime = (participation, contestStartMs) => {
  const acceptedProblems = participation.problem_progress.filter(p => p.status === 'ACCEPTED');
  if (acceptedProblems.length === 0) return 0;
  const lastSolvedMs = Math.max(...acceptedProblems.map(p => new Date(p.solved_at).getTime()));
  const timeFromStartSecs = (lastSolvedMs - contestStartMs) / 1000;
  const failPenaltySecs = acceptedProblems.reduce((sum, p) => sum + (p.fail_count || 0), 0) * 5 * 60;
  return Math.floor(timeFromStartSecs + failPenaltySecs);
};

// POST /api/extensions/submit-result
// Extension calls this after LeetCode polling + GraphQL details.
router.post('/submit-result', authMiddleware, async (req, res) => {

  try {
    const user = req.user;

    const {
      submissionId,
      submissionTimestampMs,
      statusMsg,
      statusCode,
      accepted,
      leetcodeUsername,
      questionId,
      titleSlug,
      payloadCheck,
      payloadDetails,
    } = req.body || {};

    console.log(`[EXTENSION] Received submission ${submissionId} for ${titleSlug} by ${leetcodeUsername}`);
    console.log(`[EXTENSION] Details: Accepted=${accepted}, statusCode=${statusCode}, subTime=${new Date(submissionTimestampMs).toLocaleString()}`);

    if (!submissionId || !titleSlug || !submissionTimestampMs) {
      console.log(`[EXTENSION] Rejected: Missing required fields`);
      return res.status(400).json({ message: 'submissionId, titleSlug, and submissionTimestampMs are required' });
    }

    // Verify it's the right user submitting
    if (user.leetcode_username && leetcodeUsername && user.leetcode_username.toLowerCase() !== leetcodeUsername.toLowerCase()) {
      console.log(`[EXTENSION] Ignored: Username mismatch (${user.leetcode_username} vs ${leetcodeUsername})`);
      return res.status(403).json({ message: 'Username mismatch', ignored: true });
    }

    const subTime = new Date(submissionTimestampMs);
    let processed = false;
    let ignoreReason = 'Not in any active contest';

    // Find all active contests the user is participating in
    const activeParticipations = await Participation.find({ user_id: user._id }).populate('contest_id');
    console.log(`[EXTENSION] Found ${activeParticipations.length} total participations for user`);

    for (const participation of activeParticipations) {
      const contest = participation.contest_id;
      if (!contest) {
        console.log(`[EXTENSION] Skipping participation ${participation._id} because contest_id is null`);
        continue;
      }

      console.log(`[EXTENSION] Checking contest: "${contest.name}" (Code: ${contest.unique_code})`);

      // If contest is ended or not started yet, ignore
      if (subTime < new Date(contest.start_time) || subTime > new Date(contest.end_time)) {
        ignoreReason = `Submission time ${subTime.toLocaleString()} is outside contest window (${new Date(contest.start_time).toLocaleString()} to ${new Date(contest.end_time).toLocaleString()})`;
        console.log(`[EXTENSION] Skipping "${contest.name}": ${ignoreReason}`);
        continue;
      }

      // Check if this problem is in the contest
      const problemIndex = contest.problems.findIndex(p => p.slug === titleSlug);
      if (problemIndex === -1) {
        ignoreReason = `Problem ${titleSlug} is not part of contest ${contest.name}`;
        console.log(`[EXTENSION] Skipping "${contest.name}": ${ignoreReason}`);
        continue;
      }

      // Find problem progress
      const problemProgress = participation.problem_progress.find(p => p.slug === titleSlug);
      if (!problemProgress) {
        ignoreReason = `No problem progress found for ${titleSlug} in contest ${contest.name}`;
        console.log(`[EXTENSION] Skipping "${contest.name}": ${ignoreReason}`);
        continue;
      }

      // Skip if already solved
      if (problemProgress.status === 'ACCEPTED') {
        ignoreReason = `Already accepted in contest ${contest.name}`;
        console.log(`[EXTENSION] Skipping "${contest.name}": ${ignoreReason}`);
        continue;
      }

      let scoreChanged = false;

      if (accepted) {
        // Find the problem to get its difficulty
        const fullContest = await Contest.findById(contest._id).populate('problems.problem_id');
        const problemWithDetails = fullContest.problems.find(p => p.slug === titleSlug);
        const difficulty = problemWithDetails?.problem_id?.difficulty || 'Medium';

        // Calculate penalty based on existing fail_count
        const penalty = problemProgress.fail_count * 5;

        problemProgress.status = 'ACCEPTED';
        problemProgress.solved_at = subTime;
        problemProgress.penalty = penalty;

        participation.score += getScoreForDifficulty(difficulty);
        participation.total_penalty += penalty;
        scoreChanged = true;
        
        console.log(`[EXTENSION] Updated "${contest.name}": Marked ACCEPTED. Added penalty ${penalty}m. New score: ${participation.score}`);
      } else {
        // Compile errors usually don't give a penalty in standard contest rules, 
        // but status_code 20 is Compile Error. 10 is Accepted.
        // We will only increment fail count if it's a valid runtime failure (WA, TLE, MLE, etc)
        // 20 = Compile Error
        if (statusCode !== 20) {
          problemProgress.fail_count = (problemProgress.fail_count || 0) + 1;
          problemProgress.status = 'FAIL';
          console.log(`[EXTENSION] Updated "${contest.name}": Marked FAIL. Incremented fail_count to ${problemProgress.fail_count}. (Total Penalty is only added upon Accepted)`);
        } else {
          console.log(`[EXTENSION] Updated "${contest.name}": Ignored fail count because it's a Compile Error (statusCode 20)`);
        }
      }

      participation.finish_time = computeFinishTime(participation, new Date(contest.start_time).getTime());
      participation.last_sync = new Date();
      await participation.save();
      console.log(`[EXTENSION] Participation saved successfully for "${contest.name}"`);

      processed = true;

      // Recalculate ranks if score changed
      if (scoreChanged) {
        const allParticipations = await Participation.find({ contest_id: contest._id })
          .sort({ score: -1, finish_time: 1 });

        for (let i = 0; i < allParticipations.length; i++) {
          const p = allParticipations[i];
          const newRank = i + 1;
          if (p.rank !== newRank) {
            p.rank = newRank;
            await p.save();
          }
        }
        console.log(`[EXTENSION] Recalculated ranks for "${contest.name}"`);
      }
    }

    return res.json({
      ok: true,
      ignored: !processed,
      message: processed ? 'Submission processed for contest(s)' : `Submission ignored: ${ignoreReason}`,
    });
  } catch (error) {
    console.error('Extension submit-result error:', error);
    return res.status(500).json({ message: 'Server error during submit-result' });
  }
});

// GET /api/extensions/active-contests
// Fetches the user's active contests with their current score, penalty, and accepted count.
router.get('/active-contests', authMiddleware, async (req, res) => {
  try {
    const user = req.user;
    const activeParticipations = await Participation.find({ user_id: user._id }).populate('contest_id');
    const now = new Date();

    const results = [];
    for (const p of activeParticipations) {
      const contest = p.contest_id;
      if (!contest) continue;

      // Only return contests that are currently active
      if (now >= new Date(contest.start_time) && now <= new Date(contest.end_time)) {
        const acceptedCount = p.problem_progress.filter(prob => prob.status === 'ACCEPTED').length;
        
        const problemsList = contest.problems.map(prob => {
          const progress = p.problem_progress.find(pr => pr.slug === prob.slug);
          return {
            slug: prob.slug,
            status: progress ? progress.status : 'NOT_STARTED'
          };
        });

        results.push({
          id: contest._id,
          name: contest.name,
          score: p.score,
          total_penalty: p.total_penalty,
          accepted_count: acceptedCount,
          total_problems: contest.problems.length,
          end_time: contest.end_time,
          problems: problemsList
        });
      }
    }

    return res.json({ activeContests: results });
  } catch (error) {
    console.error('Extension active-contests error:', error);
    return res.status(500).json({ message: 'Server error fetching active contests' });
  }
});

module.exports = router;
