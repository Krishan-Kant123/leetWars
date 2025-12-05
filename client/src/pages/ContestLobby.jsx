import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { contestAPI } from '../utils/api';

const ContestLobby = () => {
    const { code } = useParams();
    const navigate = useNavigate();
    const [contest, setContest] = useState(null);
    const [timeLeft, setTimeLeft] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchContestDetails();
    }, [code]);

    useEffect(() => {
        if (!contest) return;

        const timer = setInterval(() => {
            const now = new Date();
            const start = new Date(contest.start_time);
            const diff = start - now;

            if (diff <= 0) {
                navigate(`/contest/${code}/arena`);
            } else {
                const hours = Math.floor(diff / (1000 * 60 * 60));
                const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((diff % (1000 * 60)) / 1000);
                setTimeLeft({ hours, minutes, seconds });
            }
        }, 1000);

        return () => clearInterval(timer);
    }, [contest, code, navigate]);

    const fetchContestDetails = async () => {
        try {
            const response = await contestAPI.getByCode(code);
            setContest(response.data.contest);
        } catch (error) {
            console.error('Error fetching contest:', error);
            alert('Failed to load contest details');
            navigate('/dashboard');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="spinner"></div>
            </div>
        );
    }

    if (!contest) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <p className="text-xl text-gray-400">Contest not found</p>
                    <Link to="/dashboard" className="btn-primary mt-4 inline-block">
                        Go to Dashboard
                    </Link>
                </div>
            </div>
        );
    }

    const now = new Date();
    const hasStarted = new Date(contest.start_time) <= now;

    if (hasStarted) {
        navigate(`/contest/${code}/arena`);
        return null;
    }

    return (
        <div className="min-h-screen py-12 px-4">
            <div className="max-w-4xl mx-auto">
                {/* Contest Header */}
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-bold mb-4 gradient-text">
                        {contest.name}
                    </h1>
                    <p className="text-gray-400">Waiting for the contest to start. Get ready!</p>
                </div>

                {/* Countdown Timer */}
                <div className="card p-12 mb-8 text-center">
                    <h2 className="text-2xl font-bold mb-8 text-white">Contest begins in...</h2>
                    {timeLeft && (
                        <div className="flex justify-center gap-8">
                            <div className="text-center">
                                <div className="text-6xl font-bold text-[#10b981] mb-2">
                                    {String(timeLeft.hours).padStart(2, '0')}
                                </div>
                                <div className="text-sm text-gray-400">Hours</div>
                            </div>
                            <div className="text-6xl text-gray-600">:</div>
                            <div className="text-center">
                                <div className="text-6xl font-bold text-[#10b981] mb-2">
                                    {String(timeLeft.minutes).padStart(2, '0')}
                                </div>
                                <div className="text-sm text-gray-400">Minutes</div>
                            </div>
                            <div className="text-6xl text-gray-600">:</div>
                            <div className="text-center">
                                <div className="text-6xl font-bold text-[#10b981] mb-2">
                                    {String(timeLeft.seconds).padStart(2, '0')}
                                </div>
                                <div className="text-sm text-gray-400">Seconds</div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Contest Details */}
                <div className="grid md:grid-cols-2 gap-8">
                    <div className="card p-6">
                        <h3 className="text-xl font-bold mb-4 text-white">Contest Information</h3>
                        <div className="space-y-3 text-gray-300">
                            <div className="flex justify-between">
                                <span className="text-gray-400">Start Time</span>
                                <span className="font-medium">
                                    {new Date(contest.start_time).toLocaleString('en-US', {
                                        month: 'short',
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    })}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400">Duration</span>
                                <span className="font-medium">{contest.duration} minutes</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400">Problems</span>
                                <span className="font-medium">{contest.problems?.length || 0}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400">Enrolled</span>
                                <span className="font-medium">{contest.participantCount || 0}/{100}</span>
                            </div>
                        </div>
                    </div>

                    <div className="card p-6">
                        <h3 className="text-xl font-bold mb-4 text-white">Participants</h3>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                            {contest.participants && contest.participants.length > 0 ? (
                                contest.participants.slice(0, 10).map((participant, index) => (
                                    <div key={index} className="flex items-center gap-3 p-2 bg-[#0a1f1a] rounded-lg">
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#10b981] to-[#059669] flex items-center justify-center text-white font-bold text-sm">
                                            {index + 1}
                                        </div>
                                        <span className="text-gray-300">{participant.username || `User ${index + 1}`}</span>
                                    </div>
                                ))
                            ) : (
                                <p className="text-gray-400 text-sm">Be the first to join!</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Share */}
                <div className="mt-8 card p-6 text-center">
                    <h3 className="text-xl font-bold mb-3 text-white">Share Contest</h3>
                    <p className="text-gray-400 mb-4">Invite others to join using this code:</p>
                    <div className="inline-flex items-center gap-3 bg-[#0a1f1a] px-6 py-3 rounded-lg border border-[#10b981]/30">
                        <code className="text-2xl font-mono text-[#10b981] font-bold">{contest.unique_code}</code>
                        <button
                            onClick={() => {
                                navigator.clipboard.writeText(contest.unique_code);
                                alert('Code copied to clipboard!');
                            }}
                            className="text-gray-400 hover:text-[#10b981] transition-colors"
                        >
                            📋
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ContestLobby;
