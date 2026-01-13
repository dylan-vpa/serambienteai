import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';
import api from '@/lib/api';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Plus, FileText, Loader2, Receipt, Building2, Upload, CheckCircle2, AlertCircle } from 'lucide-react';

interface Quotation {
    id: string;
    quotationNumber: string;
    description?: string;
    clientName?: string;
    fileUrl?: string;
    status: string;
    createdAt: string;
    linkedOITs?: { id: string; oitNumber: string; status: string }[];
}

export default function QuotationsPage() {
    const navigate = useNavigate();
    const [quotations, setQuotations] = useState<Quotation[]>([]);
    const [filteredQuotations, setFilteredQuotations] = useState<Quotation[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isCreating, setIsCreating] = useState(false);

    // Create form state
    const [clientName, setClientName] = useState('');
    const [description, setDescription] = useState('');
    const [file, setFile] = useState<File | null>(null);

    useEffect(() => {
        fetchQuotations();
    }, []);

    useEffect(() => {
        filterQuotations();
    }, [searchTerm, quotations]);

    const fetchQuotations = async () => {
        try {
            const response = await api.get('/quotations');
            setQuotations(response.data);
            setFilteredQuotations(response.data);
        } catch (error) {
            console.error('Error fetching quotations:', error);
            toast.error('No se pudieron cargar las cotizaciones.');
            setQuotations([]);
            setFilteredQuotations([]);
        } finally {
            setIsLoading(false);
        }
    };

    const filterQuotations = () => {
        if (!searchTerm) {
            setFilteredQuotations(quotations);
            return;
        }
        const lowerTerm = searchTerm.toLowerCase();
        const filtered = quotations.filter(q =>
            q.quotationNumber.toLowerCase().includes(lowerTerm) ||
            q.clientName?.toLowerCase().includes(lowerTerm) ||
            q.description?.toLowerCase().includes(lowerTerm)
        );
        setFilteredQuotations(filtered);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            if (selectedFile.type !== 'application/pdf') {
                toast.error('Solo se permiten archivos PDF');
                return;
            }
            setFile(selectedFile);
        }
    };

    const handleCreate = async () => {
        if (!file) {
            toast.error('Debes seleccionar un archivo PDF');
            return;
        }

        setIsCreating(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            if (clientName) formData.append('clientName', clientName);
            if (description) formData.append('description', description);

            await api.post('/quotations', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            toast.success('Cotización creada exitosamente');
            setIsCreateOpen(false);
            resetForm();
            fetchQuotations();
        } catch (error: any) {
            console.error('Error creating quotation:', error);
            toast.error(error.response?.data?.error || 'Error al crear cotización');
        } finally {
            setIsCreating(false);
        }
    };


    const resetForm = () => {
        setClientName('');
        setDescription('');
        setFile(null);
    };

    const getStatusBadge = (status: string) => {
        const styles: Record<string, string> = {
            'PENDING': 'bg-yellow-50 text-yellow-700 border-yellow-200',
            'ANALYZING': 'bg-blue-50 text-blue-700 border-blue-200',
            'COMPLIANT': 'bg-green-50 text-green-700 border-green-200',
            'NON_COMPLIANT': 'bg-red-50 text-red-700 border-red-200',
            'REVIEW_REQUIRED': 'bg-orange-50 text-orange-700 border-orange-200'
        };
        const labels: Record<string, string> = {
            'PENDING': 'Pendiente',
            'ANALYZING': 'Analizando',
            'COMPLIANT': 'Conforme',
            'NON_COMPLIANT': 'No Conforme',
            'REVIEW_REQUIRED': 'Revisión'
        };
        return <Badge className={`${styles[status] || styles['PENDING']} hover:${styles[status]}`}>{labels[status] || status}</Badge>;
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-slate-900">Cotizaciones</h2>
                    <p className="text-slate-500">
                        Gestiona las cotizaciones y verifica su cumplimiento normativo.
                    </p>
                </div>
                <Dialog open={isCreateOpen} onOpenChange={(open) => {
                    if (!open) resetForm();
                    setIsCreateOpen(open);
                }}>
                    <DialogTrigger asChild>
                        <Button className="bg-slate-900 hover:bg-slate-800 text-white">
                            <Plus className="mr-2 h-4 w-4" />
                            Nueva Cotización
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[600px]">
                        <DialogHeader>
                            <DialogTitle>Subir Cotización</DialogTitle>
                            <DialogDescription>
                                Sube una cotización para revisión y verificación de cumplimiento normativo.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="grid gap-6 py-6">
                            {/* File Upload Card */}
                            <div className={`relative border-2 border-dashed rounded-lg p-8 transition-all ${file
                                ? 'border-emerald-300 bg-emerald-50'
                                : 'border-slate-300 bg-slate-50 hover:border-slate-400 hover:bg-white'
                                }`}>
                                <input
                                    id="quotationFile"
                                    type="file"
                                    accept=".pdf"
                                    onChange={handleFileChange}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                />
                                <div className="flex flex-col items-center text-center pointer-events-none">
                                    {file ? (
                                        <>
                                            <CheckCircle2 className="h-12 w-12 text-emerald-600 mb-3" />
                                            <p className="font-semibold text-emerald-900 mb-1">Cotización</p>
                                            <p className="text-sm text-emerald-700 break-all px-2">{file.name}</p>
                                            <p className="text-xs text-emerald-600 mt-2">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                                        </>
                                    ) : (
                                        <>
                                            <Upload className="h-12 w-12 text-slate-400 mb-3" />
                                            <p className="font-semibold text-slate-700 mb-1">Documento de Cotización *</p>
                                            <p className="text-sm text-slate-500">Click para subir PDF</p>
                                            <p className="text-xs text-slate-400 mt-2">Máx. 10MB</p>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Client Name Field */}
                            <div className="grid gap-2">
                                <Label htmlFor="clientName">Cliente (opcional)</Label>
                                <Input
                                    id="clientName"
                                    placeholder="Nombre del cliente"
                                    value={clientName}
                                    onChange={(e) => setClientName(e.target.value)}
                                />
                            </div>

                            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
                                <div className="flex gap-3">
                                    <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-sm font-semibold text-blue-900 mb-1">Revisión Automática</p>
                                        <p className="text-sm text-blue-800">
                                            La cotización será analizada para verificar cumplimiento normativo. Podrás vincularla a OITs después.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Cancelar</Button>
                            <Button
                                onClick={handleCreate}
                                disabled={isCreating || !file}
                                className="bg-slate-900 hover:bg-slate-800"
                            >
                                {isCreating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                {isCreating ? 'Creando...' : 'Crear Cotización'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <Card className="border-slate-200 shadow-sm bg-white">
                <CardHeader className="border-b border-slate-100 pb-4">
                    <div className="flex items-center justify-between">
                        <div className="relative w-72">
                            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <Input
                                placeholder="Buscar cotizaciones..."
                                className="pl-9 bg-slate-50 border-slate-200 focus:bg-white transition-colors"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="text-sm text-slate-500">
                            {filteredQuotations.length} cotización(es)
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-slate-50/50">
                                <TableRow className="hover:bg-slate-50/50 border-slate-100">
                                    <TableHead className="w-[180px] py-3 px-4 font-medium text-slate-500">Número</TableHead>
                                    <TableHead className="py-3 px-4 font-medium text-slate-500">Cliente</TableHead>
                                    <TableHead className="py-3 px-4 font-medium text-slate-500">Estado</TableHead>
                                    <TableHead className="py-3 px-4 font-medium text-slate-500">OITs Vinculadas</TableHead>
                                    <TableHead className="py-3 px-4 font-medium text-slate-500">Fecha</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody className="divide-y divide-slate-100">
                                {isLoading ? (
                                    [...Array(3)].map((_, i) => (
                                        <TableRow key={i}>
                                            <TableCell className="py-3 px-4"><Skeleton className="h-4 w-[120px]" /></TableCell>
                                            <TableCell className="py-3 px-4"><Skeleton className="h-4 w-[150px]" /></TableCell>
                                            <TableCell className="py-3 px-4"><Skeleton className="h-4 w-[80px]" /></TableCell>
                                            <TableCell className="py-3 px-4"><Skeleton className="h-4 w-[60px]" /></TableCell>
                                            <TableCell className="py-3 px-4"><Skeleton className="h-4 w-[80px]" /></TableCell>
                                        </TableRow>
                                    ))
                                ) : filteredQuotations.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-32 text-center text-slate-500">
                                            <div className="flex flex-col items-center justify-center gap-2">
                                                <Receipt className="h-8 w-8 text-slate-300" />
                                                <p>No hay cotizaciones registradas</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredQuotations.map((q) => (
                                        <TableRow
                                            key={q.id}
                                            onClick={() => navigate(`/quotations/${q.id}`)}
                                            className="hover:bg-indigo-50 transition-colors cursor-pointer group">
                                            <TableCell className="py-3 px-4 font-medium text-slate-900">
                                                <div className="flex items-center gap-2">
                                                    <FileText className="h-4 w-4 text-slate-400" />
                                                    {q.quotationNumber}
                                                </div>
                                            </TableCell>
                                            <TableCell className="py-3 px-4">
                                                <div className="flex items-center gap-2 text-slate-600">
                                                    <Building2 className="h-4 w-4 text-slate-400" />
                                                    {q.clientName || 'Sin cliente'}
                                                </div>
                                            </TableCell>
                                            <TableCell className="py-3 px-4">
                                                {getStatusBadge(q.status)}
                                            </TableCell>
                                            <TableCell className="py-3 px-4 text-slate-600">
                                                {q.linkedOITs?.length || 0} OIT(s)
                                            </TableCell>
                                            <TableCell className="py-3 px-4 text-slate-500 text-sm">
                                                {new Date(q.createdAt).toLocaleDateString('es-ES')}
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
