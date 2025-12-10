import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Search, Plus, MoreHorizontal, Workflow, Trash2 } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import api from '@/lib/api';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';

interface TemplateStep {
    id: string;
    title: string;
    description: string;
}

interface SamplingTemplate {
    id: string;
    name: string;
    description: string;
    oitType: string;
    steps: string;
    createdAt: string;
}

export default function SamplingTemplatesPage() {
    const navigate = useNavigate();
    const [templates, setTemplates] = useState<SamplingTemplate[]>([]);
    const [filteredTemplates, setFilteredTemplates] = useState<SamplingTemplate[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchTemplates();
    }, []);

    useEffect(() => {
        filterTemplates();
    }, [searchTerm, templates]);

    const fetchTemplates = async () => {
        try {
            const response = await api.get('/sampling-templates');
            setTemplates(response.data);
            setFilteredTemplates(response.data);
        } catch (error) {
            console.error('Error fetching templates:', error);
            toast.error('No se pudieron cargar las plantillas');
            setTemplates([]);
            setFilteredTemplates([]);
        } finally {
            setIsLoading(false);
        }
    };

    const filterTemplates = () => {
        if (!searchTerm) {
            setFilteredTemplates(templates);
            return;
        }
        const lowerTerm = searchTerm.toLowerCase();
        const filtered = templates.filter(t =>
            t.name.toLowerCase().includes(lowerTerm) ||
            t.description.toLowerCase().includes(lowerTerm) ||
            t.oitType.toLowerCase().includes(lowerTerm)
        );
        setFilteredTemplates(filtered);
    };

    const handleDelete = async (id: string) => {
        try {
            await api.delete(`/sampling-templates/${id}`);
            setTemplates(templates.filter(t => t.id !== id));
            toast.success('Plantilla eliminada');
        } catch (error) {
            console.error('Error deleting template:', error);
            toast.error('Error al eliminar plantilla');
        }
    };

    const parseSteps = (stepsJson: string): TemplateStep[] => {
        try {
            return JSON.parse(stepsJson);
        } catch {
            return [];
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-slate-900">Plantillas de Muestreo</h2>
                    <p className="text-slate-500">
                        Define flujos de trabajo reutilizables para diferentes tipos de OIT.
                    </p>
                </div>
                <Button
                    onClick={() => navigate('/sampling-templates/create')}
                    className="bg-slate-900 hover:bg-slate-800 text-white"
                >
                    <Plus className="mr-2 h-4 w-4" />
                    Nueva Plantilla
                </Button>
            </div>

            <Card className="border-slate-200 shadow-sm bg-white">
                <CardHeader className="border-b border-slate-100 pb-4">
                    <div className="flex items-center justify-between">
                        <div className="relative w-72">
                            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <Input
                                placeholder="Buscar plantillas..."
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
                                    <TableHead className="w-[250px] py-3 px-4 font-medium text-slate-500">Nombre</TableHead>
                                    <TableHead className="py-3 px-4 font-medium text-slate-500">Tipo OIT</TableHead>
                                    <TableHead className="py-3 px-4 font-medium text-slate-500">Descripción</TableHead>
                                    <TableHead className="py-3 px-4 font-medium text-slate-500">Pasos</TableHead>
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
                                            <TableCell className="py-3 px-4"><Skeleton className="h-4 w-[60px]" /></TableCell>
                                            <TableCell className="py-3 px-4 text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                                        </TableRow>
                                    ))
                                ) : filteredTemplates.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-32 text-center text-slate-500">
                                            <div className="flex flex-col items-center justify-center gap-2">
                                                <Workflow className="h-8 w-8 text-slate-300" />
                                                <p>No hay plantillas definidas</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredTemplates.map((template) => {
                                        const steps = parseSteps(template.steps);
                                        return (
                                            <TableRow key={template.id} className="hover:bg-slate-50/50 transition-colors group">
                                                <TableCell className="py-3 px-4 font-medium text-slate-900">
                                                    <div className="flex items-center gap-2">
                                                        <Workflow className="h-4 w-4 text-slate-400" />
                                                        {template.name}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="py-3 px-4">
                                                    <Badge className="bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-50">
                                                        {template.oitType}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="py-3 px-4 text-slate-600 max-w-md truncate">
                                                    {template.description}
                                                </TableCell>
                                                <TableCell className="py-3 px-4">
                                                    <Badge variant="outline" className="bg-slate-50">
                                                        {steps.length} {steps.length === 1 ? 'paso' : 'pasos'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="py-3 px-4 text-right">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" className="h-8 w-8 p-0 text-slate-400 hover:text-slate-900">
                                                                <MoreHorizontal className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuItem className="text-red-600" onClick={() => handleDelete(template.id)}>
                                                                <Trash2 className="mr-2 h-4 w-4" />
                                                                Eliminar
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div >
    );
}
