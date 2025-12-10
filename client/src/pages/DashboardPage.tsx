import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { FileText, CheckCircle, Clock, AlertCircle, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';

export default function DashboardPage() {
    const { stats, isLoading } = useDashboardStats();

    if (isLoading) {
        return <DashboardSkeleton />;
    }

    const statCards = [
        {
            title: 'Total OITs',
            value: stats.totalOITs,
            icon: FileText,
            description: 'Inspecciones totales',
        },
        {
            title: 'Completadas',
            value: stats.completedOITs,
            icon: CheckCircle,
            description: 'Cerradas exitosamente',
        },
        {
            title: 'En Progreso',
            value: stats.inProgressOITs,
            icon: Clock,
            description: 'Actualmente activas',
        },
        {
            title: 'Pendientes',
            value: stats.pendingOITs,
            icon: AlertCircle,
            description: 'Esperando acción',
        },
    ];

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-slate-900">Panel de Control</h2>
                    <p className="text-slate-500">Resumen de tus actividades de inspección.</p>
                </div>
                <div className="flex items-center gap-2">
                    <Link to="/oits">
                        <Button className="bg-slate-900 hover:bg-slate-800 text-white">
                            <Plus className="mr-2 h-4 w-4" /> Nueva OIT
                        </Button>
                    </Link>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {statCards.map((stat) => {
                    const Icon = stat.icon;
                    return (
                        <Card key={stat.title} className="border-slate-200 shadow-sm hover:shadow-md transition-shadow bg-white">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium text-slate-600">
                                    {stat.title}
                                </CardTitle>
                                <Icon className="h-4 w-4 text-slate-400" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-slate-900">{stat.value}</div>
                                <p className="text-xs text-slate-500 mt-1">
                                    {stat.description}
                                </p>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <Card className="col-span-4 border-slate-200 shadow-sm bg-white">
                    <CardHeader>
                        <CardTitle className="text-slate-900">OITs Recientes</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {stats.recentOITs.length === 0 ? (
                                <p className="text-sm text-slate-500">No se encontraron OITs recientes.</p>
                            ) : (
                                stats.recentOITs.map((oit) => (
                                    <div key={oit.id} className="flex items-center justify-between border-b border-slate-100 pb-4 last:border-0 last:pb-0">
                                        <div className="space-y-1">
                                            <p className="text-sm font-medium leading-none text-slate-900">
                                                {oit.oitNumber || `OIT-${oit.id}`}
                                            </p>
                                            <p className="text-xs text-slate-500">
                                                {new Date(oit.createdAt).toLocaleDateString()}
                                            </p>
                                        </div>
                                        <div className={`px-2.5 py-0.5 rounded-full text-xs font-medium
                                            ${oit.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' :
                                                oit.status === 'IN_PROGRESS' ? 'bg-amber-100 text-amber-700' :
                                                    'bg-slate-100 text-slate-700'}`}>
                                            {oit.status}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </CardContent>
                </Card>
                <Card className="col-span-3 border-slate-200 shadow-sm bg-white">
                    <CardHeader>
                        <CardTitle className="text-slate-900">Estado de Recursos</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-slate-600">Total Recursos</span>
                                <span className="text-sm font-bold text-slate-900">{stats.totalResources}</span>
                            </div>
                            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-slate-900"
                                    style={{ width: `${stats.totalResources > 0 ? (stats.availableResources / stats.totalResources) * 100 : 0}%` }}
                                />
                            </div>
                            <p className="text-xs text-slate-500">
                                {stats.availableResources} disponibles de {stats.totalResources}
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

function DashboardSkeleton() {
    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div className="space-y-2">
                    <Skeleton className="h-8 w-[200px]" />
                    <Skeleton className="h-4 w-[300px]" />
                </div>
                <Skeleton className="h-10 w-[120px]" />
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {[...Array(4)].map((_, i) => (
                    <Skeleton key={i} className="h-[120px] rounded-xl" />
                ))}
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <Skeleton className="col-span-4 h-[300px] rounded-xl" />
                <Skeleton className="col-span-3 h-[300px] rounded-xl" />
            </div>
        </div>
    );
}
