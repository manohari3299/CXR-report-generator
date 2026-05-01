import { useState, useRef, useEffect } from 'react';
import { Bell, Search, User, LogOut, Settings, ChevronDown, Menu } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ProfileModal } from './ProfileModal';

interface TopbarProps {
    onMenuClick: () => void;
}

export function Topbar({ onMenuClick }: TopbarProps) {
    const { user, logout } = useAuth();
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setIsDropdownOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <>
            <header className="h-16 lg:pl-64 fixed top-0 right-0 left-0 bg-background/80 backdrop-blur-md z-10 border-b border-white/5 flex items-center justify-between px-4 md:px-8">
                <div className="flex items-center gap-3">
                    <button onClick={onMenuClick} className="lg:hidden p-2 text-muted-foreground hover:text-white">
                        <Menu className="w-5 h-5" />
                    </button>
                    <div className="relative w-48 md:w-96 hidden sm:block">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Search patient ID or report..."
                        className="w-full bg-white/5 border border-white/10 rounded-full pl-10 pr-4 py-1.5 text-sm text-white placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 transition-all"
                    />
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <button className="relative p-2 text-muted-foreground hover:text-white transition-colors">
                        <Bell className="w-5 h-5" />
                        <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-indigo-500 rounded-full border-2 border-background"></span>
                    </button>

                    <div className="h-8 w-px bg-white/10"></div>

                    <div className="relative" ref={dropdownRef}>
                        <button
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                            className="flex items-center gap-3 px-2 py-1.5 rounded-xl hover:bg-white/5 transition-colors focus:outline-none"
                        >
                            {user?.picture_url ? (
                                <img
                                    src={user.picture_url}
                                    alt={user.name}
                                    className="w-9 h-9 rounded-full border border-indigo-500/30 object-cover"
                                />
                            ) : (
                                <div className="w-9 h-9 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
                                    <User className="w-5 h-5 text-indigo-400" />
                                </div>
                            )}
                            <div className="text-left hidden md:block">
                                <p className="text-sm font-medium text-white leading-tight">{user?.name || "User"}</p>
                                <p className="text-xs text-muted-foreground">Radiologist</p>
                            </div>
                            <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {isDropdownOpen && (
                            <div className="absolute right-0 top-full mt-2 w-56 bg-[#1a1a2e] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50">
                                <div className="px-4 py-3 border-b border-white/10">
                                    <p className="text-sm font-medium text-white truncate">{user?.name}</p>
                                    <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                                </div>
                                <div className="py-1">
                                    <button
                                        onClick={() => { setIsDropdownOpen(false); setIsProfileModalOpen(true); }}
                                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:bg-white/5 hover:text-white transition-colors"
                                    >
                                        <Settings className="w-4 h-4" />
                                        Edit Profile
                                    </button>
                                    <button
                                        onClick={() => { setIsDropdownOpen(false); logout(); }}
                                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors"
                                    >
                                        <LogOut className="w-4 h-4" />
                                        Sign Out
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            <ProfileModal
                isOpen={isProfileModalOpen}
                onClose={() => setIsProfileModalOpen(false)}
            />
        </>
    );
}
