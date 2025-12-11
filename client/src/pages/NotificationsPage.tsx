import { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bell, Check, CheckCheck, Trash2, AlertCircle, CheckCircle, Info, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface Notification {
    id: string;
    title: string;
    message: string;
    type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';
    read: boolean;
    createdAt: string;
    oit?: {
        id: string;
        oitNumber: string;
    };
}

export default function NotificationsPage() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const prevCountRef = useRef(notifications.length);

    useEffect(() => {
        fetchNotifications();

        // Request notification permission
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }, []);

    // Show browser notification for new notifications
    useEffect(() => {
        if (notifications.length > prevCountRef.current && Notification.permission === 'granted') {
            const newNotification = notifications[0];
            try {
                new Notification(newNotification.title, {
                    body: newNotification.message,
                    icon: '/logo.png',
                    badge: '/logo.png'
                });
            } catch (error) {
                console.error('Error creating notification:', error);
            }
        }
        prevCountRef.current = notifications.length;
    }, [notifications]);

    const fetchNotifications = async () => {
        try {
            const response = await api.get('/notifications');
            if (Array.isArray(response.data)) {
                setNotifications(response.data);
            } else {
                console.error('API response is not an array:', response.data);
                setNotifications([]);
            }
        } catch (error) {
            console.error('Error fetching notifications:', error);
            toast.error('Error al cargar notificaciones');
            setNotifications([]);
        } finally {
            setIsLoading(false);
        }
    };

    const markAsRead = async (id: string) => {
        try {
            await api.patch(`/notifications/${id}/read`);
            setNotifications(notifications.map(n => n.id === id ? { ...n, read: true } : n));
        } catch (error) {
            console.error('Error marking as read:', error);
        }
    };

    const markAllAsRead = async () => {
        try {
            await api.patch('/notifications/read-all');
            setNotifications(notifications.map(n => ({ ...n, read: true })));
            toast.success('Todas marcadas como leídas');
        } catch (error) {
            console.error('Error marking all as read:', error);
            toast.error('Error al marcar todas como leídas');
        }
    };

    const deleteNotification = async (id: string) => {
        try {
            await api.delete(`/notifications/${id}`);
            setNotifications(notifications.filter(n => n.id !== id));
            toast.success('Notificación eliminada');
        } catch (error) {
            console.error('Error deleting notification:', error);
            toast.error('Error al eliminar notificación');
        }
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'SUCCESS': return <CheckCircle className="h-5 w-5 text-emerald-600" />;
            case 'WARNING': return <AlertTriangle className="h-5 w-5 text-amber-600" />;
            case 'ERROR': return <AlertCircle className="h-5 w-5 text-red-600" />;
            default: return <Info className="h-5 w-5 text-blue-600" />;
        }
    };

    const getBgClass = (type: string) => {
        switch (type) {
            case 'SUCCESS': return 'bg-emerald-50 border-emerald-100';
            case 'WARNING': return 'bg-amber-50 border-amber-100';
            case 'ERROR': return 'bg-red-50 border-red-100';
            default: return 'bg-blue-50 border-blue-100';
        }
    };

    const unreadCount = notifications.filter(n => !n.read).length;

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-slate-900">Notificaciones</h2>
                    <p className="text-slate-500">
                        {unreadCount > 0 ? `${unreadCount} sin leer` : 'Todo al día'}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {Notification.permission !== 'granted' && (
                        <Button
                            onClick={() => {
                                Notification.requestPermission().then(res => {
                                    if (res === 'granted') {
                                        toast.success('Alertas activadas');
                                        // Force re-render/update
                                        window.location.reload();
                                    } else {
                                        toast.error('Permiso denegado');
                                    }
                                });
                            }}
                            variant="outline"
                            className="gap-2 border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
                        >
                            <Bell className="h-4 w-4" />
                            Activar Alertas
                        </Button>
                    )}
                    {unreadCount > 0 && (
                        <Button
                            onClick={markAllAsRead}
                            variant="outline"
                            className="gap-2"
                        >
                            <CheckCheck className="h-4 w-4" />
                            Marcar leídas
                        </Button>
                    )}
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                            if (!('Notification' in window)) {
                                toast.error('Navegador no soporta notificaciones');
                                return;
                            }
                            if (Notification.permission === 'granted') {
                                try {
                                    new Notification('Prueba de Sistema', {
                                        body: 'Si ves esto, las notificaciones funcionan.',
                                        icon: '/logo.png'
                                    });
                                    toast.success('Notificación enviada');
                                } catch (e) {
                                    console.error(e);
                                    toast.error('Error al enviar: ' + (e as any).message);
                                }
                            } else {
                                toast.warning('Permisos no concedidos: ' + Notification.permission);
                            }
                        }}
                    >
                        Probar Notificación
                    </Button>
                </div>
            </div>

            {/* Notifications List */}
            {notifications.length === 0 ? (
                <div className="text-center py-12">
                    <Bell className="h-16 w-16 mx-auto text-slate-300 mb-4" />
                    <p className="text-slate-500">No tienes notificaciones</p>
                </div>
            ) : (
                <div className="space-y-4 max-w-4xl mx-auto w-full">
                    {notifications.map((notification) => (
                        <Card
                            key={notification.id}
                            className={`border ${notification.read ? 'bg-white border-slate-200' : getBgClass(notification.type)} shadow-sm hover:shadow-md transition-all cursor-pointer`}
                            onClick={() => !notification.read && markAsRead(notification.id)}
                        >
                            <CardContent className="p-4">
                                <div className="flex items-start gap-4">
                                    <div className="mt-1">
                                        {getIcon(notification.type)}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-start justify-between gap-4">
                                            <div>
                                                <h3 className="font-semibold text-slate-900 mb-1">
                                                    {notification.title}
                                                </h3>
                                                <p className="text-sm text-slate-600 mb-2">
                                                    {notification.message}
                                                </p>
                                                <div className="flex items-center gap-2 text-xs text-slate-500">
                                                    <span>
                                                        {formatDistanceToNow(new Date(notification.createdAt), {
                                                            addSuffix: true,
                                                            locale: es
                                                        })}
                                                    </span>
                                                    {notification.oit && (
                                                        <>
                                                            <span>•</span>
                                                            <span>{notification.oit.oitNumber}</span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {!notification.read && (
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        className="h-8 w-8"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            markAsRead(notification.id);
                                                        }}
                                                    >
                                                        <Check className="h-4 w-4" />
                                                    </Button>
                                                )}
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-8 w-8 text-red-600 hover:text-red-700"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        deleteNotification(notification.id);
                                                    }}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
