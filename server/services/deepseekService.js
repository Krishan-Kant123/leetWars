const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

/**
 * Call OpenRouter AI API using fetch
 */
const callOpenRouter = async (messages, systemPrompt = '') => {
    try {
        const messagesWithSystem = systemPrompt 
            ? [{ role: 'system', content: systemPrompt }, ...messages]
            : messages;

        const response = await fetch(OPENROUTER_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'openai/gpt-oss-120b:free',
                messages: messagesWithSystem,
                reasoning:{ enabled: true }
            })
        });
        if (!response.ok) {
            const error = await response.json();
            console.error('OpenRouter API Errorr:', error);
            throw new Error('API request failed');
        }

        const result = await response.json();
        return result.choices[0].message.content;

    } catch (error) {
        console.error('OpenRouter API Error:', error.message);
        throw new Error('Failed to get response from AI bot');
    }
};


/**
 * Analyze user's LeetCode progress
 */
const analyzeProgress = async (userStats) => {
    const { solvedStats, totalProblems, tagStats, contestRanking } = userStats;

    const systemPrompt = 'You are a helpful LeetCode coaching AI assistant. Provide concise, motivating feedback.';

    const userPrompt = `Analyze this user's LeetCode progress:

Stats:
- Easy: ${solvedStats.easy}/${totalProblems.easy} solved
- Medium: ${solvedStats.medium}/${totalProblems.medium} solved
- Hard: ${solvedStats.hard}/${totalProblems.hard} solved
- Contest Rating: ${contestRanking?.rating || 'Not participated'}
- Top Topics: ${tagStats?.slice(0, 5).map(t => `${t.tagName} (${t.problemsSolved})`).join(', ')}

Provide:
1. 2-3 strengths
2. 2-3 areas to improve
3. 3 specific actionable recommendations
4. Overall assessment

Keep it concise and motivating.`;

    const messages = [{ role: 'user', content: userPrompt }];

    return await callOpenRouter(messages, systemPrompt);
};

/**
 * Generate a roast based on user stats
 */
const generateRoast = async (userStats, severity = 'medium') => {
    const { solvedStats, totalProblems, tagStats, contestRanking } = userStats;

    const totalSolved = solvedStats.easy + solvedStats.medium + solvedStats.hard;
    const easyPercent = ((solvedStats.easy / totalProblems.easy) * 100).toFixed(1);
    const mediumPercent = ((solvedStats.medium / totalProblems.medium) * 100).toFixed(1);
    const hardPercent = ((solvedStats.hard / totalProblems.hard) * 100).toFixed(1);

    let intensityPrompt = '';
    if (severity === 'mild') {
        intensityPrompt = 'Be playful and light-hearted. Make it funny but not too harsh.';
    } else if (severity === 'medium') {
        intensityPrompt = 'Be witty and moderately savage. Make them laugh while feeling the burn.';
    } else {
        intensityPrompt = 'Go full savage mode! Brutally honest, hilariously mean, but still motivating at the end.';
    }

    const systemPrompt = 'You are a savage but roast bot for LeetCode users. Roast them based on their stats but end with motivation.';

    const userPrompt = `Roast this user:

Stats:
- Total Solved: ${totalSolved}
- Easy: ${solvedStats.easy}/${totalProblems.easy} (${easyPercent}%)
- Medium: ${solvedStats.medium}/${totalProblems.medium} (${mediumPercent}%)
- Hard: ${solvedStats.hard}/${totalProblems.hard} (${hardPercent}%)
- Contest Rating: ${contestRanking?.rating || 'Never participated '}
- Favorite Topics: ${tagStats?.slice(0, 3).map(t => t.tagName).join(', ')}

${intensityPrompt}

Generate a 3-4 sentence roast. Include emojis. End with a motivational challenge.`;

    const messages = [{ role: 'user', content: userPrompt }];

    return await callOpenRouter(messages, systemPrompt);
};

/**
 * Chat with bot about LeetCode progress
 */
const chatWithBot = async (userMessage, userStats, conversationHistory = []) => {
    const { solvedStats, totalProblems, tagStats, contestRanking } = userStats;

    const systemPrompt = `You are a helpful LeetCode coaching AI. You have access to the user's stats:
- Easy: ${solvedStats.easy}/${totalProblems.easy}
- Medium: ${solvedStats.medium}/${totalProblems.medium}
- Hard: ${solvedStats.hard}/${totalProblems.hard}
- Contest Rating: ${contestRanking?.rating || 'Not participated'}
- Strong Topics: ${tagStats?.slice(0, 5).map(t => t.tagName).join(', ')}

Answer questions about their progress, give advice, and provide study recommendations. Be encouraging and specific.`;

    const messages = [
        ...conversationHistory,
        { role: 'user', content: userMessage }
    ];

    return await callOpenRouter(messages, systemPrompt);
};

/**
 * Get improvement suggestions
 */
const getImprovementSuggestions = async (userStats) => {
    const { solvedStats, totalProblems, tagStats } = userStats;

    // Find weak areas (tags with few problems solved)
    const weakTags = tagStats?.filter(t => t.problemsSolved < 10).slice(0, 5) || [];
    
    // Find strong areas
    const strongTags = tagStats?.filter(t => t.problemsSolved >= 20).slice(0, 3) || [];

    const systemPrompt = 'You are a LeetCode study plan expert. Provide specific, actionable advice.';

    const userPrompt = `Create a study plan for this user:

Current Status:
- Easy: ${solvedStats.easy}/${totalProblems.easy}
- Medium: ${solvedStats.medium}/${totalProblems.medium}
- Hard: ${solvedStats.hard}/${totalProblems.hard}

Weak Areas: ${weakTags.map(t => `${t.tagName} (${t.problemsSolved})`).join(', ') || 'None identified'}
Strong Areas: ${strongTags.map(t => `${t.tagName} (${t.problemsSolved})`).join(', ') || 'Building foundation'}

Provide:
1. Top 3 topics to focus on
2. Recommended difficulty distribution
3. Specific problem types to practice
4. Weekly goal suggestion

Keep it specific and actionable.`;

    const messages = [{ role: 'user', content: userPrompt }];

    return await callOpenRouter(messages, systemPrompt);
};

module.exports = {
    analyzeProgress,
    generateRoast,
    chatWithBot,
    getImprovementSuggestions
};
