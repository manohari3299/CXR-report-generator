import React, { useState } from 'react';
import { Bell, Search, User, LogOut, Settings } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ProfileModal } from './ProfileModal';

export function Topbar() {
    const { user, logout } = useAuth();
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

    return (
        <>
            <header className="h-16 pl-64 fixed top-0 right-0 left-0 bg-background/80 backdrop-blur-md z-10 border-b border-white/5 flex items-center justify-between px-8">
                <div className="relative w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Search patient ID or report..."
                        className="w-full bg-white/5 border border-white/10 rounded-full pl-10 pr-4 py-1.5 text-sm text-white placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 transition-all"
                    />
                </div>

                <div className="flex items-center gap-4">
                    <button className="relative p-2 text-muted-foreground hover:text-white transition-colors">
                        <Bell className="w-5 h-5" />
                        <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-indigo-500 rounded-full border-2 border-background"></span>
                    </button>

                    <div className="h-8 w-px bg-white/10"></div>

                    <div className="flex items-center gap-3">
                        <div className="text-right hidden md:block">
                            <p className="text-sm font-medium text-white">{user?.name || "Dr. A. Sharma"}</p>
                            <p className="text-xs text-muted-foreground">Radiologist</p>
                        </div>
                        <button 
                            onClick={() => setIsProfileModalOpen(true)}
                            className="relative group focus:outline-none"
                            title="Edit Profile"
                        >
                            {user?.picture_url ? (
                                <img 
                                    src={user.picture_url} 
                                    alt={user.name} 
                                    className="w-9 h-9 rounded-full border border-indigo-500/30 object-cover group-hover:opacity-80 transition-opacity"
                                />
                            ) : (
                                <div className="w-9 h-9 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center group-hover:bg-indigo-500/30 transition-colors">
                                    <User className="w-5 h-5 text-indigo-400" />
                                </div>
                            )}
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                <Settings className="w-4 h-4 text-white drop-shadow-md" />
                            </div>
                        </button>
                        <button 
                            onClick={logout} 
                            className="ml-2 p-2 text-muted-foreground hover:text-red-400 transition-colors"
                            title="Sign Out"
                        >
                            <LogOut className="w-4 h-4" />
                        </button>
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
