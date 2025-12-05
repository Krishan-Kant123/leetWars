import { useState, useEffect } from 'react';
import { profileAPI } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import {
    PieChart, Pie, Cell,
    BarChart, Bar,
    LineChart, Line,
    XAxis, YAxis,
    CartesianGrid, Tooltip, Legend,
    ResponsiveContainer,
    RadialBarChart, RadialBar
} from 'recharts';

const COLORS = {
    easy: '#22c55e',
    medium: '#fbbf24',
    hard: '#ef4444',
    solved: '#10b981',
    total: '#374151'
};

const Profile = () => {
    const { user } = useAuth();
    const [leetcodeData, setLeetcodeData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        setLoading(true);

        try {
            console.log('📊 Fetching LeetCode stats...');

            const response = await profileAPI.getLeetCodeStats();
            console.log('✅ LeetCode Stats received:', response.data);

            setLeetcodeData(response.data);
            setLoading(false);

        } catch (error) {
            console.error('❌ Error fetching stats:', error);
            setLoading(false);
        }
    };

    // Show loading state
    if (loading || !leetcodeData) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="spinner mb-4"></div>
                    <p className="text-gray-400">Loading your profile...</p>
                </div>
            </div>
        );
    }

    const { profile, tagStats, contestRanking, contestHistory } = leetcodeData;
    const { solvedStats, totalProblems } = profile;

    // Prepare data for charts
    const totalSolved = solvedStats?.total || 0;
    const totalQs = totalProblems?.total || 0;

    const difficultyData = [
        { name: 'Easy', value: solvedStats?.easy || 0, total: totalProblems?.easy || 0, color: COLORS.easy },
        { name: 'Medium', value: solvedStats?.medium || 0, total: totalProblems?.medium || 0, color: COLORS.medium },
        { name: 'Hard', value: solvedStats?.hard || 0, total: totalProblems?.hard || 0, color: COLORS.hard }
    ];

    const progressData = [
        {
            name: 'Progress',
            solved: totalSolved,
            total: totalQs,
            fill: COLORS.solved
        }
    ];

    const topTags = (tagStats || []).slice(0, 10).map(tag => ({
        name: tag.tagName,
        problems: tag.problemsSolved
    }));

    // Contest rating history for line chart
    const ratingHistory = (contestHistory || []).map((contest, index) => ({
        contest: contest.contestTitle?.split(' ').slice(-2).join(' ') || `C${index + 1}`,
        rating: Math.round(contest.rating),
        rank: contest.ranking,
        solved: contest.problemsSolved
    }));

    const CustomTooltip = ({ active, payload }) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-[#0f2a23] p-3 rounded-lg border border-[#10b981]/30">
                    <p className="text-white font-semibold">{payload[0].payload.name || payload[0].name}</p>
                    <p className="text-[#10b981]">{payload[0].value} {payload[0].name === 'rating' ? 'rating' : 'solved'}</p>
                    {payload[0].payload.total && (
                        <p className="text-gray-400 text-sm">out of {payload[0].payload.total}</p>
                    )}
                </div>
            );
        }
        return null;
    };

    return (
        <div className="min-h-screen py-12 px-4">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex items-center gap-6 mb-12 animate-fade-in">
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#10b981] to-[#059669] flex items-center justify-center text-white text-4xl font-bold shadow-2xl">
                        {profile?.profile?.realName?.[0]?.toUpperCase() || user?.username?.[0]?.toUpperCase()}
                    </div>
                    <div>
                        <h1 className="text-4xl font-bold gradient-text mb-2">
                            {profile?.profile?.realName || user?.username}
                        </h1>
                        <p className="text-gray-400 flex items-center gap-2 mb-2">
                            <span>💻</span>
                            LeetCode: <span className="text-[#10b981]">{profile?.username}</span>
                        </p>
                        <div className="flex gap-3">
                            <div className="px-3 py-1 bg-[#10b981]/20 border border-[#10b981]/30 rounded-lg">
                                <span className="text-sm text-gray-400">Ranking: </span>
                                <span className="text-[#10b981] font-bold">#{profile?.profile?.ranking?.toLocaleString()}</span>
                            </div>
                            {profile?.profile?.starRating > 0 && (
                                <div className="px-3 py-1 bg-yellow-500/20 border border-yellow-500/30 rounded-lg">
                                    <span className="text-yellow-400">{'⭐'.repeat(profile.profile.starRating)}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Overall Progress */}
                <div className="mb-8">
                    <h2 className="text-2xl font-bold mb-6 text-white">Overall Progress</h2>
                    <div className="grid md:grid-cols-2 gap-8">
                        {/* Circular Progress */}
                        <div className="card p-6">
                            <h3 className="text-lg font-semibold mb-4 text-white text-center">Total Problems Solved</h3>
                            <ResponsiveContainer width="100%" height={250}>
                                <RadialBarChart
                                    cx="50%"
                                    cy="50%"
                                    innerRadius="60%"
                                    outerRadius="90%"
                                    data={progressData}
                                    startAngle={180}
                                    endAngle={0}
                                >
                                    <RadialBar
                                        minAngle={15}
                                        background
                                        clockWise
                                        dataKey="solved"
                                        cornerRadius={10}
                                    />
                                    <text
                                        x="50%"
                                        y="45%"
                                        textAnchor="middle"
                                        dominantBaseline="middle"
                                        className="text-5xl font-bold fill-[#10b981]"
                                    >
                                        {totalSolved}
                                    </text>
                                    <text
                                        x="50%"
                                        y="58%"
                                        textAnchor="middle"
                                        dominantBaseline="middle"
                                        className="text-sm fill-gray-400"
                                    >
                                        / {totalQs}
                                    </text>
                                </RadialBarChart>
                            </ResponsiveContainer>
                            <div className="text-center mt-4">
                                <div className="text-3xl font-bold text-[#10b981]">
                                    {totalQs > 0 ? ((totalSolved / totalQs) * 100).toFixed(1) : 0}%
                                </div>
                                <div className="text-sm text-gray-400">Completion Rate</div>
                            </div>
                        </div>

                        {/* Difficulty Breakdown */}
                        <div className="card p-6">
                            <h3 className="text-lg font-semibold mb-4 text-white text-center">Difficulty Distribution</h3>
                            <ResponsiveContainer width="100%" height={250}>
                                <PieChart>
                                    <Pie
                                        data={difficultyData}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        label={({ name, value }) => value > 0 ? `${name}: ${value}` : ''}
                                        outerRadius={80}
                                        fill="#8884d8"
                                        dataKey="value"
                                    >
                                        {difficultyData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip content={<CustomTooltip />} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* Detailed Stats Cards */}
                <div className="mb-8">
                    <h2 className="text-2xl font-bold mb-6 text-white">Detailed Statistics</h2>
                    <div className="grid md:grid-cols-4 gap-6">
                        <div className="card p-6 text-center border-green-500/30">
                            <div className="text-5xl font-bold text-green-400 mb-2">
                                {solvedStats?.easy || 0}
                            </div>
                            <div className="text-sm text-gray-400 mb-1">Easy Solved</div>
                            <div className="w-full bg-gray-700 rounded-full h-2 mt-2">
                                <div
                                    className="bg-green-400 h-2 rounded-full transition-all duration-500"
                                    style={{ width: `${totalProblems?.easy ? ((solvedStats?.easy || 0) / totalProblems.easy) * 100 : 0}%` }}
                                ></div>
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                                {totalProblems?.easy ? ((solvedStats?.easy || 0) / totalProblems.easy * 100).toFixed(1) : 0}% of {totalProblems?.easy || 0}
                            </div>
                        </div>

                        <div className="card p-6 text-center border-yellow-500/30">
                            <div className="text-5xl font-bold text-yellow-400 mb-2">
                                {solvedStats?.medium || 0}
                            </div>
                            <div className="text-sm text-gray-400 mb-1">Medium Solved</div>
                            <div className="w-full bg-gray-700 rounded-full h-2 mt-2">
                                <div
                                    className="bg-yellow-400 h-2 rounded-full transition-all duration-500"
                                    style={{ width: `${totalProblems?.medium ? ((solvedStats?.medium || 0) / totalProblems.medium) * 100 : 0}%` }}
                                ></div>
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                                {totalProblems?.medium ? ((solvedStats?.medium || 0) / totalProblems.medium * 100).toFixed(1) : 0}% of {totalProblems?.medium || 0}
                            </div>
                        </div>

                        <div className="card p-6 text-center border-red-500/30">
                            <div className="text-5xl font-bold text-red-400 mb-2">
                                {solvedStats?.hard || 0}
                            </div>
                            <div className="text-sm text-gray-400 mb-1">Hard Solved</div>
                            <div className="w-full bg-gray-700 rounded-full h-2 mt-2">
                                <div
                                    className="bg-red-400 h-2 rounded-full transition-all duration-500"
                                    style={{ width: `${totalProblems?.hard ? ((solvedStats?.hard || 0) / totalProblems.hard) * 100 : 0}%` }}
                                ></div>
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                                {totalProblems?.hard ? ((solvedStats?.hard || 0) / totalProblems.hard * 100).toFixed(1) : 0}% of {totalProblems?.hard || 0}
                            </div>
                        </div>

                        <div className="card p-6 text-center border-[#10b981]/30">
                            <div className="text-5xl font-bold text-[#10b981] mb-2">
                                {totalSolved}
                            </div>
                            <div className="text-sm text-gray-400 mb-1">Total Solved</div>
                            <div className="w-full bg-gray-700 rounded-full h-2 mt-2">
                                <div
                                    className="bg-[#10b981] h-2 rounded-full transition-all duration-500"
                                    style={{ width: `${totalQs ? (totalSolved / totalQs) * 100 : 0}%` }}
                                ></div>
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                                {totalQs ? ((totalSolved / totalQs) * 100).toFixed(1) : 0}% of {totalQs}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Contest Performance */}
                {contestRanking && (
                    <div className="mb-8">
                        <h2 className="text-2xl font-bold mb-6 text-white">Contest Performance</h2>
                        <div className="grid md:grid-cols-4 gap-6 mb-6">
                            <div className="card p-6 text-center">
                                <div className="text-4xl font-bold text-[#10b981] mb-2">
                                    {Math.round(contestRanking.rating)}
                                </div>
                                <div className="text-gray-400">Contest Rating</div>
                            </div>
                            <div className="card p-6 text-center">
                                <div className="text-4xl font-bold text-blue-400 mb-2">
                                    #{contestRanking.globalRanking?.toLocaleString()}
                                </div>
                                <div className="text-gray-400">Global Rank</div>
                            </div>
                            <div className="card p-6 text-center">
                                <div className="text-4xl font-bold text-yellow-400 mb-2">
                                    Top {contestRanking.topPercentage}%
                                </div>
                                <div className="text-gray-400">Percentile</div>
                            </div>
                            <div className="card p-6 text-center">
                                <div className="text-4xl font-bold text-purple-400 mb-2">
                                    {contestRanking.attendedContestsCount}
                                </div>
                                <div className="text-gray-400">Contests</div>
                            </div>
                        </div>

                        {/* Rating Progress Chart */}
                        {ratingHistory.length > 0 && (
                            <div className="card p-6">
                                <h3 className="text-lg font-semibold mb-4 text-white">Rating Progress</h3>
                                <ResponsiveContainer width="100%" height={300}>
                                    <LineChart data={ratingHistory}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                        <XAxis dataKey="contest" stroke="#9ca3af" angle={-45} textAnchor="end" height={80} />
                                        <YAxis stroke="#9ca3af" />
                                        <Tooltip content={<CustomTooltip />} />
                                        <Legend />
                                        <Line type="monotone" dataKey="rating" stroke="#10b981" strokeWidth={2} dot={{ fill: '#10b981' }} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </div>
                )}

                {/* Contest History */}
                {contestHistory && contestHistory.length > 0 && (
                    <div className="mb-8">
                        <h2 className="text-2xl font-bold mb-6 text-white">Contest History</h2>
                        <div className="card p-6">
                            <div className="space-y-3">
                                {contestHistory.map((contest, index) => (
                                    <div
                                        key={index}
                                        className="p-4 bg-[#0a1f1a] rounded-lg border border-[#10b981]/20 hover:border-[#10b981]/40 transition-colors"
                                    >
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <h3 className="font-semibold text-white">{contest.contestTitle}</h3>
                                                    <span className="text-xs px-2 py-1 rounded bg-gray-700 text-gray-300">
                                                        {contest.contestDate}
                                                    </span>
                                                    {contest.trendDirection === 'UP' ? (
                                                        <span className="text-green-400">↗️</span>
                                                    ) : contest.trendDirection === 'DOWN' ? (
                                                        <span className="text-red-400">↘️</span>
                                                    ) : null}
                                                </div>
                                                <div className="flex gap-4 text-sm">
                                                    <div>
                                                        <span className="text-gray-400">Rating: </span>
                                                        <span className="text-[#10b981] font-bold">{Math.round(contest.rating)}</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-gray-400">Rank: </span>
                                                        <span className="text-blue-400 font-bold">#{contest.ranking?.toLocaleString()}</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-gray-400">Solved: </span>
                                                        <span className="text-yellow-400 font-bold">{contest.problemsSolved}/{contest.totalProblems}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Top Tags Chart */}
                {topTags.length > 0 && (
                    <div className="mb-8">
                        <h2 className="text-2xl font-bold mb-6 text-white">Top Problem Categories</h2>
                        <div className="card p-6">
                            <ResponsiveContainer width="100%" height={400}>
                                <BarChart data={topTags}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                    <XAxis
                                        dataKey="name"
                                        stroke="#9ca3af"
                                        angle={-45}
                                        textAnchor="end"
                                        height={100}
                                    />
                                    <YAxis stroke="#9ca3af" />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Bar dataKey="problems" fill={COLORS.solved} radius={[8, 8, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                )}

                {/* Tag Cloud */}
                {tagStats && tagStats.length > 0 && (
                    <div className="mb-8">
                        <h2 className="text-2xl font-bold mb-6 text-white">All Categories ({tagStats.length})</h2>
                        <div className="card p-6">
                            <div className="flex flex-wrap gap-3">
                                {tagStats.map((tag, index) => {
                                    const fontSize = Math.max(12, Math.min(20, tag.problemsSolved / 10 + 10));
                                    const opacity = Math.max(0.5, Math.min(1, tag.problemsSolved / 100));
                                    return (
                                        <div
                                            key={index}
                                            className="px-3 py-2 bg-[#0a1f1a] rounded-lg border border-[#10b981]/20 hover:border-[#10b981]/60 transition-all cursor-pointer"
                                            style={{ opacity }}
                                        >
                                            <span className="text-[#10b981] font-medium" style={{ fontSize: `${fontSize}px` }}>
                                                {tag.tagName}
                                            </span>
                                            <span className="text-gray-400 text-xs ml-2">
                                                {tag.problemsSolved}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Profile;
