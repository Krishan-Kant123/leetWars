'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { ProtectedRoute, useAuth } from '@/lib/auth-context';
import { contestApi, syncApi, Contest, LeaderboardEntry, ProblemProgress } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Trophy,
    Clock,
    Users,
    RefreshCw,
    ExternalLink,
    CheckCircle2,
    XCircle,
    Timer,
    Copy,
    Loader2,
    AlertCircle,
} from 'lucide-react';

function ContestDetailContent() {
    const params = useParams();
    const code = params.code as string;
    const { user } = useAuth();

    const [contest, setContest] = useState<Contest | null>(null);
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
    const [myProgress, setMyProgress] = useState<ProblemProgress[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);
    const [isSyncingAll, setIsSyncingAll] = useState(false);
    const [syncCooldown, setSyncCooldown] = useState(0);
    const [syncAllCooldown, setSyncAllCooldown] = useState(0); // Global cooldown for sync-all
    const [timeRemaining, setTimeRemaining] = useState<string>('');
    const [contestStatus, setContestStatus] = useState<'upcoming' | 'live' | 'ended'>('upcoming');
    const [isGracePeriod, setIsGracePeriod] = useState(false);

    const loadContestData = useCallback(async () => {
        try {
            const [contestRes, leaderboardRes] = await Promise.all([
                contestApi.getContest(code),
                syncApi.getLeaderboard(code).catch(() => ({ leaderboard: [] })),
            ]);
            setContest(contestRes.contest);
            setLeaderboard(leaderboardRes.leaderboard);

            // Initialize global sync-all cooldown from contest data
            if (contestRes.contest.syncAllCooldown && contestRes.contest.syncAllCooldown > 0) {
                setSyncAllCooldown(contestRes.contest.syncAllCooldown);
            }

            // Find user's progress
            const userEntry = leaderboardRes.leaderboard.find(
                (e) => e.leetcode_username === user?.leetcode_username
            );
            if (userEntry) {
                setMyProgress(userEntry.problem_progress);
            }
        } catch (error) {
            toast.error('Failed to load contest');
        } finally {
            setIsLoading(false);
        }
    }, [code, user?.leetcode_username]);

    useEffect(() => {
        loadContestData();
    }, [loadContestData]);

    // Timer effect
    useEffect(() => {
        if (!contest) return;

        const updateTime = () => {
            const now = new Date();
            const start = new Date(contest.start_time);
            const end = new Date(contest.end_time);
            const gracePeriodEnd = new Date(end.getTime() + 60 * 60 * 1000); // 1 hour grace period

            if (now < start) {
                setContestStatus('upcoming');
                const diff = start.getTime() - now.getTime();
                setTimeRemaining(formatTimeRemaining(diff));
                setIsGracePeriod(false);
            } else if (now >= start && now <= end) {
                setContestStatus('live');
                const diff = end.getTime() - now.getTime();
                setTimeRemaining(formatTimeRemaining(diff));
                setIsGracePeriod(false);
            } else {
                setContestStatus('ended');
                if (now <= gracePeriodEnd && !contest.finalized) {
                    setIsGracePeriod(true);
                    const diff = gracePeriodEnd.getTime() - now.getTime();
                    setTimeRemaining(`Finalizing... (${formatTimeRemaining(diff)})`);
                } else {
                    setIsGracePeriod(false);
                    setTimeRemaining(contest.finalized ? 'Finalized' : 'Contest ended');
                }
            }
        };

        updateTime();
        const interval = setInterval(updateTime, 1000);
        return () => clearInterval(interval);
    }, [contest]);

    // Sync cooldown timer
    useEffect(() => {
        if (syncCooldown > 0) {
            const timer = setTimeout(() => setSyncCooldown(syncCooldown - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [syncCooldown]);

    // Sync-all global cooldown timer
    useEffect(() => {
        if (syncAllCooldown > 0) {
            const timer = setTimeout(() => setSyncAllCooldown(syncAllCooldown - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [syncAllCooldown]);

    const formatTimeRemaining = (ms: number) => {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`;
        if (hours > 0) return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
        if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
        return `${seconds}s`;
    };

    const formatSolveTime = (solvedAt?: string) => {
        if (!solvedAt || !contest) return '';
        const start = new Date(contest.start_time).getTime();
        const solved = new Date(solvedAt).getTime();
        const diff = Math.max(0, solved - start);

        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    };

    const handleSync = async () => {
        if (!contest || syncCooldown > 0) return;

        setIsSyncing(true);
        try {
            const response = await syncApi.syncSubmissions(code);
            toast.success(response.message);
            setSyncCooldown(30); // 30 second cooldown
            loadContestData();
        } catch (error) {
            if (error instanceof Error && error.message.includes('wait')) {
                toast.warning(error.message);
            } else {
                toast.error('Failed to sync');
            }
        } finally {
            setIsSyncing(false);
        }
    };

    const handleSyncAll = async () => {
        if (!contest) return;

        setIsSyncingAll(true);
        try {
            const response = await syncApi.syncAllParticipants(code);
            console.log(response)
            toast.success(response.message);

            // If the backend says configured as finalized, update local state immediately
            if (response.finalized && contest) {
                setContest({ ...contest, finalized: true });
                setIsGracePeriod(false);
            }

            loadContestData();
        } catch (error) {
            if (error instanceof Error && error.message.includes('wait')) {
                toast.warning(error.message);
            } else {
                toast.error('Failed to sync all');
            }
        } finally {
            setIsSyncingAll(false);
        }
    };

    const copyCode = () => {
        navigator.clipboard.writeText(code);
        toast.success('Contest code copied!');
    };

    const getDifficultyColor = (difficulty?: string) => {
        switch (difficulty) {
            case 'Easy': return 'text-green-500';
            case 'Medium': return 'text-yellow-500';
            case 'Hard': return 'text-red-500';
            default: return 'text-muted-foreground';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'ACCEPTED': return <CheckCircle2 className="w-4 h-4 text-green-500" />;
            case 'FAIL': return <XCircle className="w-4 h-4 text-red-500" />;
            default: return <Timer className="w-4 h-4 text-muted-foreground" />;
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen p-4 md:p-8">
                <div className="max-w-6xl mx-auto space-y-6">
                    <Skeleton className="h-32 rounded-xl" />
                    <div className="grid md:grid-cols-2 gap-6">
                        <Skeleton className="h-64 rounded-xl" />
                        <Skeleton className="h-64 rounded-xl" />
                    </div>
                </div>
            </div>
        );
    }

    if (!contest) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <AlertCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
                    <h1 className="text-2xl font-bold mb-2">Contest Not Found</h1>
                    <p className="text-muted-foreground mb-4">The contest code may be invalid or expired.</p>
                    <Link href="/dashboard">
                        <Button>Back to Dashboard</Button>
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen p-4 md:p-8">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-8"
                >
                    <Card className="border-border overflow-hidden">
                        <div className="bg-gradient-to-r from-primary/20 to-transparent p-6">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div>
                                    <div className="flex items-center gap-3 mb-2">
                                        <Trophy className="w-8 h-8 text-primary" />
                                        <h1 className="text-2xl md:text-3xl font-bold">{contest.name}</h1>
                                        <Badge
                                            variant={
                                                contestStatus === 'live' ? 'default' :
                                                    contestStatus === 'upcoming' ? 'outline' : 'secondary'
                                            }
                                        >
                                            {contestStatus === 'live' && <span className="w-2 h-2 bg-red-500 rounded-full mr-2 animate-pulse" />}
                                            {contestStatus.charAt(0).toUpperCase() + contestStatus.slice(1)}
                                        </Badge>
                                    </div>
                                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                        <div className="flex items-center gap-1">
                                            <Clock className="w-4 h-4" />
                                            {contest.duration} min
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Users className="w-4 h-4" />
                                            {contest.participantCount} participants
                                        </div>
                                        <button
                                            onClick={copyCode}
                                            className="flex items-center gap-1 hover:text-primary transition-colors"
                                        >
                                            <Copy className="w-4 h-4" />
                                            {code}
                                        </button>
                                    </div>
                                </div>
                                <div className="text-center md:text-right">
                                    <p className="text-sm text-muted-foreground">
                                        {contestStatus === 'upcoming' ? 'Starts in' : contestStatus === 'live' ? 'Time remaining' : ''}
                                    </p>
                                    <p className="text-2xl font-mono font-bold text-primary">{timeRemaining}</p>
                                </div>
                            </div>
                        </div>
                    </Card>
                </motion.div>

                <div className="grid lg:grid-cols-3 gap-6">
                    {/* Problems */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 }}
                        className="lg:col-span-1"
                    >
                        <Card className="border-border h-fit">
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <CardTitle>Problems</CardTitle>
                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={handleSyncAll}
                                            disabled={isSyncingAll || syncAllCooldown > 0 || (contestStatus !== 'live' && !isGracePeriod)}
                                        >
                                            {isSyncingAll ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : syncAllCooldown > 0 ? (
                                                `${syncAllCooldown}s`
                                            ) : (
                                                <RefreshCw className="w-4 h-4" />
                                            )}
                                        </Button>
                                    </div>
                                </div>
                                <CardDescription>
                                    Solve problems on LeetCode and sync your submissions
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {(!contest.problems || contest.problems.length === 0) ? (
                                    <div className="text-center py-8">
                                        <Clock className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                                        <p className="text-muted-foreground font-medium">
                                            {contestStatus === 'upcoming'
                                                ? 'Problems will be revealed when the contest starts'
                                                : 'No problems available'}
                                        </p>
                                        {contestStatus === 'upcoming' && (
                                            <p className="text-sm text-muted-foreground mt-2">
                                                Come back at {new Date(contest.start_time).toLocaleString()}
                                            </p>
                                        )}
                                    </div>
                                ) : contest.problems.map((problem, index) => {
                                    const progress = myProgress.find((p) => p.slug === problem.slug);
                                    return (
                                        <div
                                            key={problem.slug}
                                            className="flex items-center justify-between p-3 rounded-lg bg-secondary/50"
                                        >
                                            <div className="flex items-center gap-3">
                                                {getStatusIcon(progress?.status || 'PENDING')}
                                                <div>
                                                    <p className="text-sm font-medium">
                                                        {index + 1}. {problem.slug}
                                                    </p>
                                                    <p className={`text-xs ${getDifficultyColor(problem.points === 3 ? 'Easy' : problem.points === 4 ? 'Medium' : 'Hard')}`}>
                                                        +{problem.points} pts
                                                    </p>
                                                </div>
                                            </div>
                                            <a
                                                href={`https://leetcode.com/problems/${problem.slug}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                            >
                                                <Button variant="ghost" size="icon">
                                                    <ExternalLink className="w-4 h-4" />
                                                </Button>
                                            </a>
                                        </div>
                                    );
                                })}
                            </CardContent>
                        </Card>
                    </motion.div>

                    {/* Leaderboard */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 }}
                        className="lg:col-span-2"
                    >
                        <Card className="border-border">
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle className="flex items-center gap-2">
                                            <Trophy className="w-5 h-5 text-primary" />
                                            Leaderboard
                                        </CardTitle>
                                        <CardDescription>
                                            Live rankings based on score and time
                                        </CardDescription>
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleSyncAll}
                                        disabled={isSyncingAll || contestStatus !== 'live' || syncAllCooldown > 0}
                                    >
                                        {isSyncingAll ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                                Syncing...
                                            </>
                                        ) : syncAllCooldown > 0 ? (
                                            <>
                                                <RefreshCw className="w-4 h-4 mr-2" />
                                                {Math.floor(syncAllCooldown / 60)}:{(syncAllCooldown % 60).toString().padStart(2, '0')}
                                            </>
                                        ) : (
                                            <>
                                                <RefreshCw className="w-4 h-4 mr-2" />
                                                Sync All
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <ScrollArea className="h-[500px] w-full border rounded-md">
                                    {leaderboard.length === 0 ? (
                                        <div className="text-center py-10 text-muted-foreground">
                                            <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                                            <p>No participants yet</p>
                                        </div>
                                    ) : (
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead className="w-12">Rank</TableHead>
                                                    <TableHead className="w-48">User</TableHead>
                                                    {contest?.problems.map((prob, idx) => (
                                                        <TableHead key={idx} className="text-center min-w-[80px]">
                                                            {idx + 1}
                                                            <span className="text-xs font-normal text-muted-foreground ml-1">
                                                                ({prob.points})
                                                            </span>
                                                        </TableHead>
                                                    ))}
                                                    <TableHead className="text-right">Score</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {leaderboard.map((entry) => {
                                                    const isCurrentUser = entry.leetcode_username === user?.leetcode_username;
                                                    return (
                                                        <TableRow key={entry.username} className={isCurrentUser ? 'bg-primary/5' : ''}>
                                                            <TableCell className="font-medium p-2">
                                                                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${entry.rank === 1 ? 'bg-yellow-500 text-black' :
                                                                        entry.rank === 2 ? 'bg-gray-300 text-black' :
                                                                            entry.rank === 3 ? 'bg-amber-700 text-white' :
                                                                                'bg-secondary text-foreground'
                                                                    }`}>
                                                                    {entry.rank}
                                                                </div>
                                                            </TableCell>
                                                            <TableCell className="p-2">
                                                                <div className="flex flex-col">
                                                                    <span className={`font-medium ${isCurrentUser ? 'text-primary' : ''}`}>
                                                                        {entry.username}
                                                                        {isCurrentUser && " (You)"}
                                                                    </span>
                                                                    <span className="text-xs text-muted-foreground truncate max-w-[120px]" title={entry.leetcode_username}>
                                                                        {entry.leetcode_username}
                                                                    </span>
                                                                </div>
                                                            </TableCell>
                                                            {contest?.problems.map((prob) => {
                                                                const progress = entry.problem_progress?.find(p => p.slug === prob.slug);
                                                                return (
                                                                    <TableCell key={prob.slug} className="text-center p-1">
                                                                        {progress?.status === 'ACCEPTED' ? (
                                                                            <div className="bg-green-500/10 text-green-500 rounded p-1 mx-auto max-w-[80px]">
                                                                                <p className="font-bold text-xs">{formatSolveTime(progress.solved_at)}</p>
                                                                                {progress.fail_count > 0 && (
                                                                                    <p className="text-[10px] opacity-70">(-{progress.fail_count})</p>
                                                                                )}
                                                                            </div>
                                                                        ) : progress && progress.fail_count > 0 ? (
                                                                            <div className="bg-red-500/10 text-destructive rounded p-1 mx-auto max-w-[80px]">
                                                                                <p className="text-xs font-medium">(-{progress.fail_count})</p>
                                                                            </div>
                                                                        ) : (
                                                                            <div className="text-muted-foreground/20 text-center">-</div>
                                                                        )}
                                                                    </TableCell>
                                                                );
                                                            })}
                                                            <TableCell className="text-right p-2">
                                                                <div className="font-bold">{entry.score}</div>
                                                                <div className="text-xs text-muted-foreground">{entry.penalty}</div>
                                                            </TableCell>
                                                        </TableRow>
                                                    );
                                                })}
                                            </TableBody>
                                        </Table>
                                    )}
                                </ScrollArea>
                            </CardContent>
                        </Card>
                    </motion.div>
                </div>
            </div>
        </div>
    );
}

export default function ContestDetailPage() {
    return (
        <ProtectedRoute>
            <ContestDetailContent />
        </ProtectedRoute>
    );
}
