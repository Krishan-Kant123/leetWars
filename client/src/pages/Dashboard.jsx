import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { contestAPI } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import BotChat from '../components/BotChat';

const Dashboard = () => {
    const [enrolledContests, setEnrolledContests] = useState([]);
    const [createdContests, setCreatedContests] = useState([]);
    const [publicContests, setPublicContests] = useState({ upcoming: [], live: [], past: [] });
    const [loading, setLoading] = useState(true);
    const [enrollingId, setEnrollingId] = useState(null);
    const [joinCode, setJoinCode] = useState('');
    const [joinError, setJoinError] = useState('');
    const [showBot, setShowBot] = useState(false);
    const { user } = useAuth();

    useEffect(() => {
        fetchContests();
        // Show welcome toast on first load
        // toast.success('Welcome to LeetWars! 🎮', {
        //     description: 'Ready to compete? Join or create a contest!'
        // });
    }, []);

    const fetchContests = async () => {
        try {
            const [enrolledRes, createdRes, publicRes] = await Promise.all([
                contestAPI.getEnrolled(),
                contestAPI.getCreated(),
                contestAPI.getPublicContests()
            ]);
            setEnrolledContests(enrolledRes.data.contests || []);
            setCreatedContests(createdRes.data.contests || []);
            setPublicContests(publicRes.data || { upcoming: [], live: [], past: [] });
        } catch (error) {
            console.error('Error fetching contests:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleJoinContest = async (e) => {
        e.preventDefault();
        setJoinError('');

        try {
            await contestAPI.enroll(joinCode.trim());
            setJoinCode('');
            fetchContests();
        } catch (error) {
            setJoinError(error.response?.data?.message || 'Failed to join contest');
        }
    };

    const handleEnrollPublic = async (contestId) => {
        setEnrollingId(contestId);
        try {
            await contestAPI.enrollById(contestId);
            await fetchContests();
        } catch (error) {
            alert(error.response?.data?.message || 'Failed to enroll in contest');
        } finally {
            setEnrollingId(null);
        }
    };

    const getContestStatus = (contest) => {
        const now = new Date();
        const start = new Date(contest.start_time);
        const end = new Date(contest.end_time);

        if (now < start) return { label: 'Upcoming', color: 'blue' };
        if (now >= start && now <= end) return { label: 'Live', color: 'green' };
        return { label: 'Ended', color: 'gray' };
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="spinner"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen py-12 px-4">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-12 animate-fade-in">
                    <h1 className="text-4xl font-bold mb-2 gradient-text">
                        Welcome back, {user?.username}! 👋
                    </h1>
                    <p className="text-gray-400">Ready to compete?</p>
                </div>

                {/* Join Private Contest */}
                <div className="mb-12 animate-slide-up">
                    <div className="card p-6">
                        <h2 className="text-2xl font-bold mb-2 text-white flex items-center gap-2">
                            🔒 Join Private Contest
                        </h2>
                        <p className="text-sm text-gray-400 mb-4">Enter a contest code to join a private contest</p>
                        <form onSubmit={handleJoinContest} className="flex gap-4">
                            <input
                                type="text"
                                value={joinCode}
                                onChange={(e) => setJoinCode(e.target.value)}
                                placeholder="Enter contest code"
                                className="input flex-1"
                            />
                            <button type="submit" className="btn-primary">
                                Join Contest
                            </button>
                        </form>
                        {joinError && (
                            <p className="mt-3 text-red-400 text-sm">{joinError}</p>
                        )}
                    </div>
                </div>

                {/* Create Contest CTA */}
                <div className="mb-12">
                    <Link to="/contest/create">
                        <div className="card p-8 text-center cursor-pointer bg-gradient-to-r from-[#10b981]/10 to-[#059669]/10 border-[#10b981]/30 hover:border-[#10b981]/60 transition-all">
                            <div className="text-5xl mb-4">➕</div>
                            <h3 className="text-2xl font-bold mb-2 gradient-text">Create New Contest</h3>
                            <p className="text-gray-400">Set up a custom coding battle</p>
                        </div>
                    </Link>
                </div>

                {/* Public Contests */}
                {(publicContests.live.length > 0 || publicContests.upcoming.length > 0) && (
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-6 text-white flex items-center gap-2">
                            🌍 Public Contests
                        </h2>

                        {/* Live Contests */}
                        {publicContests.live.length > 0 && (
                            <div className="mb-8">
                                <h3 className="text-xl font-semibold mb-4 text-[#10b981] flex items-center gap-2">
                                    <span className="w-2 h-2 bg-[#10b981] rounded-full animate-pulse"></span>
                                    Live Now
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {publicContests.live.map((contest) => (
                                        <div key={contest.id} className="card p-6 border-[#10b981]/50">
                                            <div className="flex justify-between items-start mb-4">
                                                <h3 className="text-xl font-semibold text-white">
                                                    {contest.name}
                                                </h3>
                                                <span className="badge bg-[#10b981]/20 text-[#10b981] border-[#10b981]/30">
                                                    Live
                                                </span>
                                            </div>
                                            <div className="space-y-2 text-sm text-gray-400 mb-4">
                                                <div className="flex items-center">
                                                    <span className="mr-2">👤</span>
                                                    {contest.creator}
                                                </div>
                                                <div className="flex items-center">
                                                    <span className="mr-2">👥</span>
                                                    {contest.participantCount} participants
                                                </div>
                                                <div className="flex items-center">
                                                    <span className="mr-2">📝</span>
                                                    {contest.problemCount} problems
                                                </div>
                                                <div className="flex items-center">
                                                    <span className="mr-2">⏱️</span>
                                                    {contest.duration} minutes
                                                </div>
                                            </div>
                                            {contest.isEnrolled ? (
                                                <Link to={`/contest/${contest.unique_code}/arena`} className="btn-primary w-full text-center block">
                                                    Enter Arena
                                                </Link>
                                            ) : (
                                                <button
                                                    onClick={() => handleEnrollPublic(contest.id)}
                                                    disabled={enrollingId === contest.id}
                                                    className="btn-primary w-full"
                                                >
                                                    {enrollingId === contest.id ? 'Enrolling...' : 'Enroll Now'}
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Upcoming Contests */}
                        {publicContests.upcoming.length > 0 && (
                            <div>
                                <h3 className="text-xl font-semibold mb-4 text-blue-400">
                                    Upcoming
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {publicContests.upcoming.map((contest) => (
                                        <div key={contest.id} className="card p-6">
                                            <div className="flex justify-between items-start mb-4">
                                                <h3 className="text-xl font-semibold text-white">
                                                    {contest.name}
                                                </h3>
                                                <span className="badge bg-blue-500/20 text-blue-400 border-blue-500/30">
                                                    Upcoming
                                                </span>
                                            </div>
                                            <div className="space-y-2 text-sm text-gray-400 mb-4">
                                                <div className="flex items-center">
                                                    <span className="mr-2">👤</span>
                                                    {contest.creator}
                                                </div>
                                                <div className="flex items-center">
                                                    <span className="mr-2">📅</span>
                                                    {formatDate(contest.start_time)}
                                                </div>
                                                <div className="flex items-center">
                                                    <span className="mr-2">👥</span>
                                                    {contest.participantCount} enrolled
                                                </div>
                                                <div className="flex items-center">
                                                    <span className="mr-2">📝</span>
                                                    {contest.problemCount} problems
                                                </div>
                                            </div>
                                            {contest.isEnrolled ? (
                                                <Link to={`/contest/${contest.unique_code}`} className="w-full text-center block px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors">
                                                    View Contest
                                                </Link>
                                            ) : (
                                                <button
                                                    onClick={() => handleEnrollPublic(contest.id)}
                                                    disabled={enrollingId === contest.id}
                                                    className="btn-primary w-full"
                                                >
                                                    {enrollingId === contest.id ? 'Enrolling...' : 'Enroll'}
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* My Contests */}
                <div className="mb-12">
                    <h2 className="text-2xl font-bold mb-6 text-white">My Contests</h2>
                    {enrolledContests.length === 0 ? (
                        <div className="card p-12 text-center">
                            <p className="text-gray-400">You haven't joined any contests yet.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {enrolledContests.map((contest) => {
                                const status = getContestStatus(contest);
                                return (
                                    <Link
                                        key={contest._id}
                                        to={`/contest/${contest.unique_code}`}
                                        className="block"
                                    >
                                        <div className="card p-6 hover:scale-105 transition-transform">
                                            <div className="flex justify-between items-start mb-4">
                                                <h3 className="text-xl font-semibold text-white">
                                                    {contest.name}
                                                </h3>
                                                <span className={`badge ${status.color === 'green' ? 'bg-[#10b981]/20 text-[#10b981] border-[#10b981]/30' :
                                                    status.color === 'blue' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
                                                        'bg-gray-600/50 text-gray-400 border-gray-600'
                                                    }`}>
                                                    {status.label}
                                                </span>
                                            </div>
                                            <div className="space-y-2 text-sm text-gray-400">
                                                <div className="flex items-center">
                                                    <span className="mr-2">📅</span>
                                                    {formatDate(contest.start_time)}
                                                </div>
                                                <div className="flex items-center">
                                                    <span className="mr-2">⏱️</span>
                                                    {contest.duration} minutes
                                                </div>
                                                <div className="flex items-center">
                                                    <span className="mr-2">📝</span>
                                                    {contest.problems?.length || 0} problems
                                                </div>
                                            </div>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Created Contests */}
                {createdContests.length > 0 && (
                    <div>
                        <h2 className="text-2xl font-bold mb-6 text-white">Contests I Created</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {createdContests.map((contest) => {
                                const status = getContestStatus(contest);
                                return (
                                    <Link
                                        key={contest._id}
                                        to={`/contest/${contest.unique_code}`}
                                        className="block"
                                    >
                                        <div className="card p-6 border-[#10b981]/30">
                                            <div className="flex justify-between items-start mb-4">
                                                <h3 className="text-xl font-semibold text-white">
                                                    {contest.name}
                                                </h3>
                                                <span className={`badge ${status.color === 'green' ? 'bg-[#10b981]/20 text-[#10b981] border-[#10b981]/30' :
                                                    status.color === 'blue' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
                                                        'bg-gray-600/50 text-gray-400 border-gray-600'
                                                    }`}>
                                                    {status.label}
                                                </span>
                                            </div>
                                            <div className="space-y-2 text-sm text-gray-400">
                                                <div className="flex items-center">
                                                    <span className="mr-2">👥</span>
                                                    {contest.participants?.length || 0} participants
                                                </div>
                                                <div className="flex items-center">
                                                    <span className="mr-2">🔑</span>
                                                    Code: <code className="ml-1 text-[#10b981]">{contest.unique_code}</code>
                                                </div>
                                            </div>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Bot Button */}
                <button
                    onClick={() => setShowBot(true)}
                    className="fixed bottom-6 right-6 bg-gradient-to-r from-[#10b981] to-[#059669] text-white p-4 rounded-full shadow-2xl hover:scale-110 transition-all z-40"
                    title="Chat with AI Bot"
                >
                    <span className="text-3xl">🤖</span>
                </button>

                {/* Bot Modal */}
                {showBot && <BotChat onClose={() => setShowBot(false)} />}
            </div>
        </div>
    );
};

export default Dashboard;
