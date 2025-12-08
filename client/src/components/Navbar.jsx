import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import lcwars from '../assets/lc_wars.png';

const Navbar = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <nav className="bg-[#0f2a23] border-b border-[#10b981]/20 sticky top-0 z-50 backdrop-blur-lg bg-opacity-90">
            <div className="max-w-7xl mx-auto px-4">
                <div className="flex items-center justify-between h-16">
                    {/* Logo */}
                    <Link to="/dashboard" className="flex items-center gap-3 group">
                        <img
                            src={lcwars}
                            alt="LeetWars Logo"
                            className="w-10 h-10 object-contain transition-transform group-hover:scale-110"
                        />
                        <span className="text-xl font-bold gradient-text">LeetWars</span>
                    </Link>

                    {/* Navigation Links */}
                    <div className="hidden md:flex items-center gap-6">
                        <Link
                            to="/dashboard"
                            className="text-gray-300 hover:text-[#10b981] transition-colors font-medium"
                        >
                            Home
                        </Link>
                        <Link
                            to="/dashboard"
                            className="text-gray-300 hover:text-[#10b981] transition-colors font-medium"
                        >
                            My Contests
                        </Link>
                        <Link
                            to="/profile"
                            className="text-gray-300 hover:text-[#10b981] transition-colors font-medium"
                        >
                            Profile
                        </Link>
                    </div>

                    {/* Right Side */}
                    <div className="flex items-center gap-4">
                        <Link to="/contest/create">
                            <button className="btn-primary">
                                Create Contest
                            </button>
                        </Link>

                        {/* User Menu */}
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2 bg-[#0a1f1a] px-3 py-2 rounded-lg border border-[#10b981]/30">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#10b981] to-[#059669] flex items-center justify-center text-white font-bold">
                                    {user?.username?.[0]?.toUpperCase() || 'U'}
                                </div>
                                <span className="text-sm font-medium text-gray-200 hidden sm:block">
                                    {user?.username}
                                </span>
                            </div>

                            <button
                                onClick={handleLogout}
                                className="text-gray-400 hover:text-red-400 transition-colors p-2"
                                title="Logout"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
