import { NavLink } from 'react-router-dom';
import { LayoutDashboard, UploadCloud, Search, AlertTriangle, FileText, Info } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';

const navItems = [
    { path: '/', label: 'Overview', icon: LayoutDashboard },
    { path: '/upload', label: 'Analysis', icon: UploadCloud },
    { path: '/evidence', label: 'Evidence Explorer', icon: Search },
    { path: '/disagreement', label: 'Disagreement', icon: AlertTriangle },
    { path: '/reports', label: 'Reports', icon: FileText },
    { path: '/about', label: 'About', icon: Info },
];

export function Sidebar() {
    return (
        <aside className="w-64 bg-card/50 backdrop-blur-xl border-r border-white/5 h-screen flex flex-col fixed left-0 top-0 z-20">
            <div className="p-6 flex items-center gap-3 border-b border-white/5">
                <div className="p-1 bg-indigo-500/20 rounded-lg overflow-hidden">
                    <img src="/logo.png" alt="X-Ray Insight Logo" className="w-8 h-8 object-contain" />
                </div>
                <div>
                    <h1 className="font-bold text-lg text-white tracking-tight">X-Ray Insight</h1>
                    <p className="text-xs text-muted-foreground">Clinical AI Assistant</p>
                </div>
            </div>

            <nav className="flex-1 p-4 space-y-1">
                {navItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) =>
                            cn(
                                "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group relative overflow-hidden",
                                isActive
                                    ? "text-white bg-indigo-500/10 shadow-[0_0_20px_rgba(99,102,241,0.15)] border border-indigo-500/20"
                                    : "text-muted-foreground hover:text-white hover:bg-white/5"
                            )
                        }
                    >
                        {({ isActive }) => (
                            <>
                                {isActive && (
                                    <motion.div
                                        layoutId="activeNav"
                                        className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-transparent opacity-50"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                    />
                                )}
                                <item.icon className={cn("w-5 h-5", isActive ? "text-indigo-400" : "text-muted-foreground group-hover:text-indigo-300")} />
                                <span className="relative z-10">{item.label}</span>
                                {isActive && (
                                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-indigo-500 rounded-r-full shadow-[0_0_10px_#6366f1]" />
                                )}
                            </>
                        )}
                    </NavLink>
                ))}
            </nav>

            <div className="p-4 border-t border-white/5">
                <div className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 rounded-xl p-4 border border-white/5">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-indigo-300">System Status</span>
                        <div className="flex items-center gap-1.5">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </span>
                            <span className="text-[10px] text-emerald-400">Online</span>
                        </div>
                    </div>
                    <p className="text-[10px] text-muted-foreground">Model v2.4 Loaded</p>
                </div>
            </div>
        </aside>
    );
}
