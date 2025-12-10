import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Search, Calendar as CalendarIcon, Filter } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '@/lib/api';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';

interface OIT {
    id: string;
    oitNumber: string;
    scheduledDate: string;
    description?: string;
    status: string;
    client?: {
        name: string;
    };
}

export default function CalendarPage() {
    const [oits, setOits] = useState<OIT[]>([]);
    const [filteredOits, setFilteredOits] = useState<OIT[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('ALL');
    const navigate = useNavigate();

    useEffect(() => {
        fetchScheduledOITs();
    }, []);

    useEffect(() => {
        filterOits();
    }, [searchTerm, statusFilter, oits]);

    const fetchScheduledOITs = async () => {
        try {
            const response = await api.get('/oits');

            if (Array.isArray(response.data)) {
                const allOits: OIT[] = response.data;
                // Filter only those with scheduledDate
                const scheduled = allOits
                    .filter(oit => oit.scheduledDate)
                    .sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime());

                setOits(scheduled);
                setFilteredOits(scheduled);
            } else {
                console.error('API response is not an array:', response.data);
                setOits([]);
                setFilteredOits([]);
            }
        } catch (error) {
            console.error('Error fetching scheduled OITs:', error);
            toast.error('Error al cargar muestreos agendados');
            setOits([]);
            setFilteredOits([]);
        } finally {
            setIsLoading(false);
        }
    };

    const filterOits = () => {
        let result = oits;

        if (searchTerm) {
            const lowerTerm = searchTerm.toLowerCase();
            result = result.filter(oit =>
                oit.oitNumber.toLowerCase().includes(lowerTerm) ||
                oit.client?.name.toLowerCase().includes(lowerTerm)
            );
        }

        if (statusFilter !== 'ALL') {
            result = result.filter(oit => oit.status === statusFilter);
        }

        setFilteredOits(result);
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'SCHEDULED':
                return <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50 border-emerald-200">Agendado</Badge>;
            case 'IN_PROGRESS':
                return <Badge className="bg-amber-50 text-amber-700 hover:bg-amber-50 border-amber-200">En Progreso</Badge>;
            case 'COMPLETED':
                return <Badge className="bg-indigo-50 text-indigo-700 hover:bg-indigo-50 border-indigo-200">Completado</Badge>;
            default:
                return <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200">{status}</Badge>;
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-slate-900">Agenda de Muestreos</h2>
                    <p className="text-slate-500">
                        Gestiona y visualiza los muestreos programados.
                    </p>
                </div>
            </div>

            <Card className="border-slate-200 shadow-sm bg-white">
                <CardHeader className="border-b border-slate-100 pb-4">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center justify-between">
                        <div className="relative w-72">
                            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <Input
                                placeholder="Buscar por OIT..."
                                className="pl-9 bg-slate-50 border-slate-200 focus:bg-white transition-colors"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant={statusFilter === 'ALL' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setStatusFilter('ALL')}
                                className={statusFilter === 'ALL' ? "bg-slate-900 text-white hover:bg-slate-800" : "text-slate-600 border-slate-200"}
                            >
                                Todos
                            </Button>
                            <Button
                                variant={statusFilter === 'SCHEDULED' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setStatusFilter('SCHEDULED')}
                                className={statusFilter === 'SCHEDULED' ? "bg-slate-900 text-white hover:bg-slate-800" : "text-slate-600 border-slate-200"}
                            >
                                Agendados
                            </Button>
                            <Button
                                variant={statusFilter === 'IN_PROGRESS' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setStatusFilter('IN_PROGRESS')}
                                className={statusFilter === 'IN_PROGRESS' ? "bg-slate-900 text-white hover:bg-slate-800" : "text-slate-600 border-slate-200"}
                            >
                                En Progreso
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-slate-50/50">
                                <TableRow className="hover:bg-slate-50/50 border-slate-100">
                                    <TableHead className="w-[150px] py-3 px-4 font-medium text-slate-500">OIT</TableHead>
                                    <TableHead className="py-3 px-4 font-medium text-slate-500">Fecha Programada</TableHead>
                                    <TableHead className="py-3 px-4 font-medium text-slate-500">Cliente</TableHead>
                                    <TableHead className="py-3 px-4 font-medium text-slate-500">Estado</TableHead>
                                    <TableHead className="text-right py-3 px-4 font-medium text-slate-500">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody className="divide-y divide-slate-100">
                                {isLoading ? (
                                    [...Array(3)].map((_, i) => (
                                        <TableRow key={i}>
                                            <TableCell className="py-3 px-4"><Skeleton className="h-4 w-[100px]" /></TableCell>
                                            <TableCell className="py-3 px-4"><Skeleton className="h-4 w-[150px]" /></TableCell>
                                            <TableCell className="py-3 px-4"><Skeleton className="h-4 w-[100px]" /></TableCell>
                                            <TableCell className="py-3 px-4"><Skeleton className="h-6 w-[80px]" /></TableCell>
                                            <TableCell className="py-3 px-4 text-right"><Skeleton className="h-8 w-20 ml-auto" /></TableCell>
                                        </TableRow>
                                    ))
                                ) : filteredOits.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-24 text-center text-slate-500">
                                            No se encontraron muestreos programados.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredOits.map((oit) => (
                                        <TableRow key={oit.id} className="hover:bg-slate-50/50 transition-colors group">
                                            <TableCell className="py-3 px-4 font-medium text-slate-900">
                                                {oit.oitNumber}
                                            </TableCell>
                                            <TableCell className="py-3 px-4">
                                                <div className="flex items-center gap-2 text-slate-600">
                                                    <CalendarIcon className="h-4 w-4 text-slate-400" />
                                                    {format(new Date(oit.scheduledDate), "d 'de' MMMM, yyyy", { locale: es })}
                                                </div>
                                            </TableCell>
                                            <TableCell className="py-3 px-4 text-slate-600">
                                                {oit.client?.name || 'N/A'}
                                            </TableCell>
                                            <TableCell className="py-3 px-4">
                                                {getStatusBadge(oit.status)}
                                            </TableCell>
                                            <TableCell className="py-3 px-4 text-right">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => navigate(`/oits/${oit.id}`)}
                                                    className="text-slate-600 hover:text-slate-900"
                                                >
                                                    Ver Detalles
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
