import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { contestAPI, syncAPI } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';

const ContestArena = () => {
    const { code } = useParams();
    const { user } = useAuth();
    const [contest, setContest] = useState(null);
    const [leaderboard, setLeaderboard] = useState([]);
    const [timeLeft, setTimeLeft] = useState(null);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [showLeaderboardModal, setShowLeaderboardModal] = useState(false);
    const [lastSyncTime, setLastSyncTime] = useState(null);
    const [showSyncReminder, setShowSyncReminder] = useState(false);
    const [syncingAll, setSyncingAll] = useState(false);

    // Helper to format time in seconds to HH:MM
    const formatTime = (seconds) => {
        if (!seconds) return '0:00';
        const hours = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        return `${hours}:${String(mins).padStart(2, '0')}`;
    };

    // Get time since last sync
    const getTimeSinceSync = () => {
        if (!lastSyncTime) return null;
        const now = Date.now();
        const diff = Math.floor((now - lastSyncTime) / 1000); // seconds
        if (diff < 60) return `${diff}s ago`;
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        return `${Math.floor(diff / 3600)}h ago`;
    };

    useEffect(() => {
        fetchContestData();
        const interval = setInterval(fetchLeaderboard, 30000); // Refresh every 30s
        return () => clearInterval(interval);
    }, [code]);

    useEffect(() => {
        if (!contest) return;

        const timer = setInterval(() => {
            const now = new Date();
            const end = new Date(contest.end_time);
            const diff = end - now;

            if (diff <= 0) {
                setTimeLeft({ hours: 0, minutes: 0, seconds: 0 });
            } else {
                const hours = Math.floor(diff / (1000 * 60 * 60));
                const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((diff % (1000 * 60)) / 1000);
                setTimeLeft({ hours, minutes, seconds });
            }
        }, 1000);

        return () => clearInterval(timer);
    }, [contest]);

    // Show reminder to sync if user hasn't synced in 5 minutes
    useEffect(() => {
        if (!lastSyncTime || !contest) return;

        const checkInterval = setInterval(() => {
            const now = Date.now();
            const diff = now - lastSyncTime;
            const fiveMinutes = 5 * 60 * 1000;

            // Show reminder if 5+ minutes since last sync and contest is active
            const contestEnd = new Date(contest.end_time);
            if (diff >= fiveMinutes && new Date() < contestEnd) {
                setShowSyncReminder(true);
            }
        }, 30000); // Check every 30 seconds

        return () => clearInterval(checkInterval);
    }, [lastSyncTime, contest]);

    const fetchContestData = async () => {
        try {
            const response = await contestAPI.getByCode(code);
            setContest(response.data.contest);
            await fetchLeaderboard(response.data.contest.id);
        } catch (error) {
            console.error('Error fetching contest:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchLeaderboard = async (contestId = null) => {
        try {
            const id = contestId || contest?.id;
            if (!id) {
                console.error('No contest ID available');
                return;
            }

            console.log('📊 Fetching leaderboard for contest:', id);
            const leaderboardRes = await syncAPI.getLeaderboard(id);
            console.log('✅ Leaderboard fetched:', leaderboardRes.data.leaderboard);

            setLeaderboard(leaderboardRes.data.leaderboard || []);
        } catch (error) {
            console.error('Error fetching leaderboard:', error);
        }
    };

    const handleSyncScore = async () => {
        setSyncing(true);
        try {
            console.log('🔄 Syncing submissions for contest:', contest.id);
            const syncResponse = await syncAPI.syncSubmissions(contest.id);
            console.log('✅ Sync response:', syncResponse.data);

            // Update last sync time
            setLastSyncTime(Date.now());
            setShowSyncReminder(false);

            // Wait a moment for backend to process
            await new Promise(resolve => setTimeout(resolve, 500));

            // Fetch updated leaderboard
            await fetchLeaderboard();

            toast.success('Score synced successfully! 🏆', {
                description: 'Your submissions have been updated'
            });
        } catch (error) {
            console.error('Sync error:', error);
            toast.error('Failed to sync score', {
                description: error.response?.data?.message || 'Please try again later'
            });
        } finally {
            setSyncing(false);
        }
    };

    const handleSyncAll = async () => {
        setSyncingAll(true);
        try {
            console.log('🔄 Syncing ALL participants for contest:', contest.id);
            const syncResponse = await syncAPI.syncAll(contest.id);
            console.log('✅ Sync all response:', syncResponse.data);

            // Wait a moment for backend to process
            await new Promise(resolve => setTimeout(resolve, 500));

            // Fetch updated leaderboard
            await fetchLeaderboard();

            toast.success(`Synced ${syncResponse.data.synced} participants! 🎉`, {
                description: `Total: ${syncResponse.data.total}, Errors: ${syncResponse.data.errors}`
            });
        } catch (error) {
            console.error('Sync all error:', error);
            if (error.response?.status === 429) {
                toast.warning('Please wait before syncing all again', {
                    description: error.response?.data?.message || 'Cooldown active'
                });
            } else {
                toast.error('Failed to sync all participants', {
                    description: error.response?.data?.message || 'Please try again later'
                });
            }
        } finally {
            setSyncingAll(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="spinner"></div>
            </div>
        );
    }

    const hasEnded = new Date() > new Date(contest?.end_time);

    return (
        <div className="min-h-screen py-12 px-4">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-4xl font-bold gradient-text mb-2">{contest?.name}</h1>
                        <p className="text-gray-400">
                            {hasEnded ? 'Contest has ended' : 'Contest in progress'}
                        </p>
                    </div>

                    {/* Timer */}
                    {timeLeft && !hasEnded && (
                        <div className="flex gap-4">
                            <div className="text-center">
                                <div className="text-3xl font-bold text-[#10b981]">
                                    {String(timeLeft.hours).padStart(2, '0')}
                                </div>
                                <div className="text-xs text-gray-400">Hours</div>
                            </div>
                            <div className="text-3xl text-gray-600">:</div>
                            <div className="text-center">
                                <div className="text-3xl font-bold text-[#10b981]">
                                    {String(timeLeft.minutes).padStart(2, '0')}
                                </div>
                                <div className="text-xs text-gray-400">Minutes</div>
                            </div>
                            <div className="text-3xl text-gray-600">:</div>
                            <div className="text-center">
                                <div className="text-3xl font-bold text-[#10b981]">
                                    {String(timeLeft.seconds).padStart(2, '0')}
                                </div>
                                <div className="text-xs text-gray-400">Seconds</div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Sync Reminder Banner */}
                {showSyncReminder && !hasEnded && (
                    <div className="bg-gradient-to-r from-yellow-900/40 to-orange-900/40 border border-yellow-500/50 rounded-lg p-4 mb-6 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <span className="text-2xl">🏆</span>
                            <div>
                                <p className="text-yellow-300 font-bold">Solved a problem? Don't forget to sync!</p>
                                <p className="text-yellow-200/80 text-sm">Click "Sync Score" to claim your points and update the leaderboard</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setShowSyncReminder(false)}
                            className="text-yellow-300 hover:text-yellow-100"
                        >
                            ✕
                        </button>
                    </div>
                )}

                <div className="grid lg:grid-cols-3 gap-8">
                    {/* Problems */}
                    <div className="lg:col-span-2">
                        <div className="card p-6">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-2xl font-bold text-white">Problems</h2>
                                <div className="flex flex-col items-end gap-2">
                                    <div className="flex gap-2">
                                        <button
                                            onClick={handleSyncScore}
                                            disabled={syncing || syncingAll}
                                            className="btn-primary text-sm px-4 py-2"
                                        >
                                            {syncing ? 'Syncing...' : '🔄 Sync My Score'}
                                        </button>
                                        <button
                                            onClick={handleSyncAll}
                                            disabled={syncing || syncingAll}
                                            className="btn-secondary text-sm px-4 py-2"
                                        >
                                            {syncingAll ? 'Syncing All...' : '👥 Sync All'}
                                        </button>
                                    </div>
                                    {lastSyncTime && (
                                        <span className="text-xs text-gray-400">
                                            Last synced: {getTimeSinceSync()}
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-4">
                                {contest?.problems?.map((problem, index) => {
                                    // Get current user's progress
                                    const currentUserEntry = leaderboard.find(entry => entry.username === user?.username);
                                    const problemSlug = problem.slug || problem.title_slug;
                                    const progress = currentUserEntry?.problem_progress?.find(p => p.slug === problemSlug);

                                    const isSolved = progress?.status === 'ACCEPTED';
                                    const isAttempted = progress?.fail_count > 0 && progress?.status !== 'ACCEPTED';

                                    return (
                                        <div
                                            key={problem.problem_id?._id || problem._id || index}
                                            className={`p-4 rounded-lg border transition-all ${isSolved
                                                ? 'bg-green-900/20 border-green-500/50 shadow-lg shadow-green-500/10'
                                                : isAttempted
                                                    ? 'bg-yellow-900/20 border-yellow-500/50 shadow-lg shadow-yellow-500/10'
                                                    : 'bg-[#0a1f1a] border-[#10b981]/20 hover:border-[#10b981]/40'
                                                }`}
                                        >
                                            <div className="flex items-center justify-between mb-3">
                                                <div className="flex items-center gap-3">
                                                    <span className="font-bold text-gray-400">
                                                        {String.fromCharCode(65 + index)}.
                                                    </span>
                                                    <h3 className="font-semibold text-white">
                                                        {problem.problem_id?.title || problem.title || `Problem ${index + 1}`}
                                                    </h3>
                                                    {isSolved && (
                                                        <span className="text-green-400 font-bold text-sm">✓ Solved</span>
                                                    )}
                                                    {!isSolved && isAttempted && (
                                                        <span className="text-yellow-400 font-bold text-sm">⚠ Attempted</span>
                                                    )}
                                                </div>
                                                <div className="flex gap-2">
                                                    <span className={`badge badge-${(problem.problem_id?.difficulty || problem.difficulty || 'medium').toLowerCase()}`}>
                                                        {problem.problem_id?.difficulty || problem.difficulty || 'Medium'}
                                                    </span>
                                                    <span className={`text-sm px-2 py-1 rounded ${isSolved
                                                        ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                                                        : 'bg-[#10b981]/20 text-[#10b981]'
                                                        }`}>
                                                        {problem.points} pts
                                                    </span>
                                                </div>
                                            </div>
                                            <a
                                                href={`https://leetcode.com/problems/${problem.slug || problem.title_slug}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="btn-primary inline-block"
                                            >
                                                Solve on LeetCode →
                                            </a>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Leaderboard Preview */}
                    <div>
                        <div className="card p-6">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-2xl font-bold text-white">Leaderboard</h2>
                                <button
                                    onClick={() => setShowLeaderboardModal(true)}
                                    className="text-sm text-[#10b981] hover:text-[#059669]"
                                >
                                    View Full →
                                </button>
                            </div>

                            {leaderboard.length === 0 ? (
                                <p className="text-gray-400 text-center py-8">
                                    No submissions yet. Be the first!
                                </p>
                            ) : (
                                <div className="space-y-3">
                                    {leaderboard.slice(0, 5).map((entry, index) => (
                                        <div
                                            key={entry.user_id}
                                            className={`p-3 rounded-lg ${index === 0 ? 'bg-gradient-to-r from-yellow-600/20 to-yellow-500/10 border border-yellow-500/30' :
                                                index === 1 ? 'bg-gradient-to-r from-gray-400/20 to-gray-500/10 border border-gray-400/30' :
                                                    index === 2 ? 'bg-gradient-to-r from-orange-600/20 to-orange-500/10 border border-orange-500/30' :
                                                        'bg-[#0a1f1a] border border-[#10b981]/10'
                                                }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${index === 0 ? 'bg-yellow-500 text-black' :
                                                    index === 1 ? 'bg-gray-400 text-black' :
                                                        index === 2 ? 'bg-orange-600 text-white' :
                                                            'bg-[#10b981]/20 text-[#10b981]'
                                                    }`}>
                                                    {index + 1}
                                                </div>
                                                <div className="flex-1">
                                                    <div className="font-medium text-white">
                                                        {entry.username}
                                                    </div>
                                                    <div className="text-xs text-gray-400">
                                                        {entry.solved || 0}/{contest?.problems?.length || 0} • {entry.score} pts • {formatTime(entry.total_time)}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {leaderboard.length > 5 && (
                                        <button
                                            onClick={() => setShowLeaderboardModal(true)}
                                            className="w-full py-2 text-center text-sm text-gray-400 hover:text-[#10b981] transition-colors"
                                        >
                                            +{leaderboard.length - 5} more
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Detailed Leaderboard Modal */}
            {
                showLeaderboardModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <div className="bg-[#0f2a23] rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col border border-[#10b981]/30">
                            {/* Modal Header */}
                            <div className="p-6 border-b border-[#10b981]/20 flex items-center justify-between bg-gradient-to-r from-[#10b981]/10 to-[#059669]/10">
                                <div>
                                    <h2 className="text-2xl font-bold text-white">Leaderboard</h2>
                                    <p className="text-sm text-gray-400 mt-1">{contest?.name}</p>
                                </div>
                                <button
                                    onClick={() => setShowLeaderboardModal(false)}
                                    className="text-gray-400 hover:text-white text-2xl"
                                >
                                    ✕
                                </button>
                            </div>

                            {/* Modal Body */}
                            <div className="flex-1 overflow-auto p-6">
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="sticky top-0 bg-[#0a1f1a] z-10">
                                            <tr className="border-b border-[#10b981]/20">
                                                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-400">Rank</th>
                                                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-400">User</th>
                                                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-400">Score</th>
                                                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-400">Solved</th>
                                                {contest?.problems?.map((problem, idx) => (
                                                    <th key={idx} className="px-4 py-3 text-center text-sm font-semibold text-gray-400">
                                                        {String.fromCharCode(65 + idx)}
                                                    </th>
                                                ))}
                                                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-400">Time</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {leaderboard.map((entry, index) => (
                                                <tr
                                                    key={entry.user_id}
                                                    className={`border-b border-[#10b981]/10 hover:bg-[#0a1f1a]/50 transition-colors ${index < 3 ? 'bg-[#10b981]/5' : ''
                                                        }`}
                                                >
                                                    {/* Rank */}
                                                    <td className="px-4 py-3">
                                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${index === 0 ? 'bg-yellow-500 text-black' :
                                                            index === 1 ? 'bg-gray-400 text-black' :
                                                                index === 2 ? 'bg-orange-600 text-white' :
                                                                    'bg-[#10b981]/20 text-[#10b981]'
                                                            }`}>
                                                            {index + 1}
                                                        </div>
                                                    </td>

                                                    {/* User */}
                                                    <td className="px-4 py-3">
                                                        <div className="font-medium text-white">{entry.username}</div>
                                                    </td>

                                                    {/* Total Score */}
                                                    <td className="px-4 py-3 text-center">
                                                        <div className="font-bold text-[#10b981]">{entry.score}</div>
                                                    </td>

                                                    {/* Solved Count */}
                                                    <td className="px-4 py-3 text-center">
                                                        <div className="text-white">
                                                            {entry.solved}/{contest?.problems?.length || 0}
                                                        </div>
                                                    </td>

                                                    {/* Individual Problem Status */}
                                                    {contest?.problems?.map((problem, pIdx) => {
                                                        const problemSlug = problem.slug || problem.title_slug;
                                                        const problemProgress = entry.problem_progress?.find(
                                                            p => p.slug === problemSlug
                                                        );

                                                        const isSolved = problemProgress?.status === 'ACCEPTED';
                                                        const hasFailed = problemProgress?.fail_count > 0;

                                                        return (
                                                            <td key={pIdx} className="px-4 py-3 text-center">
                                                                {isSolved ? (
                                                                    <div className="flex flex-col items-center">
                                                                        <div className="text-green-400 font-bold">✓</div>
                                                                        <div className="text-xs text-gray-400">
                                                                            {problem.points}
                                                                        </div>
                                                                        {problemProgress.solved_at && (
                                                                            <div className="text-xs text-gray-500">
                                                                                {new Date(problemProgress.solved_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                                                            </div>
                                                                        )}
                                                                        {problemProgress.penalty > 0 && (
                                                                            <div className="text-xs text-red-400">
                                                                                +{Math.round(problemProgress.penalty)}m
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                ) : hasFailed ? (
                                                                    <div className="flex flex-col items-center">
                                                                        <div className="text-red-400">✗</div>
                                                                        <div className="text-xs text-gray-500">
                                                                            {problemProgress.fail_count}
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    <div className="text-gray-600">-</div>
                                                                )}
                                                            </td>
                                                        );
                                                    })}

                                                    {/* Total Time */}
                                                    <td className="px-4 py-3 text-center">
                                                        <div className="text-gray-400 text-sm">
                                                            {entry.total_time ? formatTime(entry.total_time) : '-'}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>

                                    {leaderboard.length === 0 && (
                                        <div className="text-center py-12">
                                            <div className="text-5xl mb-4">🏆</div>
                                            <p className="text-gray-400">No submissions yet</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Modal Footer */}
                            <div className="p-4 border-t border-[#10b981]/20 bg-[#0a1f1a]/50">
                                <div className="flex justify-between items-center text-sm text-gray-400">
                                    <div>
                                        <span className="text-green-400">✓</span> Solved •
                                        <span className="text-red-400 ml-2">✗</span> Failed •
                                        <span className="text-gray-600 ml-2">-</span> Not Attempted
                                    </div>
                                    <div>
                                        Total Participants: <span className="text-[#10b981] font-bold">{leaderboard.length}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default ContestArena;
