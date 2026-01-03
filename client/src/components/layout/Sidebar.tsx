import { Link, useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
    LayoutDashboard,
    FileText,
    Box,
    Settings,
    LogOut,
    X,
    Sparkles,
    Bell,
    Calendar,
    Scale,
    Workflow,
    Users
} from 'lucide-react';
import { useAuthStore } from '@/features/auth/authStore';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useUnreadNotifications } from '@/hooks/useUnreadNotifications';
import { canManageUsers } from '@/types/auth';

const getNavigationItems = (userRole?: string) => {
    const baseItems = [
        { icon: LayoutDashboard, label: 'Panel de Control', href: '/' },
        { icon: FileText, label: 'OITs', href: '/oits' },
        { icon: Box, label: 'Recursos', href: '/resources' },
        { icon: Calendar, label: 'Calendario', href: '/calendar' },
        { icon: Scale, label: 'Normas', href: '/standards' },
        { icon: Workflow, label: 'Plantillas', href: '/sampling-templates' },
        { icon: Sparkles, label: 'Asistente IA', href: '/ai' },
        { icon: Bell, label: 'Notificaciones', href: '/notifications' },
    ];

    // Add Users management for SUPER_ADMIN only
    if (userRole && canManageUsers(userRole as any)) {
        baseItems.push({ icon: Users, label: 'Usuarios', href: '/users' });
    }

    baseItems.push({ icon: Settings, label: 'Configuración', href: '/settings' });

    return baseItems;
};

interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
    const location = useLocation();
    const navigate = useNavigate();
    const { user, logout } = useAuthStore();
    const unreadCount = useUnreadNotifications();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <>
            {/* Mobile Overlay */}
            <div
                className={cn(
                    "fixed inset-0 z-40 bg-slate-900/50 lg:hidden transition-opacity",
                    isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
                )}
                onClick={onClose}
            />

            {/* Sidebar */}
            <div className={cn(
                "fixed inset-y-0 left-0 z-50 flex h-full w-[280px] flex-col bg-[#F9F9F9] border-r border-slate-200 transition-transform duration-300 ease-in-out lg:static lg:translate-x-0",
                isOpen ? "translate-x-0" : "-translate-x-full lg:w-0 lg:border-none lg:overflow-hidden"
            )}>
                {/* Branding */}
                <div className="h-16 flex items-center justify-between px-4 border-b border-slate-200/50">
                    <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-white flex items-center justify-center border border-slate-200 shadow-sm overflow-hidden">
                            <img src="/logo.png" alt="Logo" className="h-6 w-6 object-contain" />
                        </div>
                        <div className="text-left">
                            <p className="text-sm font-medium text-slate-900 leading-none">ALS</p>
                            <p className="text-xs text-slate-500 mt-0.5">Serambiente</p>
                        </div>
                    </div>
                    {/* Close button for mobile */}
                    <Button variant="ghost" size="icon" className="lg:hidden" onClick={onClose}>
                        <X className="h-5 w-5 text-slate-500" />
                    </Button>
                </div>

                <div className="flex-1 overflow-y-auto py-6 px-3 space-y-8">
                    {/* Platform Section */}
                    <div>
                        <h3 className="px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                            Plataforma
                        </h3>
                        <nav className="space-y-0.5">
                            {getNavigationItems(user?.role).map((item) => {
                                const Icon = item.icon;
                                const isActive = location.pathname === item.href;
                                const showBadge = item.href === '/notifications' && unreadCount > 0;

                                return (
                                    <Link
                                        key={item.href}
                                        to={item.href}
                                        className={cn(
                                            'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                                            isActive
                                                ? 'bg-white text-slate-900 shadow-sm border border-slate-200/50'
                                                : 'text-slate-600 hover:bg-slate-200/50 hover:text-slate-900'
                                        )}
                                        onClick={() => window.innerWidth < 1024 && onClose()}
                                    >
                                        <Icon className="h-4 w-4" />
                                        {item.label}
                                        {showBadge && (
                                            <span className="ml-auto h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-semibold">
                                                {unreadCount > 9 ? '9+' : unreadCount}
                                            </span>
                                        )}
                                    </Link>
                                );
                            })}
                        </nav>
                    </div>
                </div>

                {/* User Profile */}
                <div className="p-4 border-t border-slate-200/50">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                                <AvatarImage src={`https://avatar.vercel.sh/${user?.email}`} />
                                <AvatarFallback>{user?.email?.[0].toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div className="text-sm">
                                <p className="font-medium text-slate-900">{user?.name || 'Usuario'}</p>
                                <p className="text-xs text-slate-500 truncate max-w-[120px]">{user?.email}</p>
                            </div>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="p-2 text-slate-400 hover:text-red-600 transition-colors rounded-md hover:bg-red-50"
                        >
                            <LogOut className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}
