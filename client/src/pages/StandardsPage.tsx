import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import api from '@/lib/api';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Plus, MoreHorizontal, FileText, Scale, Download, Edit, Trash2 } from 'lucide-react';

interface Standard {
    id: string;
    title: string;
    description: string;
    type: 'OIT' | 'QUOTATION';
    fileUrl?: string;
    createdAt: string;
}

export default function StandardsPage() {
    const navigate = useNavigate();
    const [standards, setStandards] = useState<Standard[]>([]);
    const [filteredStandards, setFilteredStandards] = useState<Standard[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchStandards();
    }, []);

    useEffect(() => {
        filterStandards();
    }, [searchTerm, standards]);

    const fetchStandards = async () => {
        try {
            const response = await api.get('/standards');
            setStandards(response.data);
            setFilteredStandards(response.data);
        } catch (error) {
            console.error('Error fetching standards:', error);
            toast.error('No se pudieron cargar las normas. Verifica la conexión.');
            setStandards([]);
            setFilteredStandards([]);
        } finally {
            setIsLoading(false);
        }
    };

    const filterStandards = () => {
        if (!searchTerm) {
            setFilteredStandards(standards);
            return;
        }
        const lowerTerm = searchTerm.toLowerCase();
        const filtered = standards.filter(std =>
            std.title.toLowerCase().includes(lowerTerm) ||
            std.description.toLowerCase().includes(lowerTerm)
        );
        setFilteredStandards(filtered);
    };

    const handleDelete = async (id: string) => {
        try {
            await api.delete(`/standards/${id}`);
            setStandards(standards.filter(s => s.id !== id));
            toast.success('Norma eliminada');
        } catch (error) {
            console.error('Error deleting standard:', error);
            toast.error('Error al eliminar norma');
        }
    };

    const getTypeBadge = (type: string) => {
        return type === 'OIT'
            ? <Badge className="bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-50">OIT</Badge>
            : <Badge className="bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-50">Cotización</Badge>;
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-slate-900">Normas y Reglas</h2>
                    <p className="text-slate-500">
                        Define los criterios de revisión para OITs y Cotizaciones.
                    </p>
                </div>
                <Button
                    onClick={() => navigate('/standards/create')}
                    className="bg-slate-900 hover:bg-slate-800 text-white"
                >
                    <Plus className="mr-2 h-4 w-4" />
                    Nueva Norma
                </Button>
            </div>

            <Card className="border-slate-200 shadow-sm bg-white">
                <CardHeader className="border-b border-slate-100 pb-4">
                    <div className="flex items-center justify-between">
                        <div className="relative w-72">
                            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <Input
                                placeholder="Buscar normas..."
                                className="pl-9 bg-slate-50 border-slate-200 focus:bg-white transition-colors"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-slate-50/50">
                                <TableRow className="hover:bg-slate-50/50 border-slate-100">
                                    <TableHead className="w-[250px] py-3 px-4 font-medium text-slate-500">Título</TableHead>
                                    <TableHead className="py-3 px-4 font-medium text-slate-500">Tipo</TableHead>
                                    <TableHead className="py-3 px-4 font-medium text-slate-500">Descripción</TableHead>
                                    <TableHead className="text-right py-3 px-4 font-medium text-slate-500">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody className="divide-y divide-slate-100">
                                {isLoading ? (
                                    [...Array(3)].map((_, i) => (
                                        <TableRow key={i}>
                                            <TableCell className="py-3 px-4"><Skeleton className="h-4 w-[200px]" /></TableCell>
                                            <TableCell className="py-3 px-4"><Skeleton className="h-4 w-[80px]" /></TableCell>
                                            <TableCell className="py-3 px-4"><Skeleton className="h-4 w-[300px]" /></TableCell>
                                            <TableCell className="py-3 px-4 text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                                        </TableRow>
                                    ))
                                ) : filteredStandards.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="h-32 text-center text-slate-500">
                                            <div className="flex flex-col items-center justify-center gap-2">
                                                <Scale className="h-8 w-8 text-slate-300" />
                                                <p>No hay normas definidas</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredStandards.map((std) => (
                                        <TableRow key={std.id} className="hover:bg-slate-50/50 transition-colors group">
                                            <TableCell className="py-3 px-4 font-medium text-slate-900">
                                                <div className="flex items-center gap-2">
                                                    <FileText className="h-4 w-4 text-slate-400" />
                                                    {std.title}
                                                </div>
                                            </TableCell>
                                            <TableCell className="py-3 px-4">
                                                {getTypeBadge(std.type)}
                                            </TableCell>
                                            <TableCell className="py-3 px-4 text-slate-600 max-w-md truncate">
                                                {std.description}
                                                {std.fileUrl && (
                                                    <a href={std.fileUrl} download target="_blank" rel="noopener noreferrer" className="ml-2 inline-flex items-center text-blue-600 hover:underline text-xs bg-blue-50 px-2 py-1 rounded-full border border-blue-100">
                                                        <Download className="h-3 w-3 mr-1" />
                                                        Descargar PDF
                                                    </a>
                                                )}
                                            </TableCell>
                                            <TableCell className="py-3 px-4 text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" className="h-8 w-8 p-0 text-slate-400 hover:text-slate-900">
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem onClick={() => navigate(`/standards/edit/${std.id}`)}>
                                                            <Edit className="mr-2 h-4 w-4" />
                                                            Editar
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem className="text-red-600" onClick={() => handleDelete(std.id)}>
                                                            <Trash2 className="mr-2 h-4 w-4" />
                                                            Eliminar
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div >
    );
}
