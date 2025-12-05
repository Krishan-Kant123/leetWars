import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        const result = await login(email, password);

        if (result.success) {
            navigate('/dashboard');
        } else {
            setError(result.error);
        }

        setLoading(false);
    };

    return (
        <div className="min-h-screen flex items-center justify-center px-4 py-12">
            <div className="max-w-md w-full">
                {/* Logo and Title */}
                <div className="text-center mb-8 animate-fade-in">
                    <h1 className="text-5xl font-bold gradient-text mb-2">⚔️ LeetWars</h1>
                    <p className="text-dark-400 text-lg">Compete on LeetCode, Win Glory</p>
                </div>

                {/* Login Card */}
                <div className="card p-8 animate-slide-up">
                    <h2 className="text-2xl font-bold text-center mb-6 text-dark-100">
                        Welcome Back
                    </h2>

                    {error && (
                        <div className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-dark-300 mb-2">
                                Email
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="input"
                                placeholder="your@email.com"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-dark-300 mb-2">
                                Password
                            </label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="input"
                                placeholder="••••••••"
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="btn-primary w-full"
                        >
                            {loading ? (
                                <span className="flex items-center justify-center">
                                    <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white mr-2"></div>
                                    Logging in...
                                </span>
                            ) : (
                                'Login'
                            )}
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <p className="text-dark-400">
                            Don't have an account?{' '}
                            <Link
                                to="/register"
                                className="text-primary-400 hover:text-primary-300 font-medium transition-colors"
                            >
                                Sign up
                            </Link>
                        </p>
                    </div>
                </div>

                {/* Feature Highlights */}
                <div className="mt-8 grid grid-cols-3 gap-4 text-center">
                    <div className="glass p-4 rounded-lg">
                        <div className="text-2xl mb-1">🎯</div>
                        <div className="text-xs text-dark-400">Real LeetCode Problems</div>
                    </div>
                    <div className="glass p-4 rounded-lg">
                        <div className="text-2xl mb-1">⚡</div>
                        <div className="text-xs text-dark-400">Live Leaderboards</div>
                    </div>
                    <div className="glass p-4 rounded-lg">
                        <div className="text-2xl mb-1">🏆</div>
                        <div className="text-xs text-dark-400">Timed Contests</div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
