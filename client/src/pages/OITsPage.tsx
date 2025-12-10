import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, FileText, Filter, Upload, CheckCircle2, AlertCircle } from 'lucide-react';
import { useOITs } from '@/hooks/useOITs';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import api from '@/lib/api';
import { toast } from 'sonner';

export default function OITsPage() {
    const [searchQuery, setSearchQuery] = useState('');
    const { oits, isLoading, error } = useOITs(searchQuery);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        oitFile: null as File | null,
        quotationFile: null as File | null,
    });

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'COMPLETED': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
            case 'IN_PROGRESS': return 'bg-amber-50 text-amber-700 border-amber-200';
            case 'PENDING': return 'bg-slate-50 text-slate-700 border-slate-200';
            case 'ANALYZING': return 'bg-blue-50 text-blue-700 border-blue-200';
            case 'REVIEW_REQUIRED': return 'bg-orange-50 text-orange-700 border-orange-200';
            case 'ERROR': return 'bg-red-50 text-red-700 border-red-200';
            default: return 'bg-slate-50 text-slate-700 border-slate-200';
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'COMPLETED': return 'COMPLETADA';
            case 'IN_PROGRESS': return 'EN PROGRESO';
            case 'PENDING': return 'PENDIENTE';
            case 'ANALYZING': return 'ANALIZANDO';
            case 'REVIEW_REQUIRED': return 'REVISIÓN REQUERIDA';
            case 'ERROR': return 'ERROR';
            default: return status;
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'oit' | 'quotation') => {
        const file = e.target.files?.[0];
        if (file) {
            const validTypes = ['application/pdf', 'text/plain'];
            if (!validTypes.includes(file.type)) {
                toast.error('Solo se permiten archivos PDF o TXT');
                return;
            }
            setFormData(prev => ({
                ...prev,
                [type === 'oit' ? 'oitFile' : 'quotationFile']: file
            }));
        }
    };

    const handleCreateAsync = async () => {
        if (!formData.oitFile || !formData.quotationFile) {
            toast.error('Por favor sube ambos documentos (OIT y Cotización)');
            return;
        }

        setIsProcessing(true);
        const uploadData = new FormData();
        uploadData.append('oitFile', formData.oitFile);
        uploadData.append('quotationFile', formData.quotationFile);
        uploadData.append('description', 'Análisis en curso...');

        try {
            const response = await api.post('/oits/async', uploadData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            const createdOIT = response.data;
            toast.success('OIT creada. Iniciando análisis...');
            setIsDialogOpen(false);
            resetForm();
            navigate(`/oits/${createdOIT.id}`);
        } catch (error: any) {
            console.error('Error creating OIT:', error);
            toast.error(error.response?.data?.message || 'Error al crear OIT');
        } finally {
            setIsProcessing(false);
        }
    };

    const resetForm = () => {
        setFormData({ oitFile: null, quotationFile: null });
        setIsDialogOpen(false);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-slate-900">OITs</h2>
                    <p className="text-slate-500">Gestiona y rastrea registros de inspección.</p>
                </div>
                <Dialog open={isDialogOpen} onOpenChange={(open) => {
                    if (!open) resetForm();
                    setIsDialogOpen(open);
                }}>
                    <DialogTrigger asChild>
                        <Button className="bg-slate-900 hover:bg-slate-800 text-white">
                            <Plus className="mr-2 h-4 w-4" />
                            Nueva OIT
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[600px]">
                        <DialogHeader>
                            <DialogTitle>Subir Documentos OIT</DialogTitle>
                            <DialogDescription>
                                Sube el documento OIT y la cotización para iniciar el análisis automático.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="grid gap-6 py-6">
                            <div className="grid md:grid-cols-2 gap-4">
                                {/* OIT Document Card */}
                                <div className={`relative border-2 border-dashed rounded-lg p-6 transition-all ${formData.oitFile
                                    ? 'border-emerald-300 bg-emerald-50'
                                    : 'border-slate-300 bg-slate-50 hover:border-slate-400 hover:bg-white'
                                    }`}>
                                    <input
                                        id="oitFile"
                                        type="file"
                                        accept=".pdf,.txt"
                                        onChange={(e) => handleFileChange(e, 'oit')}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                    />
                                    <div className="flex flex-col items-center text-center pointer-events-none">
                                        {formData.oitFile ? (
                                            <>
                                                <CheckCircle2 className="h-12 w-12 text-emerald-600 mb-3" />
                                                <p className="font-semibold text-emerald-900 mb-1">Documento OIT</p>
                                                <p className="text-sm text-emerald-700 break-all px-2">{formData.oitFile.name}</p>
                                                <p className="text-xs text-emerald-600 mt-2">{(formData.oitFile.size / 1024 / 1024).toFixed(2)} MB</p>
                                            </>
                                        ) : (
                                            <>
                                                <Upload className="h-12 w-12 text-slate-400 mb-3" />
                                                <p className="font-semibold text-slate-700 mb-1">Documento OIT</p>
                                                <p className="text-sm text-slate-500">Click para subir PDF o TXT</p>
                                                <p className="text-xs text-slate-400 mt-2">Máx. 10MB</p>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* Quotation Document Card */}
                                <div className={`relative border-2 border-dashed rounded-lg p-6 transition-all ${formData.quotationFile
                                    ? 'border-emerald-300 bg-emerald-50'
                                    : 'border-slate-300 bg-slate-50 hover:border-slate-400 hover:bg-white'
                                    }`}>
                                    <input
                                        id="quotationFile"
                                        type="file"
                                        accept=".pdf,.txt"
                                        onChange={(e) => handleFileChange(e, 'quotation')}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                    />
                                    <div className="flex flex-col items-center text-center pointer-events-none">
                                        {formData.quotationFile ? (
                                            <>
                                                <CheckCircle2 className="h-12 w-12 text-emerald-600 mb-3" />
                                                <p className="font-semibold text-emerald-900 mb-1">Cotización</p>
                                                <p className="text-sm text-emerald-700 break-all px-2">{formData.quotationFile.name}</p>
                                                <p className="text-xs text-emerald-600 mt-2">{(formData.quotationFile.size / 1024 / 1024).toFixed(2)} MB</p>
                                            </>
                                        ) : (
                                            <>
                                                <Upload className="h-12 w-12 text-slate-400 mb-3" />
                                                <p className="font-semibold text-slate-700 mb-1">Cotización</p>
                                                <p className="text-sm text-slate-500">Click para subir PDF o TXT</p>
                                                <p className="text-xs text-slate-400 mt-2">Máx. 10MB</p>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
                                <div className="flex gap-3">
                                    <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-sm font-semibold text-blue-900 mb-1">Análisis Automático</p>
                                        <p className="text-sm text-blue-800">
                                            Al crear la OIT, la IA analizará los documentos en segundo plano para extraer información y recursos. Podrás ver el progreso en la vista de detalle.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={resetForm}>Cancelar</Button>
                            <Button
                                onClick={handleCreateAsync}
                                disabled={isProcessing || !formData.oitFile || !formData.quotationFile}
                                className="bg-slate-900 hover:bg-slate-800"
                            >
                                {isProcessing ? 'Creando...' : 'Crear OIT'}
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
                                placeholder="Filtrar OITs..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 bg-slate-50 border-slate-200 focus:bg-white transition-colors"
                            />
                        </div>
                        <Button variant="outline" size="sm" className="text-slate-600 border-slate-200">
                            <Filter className="mr-2 h-3.5 w-3.5" />
                            Filtrar
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="divide-y divide-slate-100">
                        {isLoading ? (
                            <div className="p-4 space-y-4">
                                {[...Array(3)].map((_, i) => (
                                    <div key={i} className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <Skeleton className="h-9 w-9 rounded-full" />
                                            <div className="space-y-2">
                                                <Skeleton className="h-4 w-[200px]" />
                                                <Skeleton className="h-3 w-[150px]" />
                                            </div>
                                        </div>
                                        <Skeleton className="h-6 w-[100px]" />
                                    </div>
                                ))}
                            </div>
                        ) : error ? (
                            <div className="text-center py-12 text-red-600">{error}</div>
                        ) : oits.length === 0 ? (
                            <div className="text-center py-12 text-slate-500">No se encontraron OITs</div>
                        ) : (
                            oits.map((oit) => (
                                <div
                                    key={oit.id}
                                    className="flex items-center justify-between p-4 hover:bg-slate-50/50 transition-colors cursor-pointer group"
                                    onClick={() => navigate(`/oits/${oit.id}`)}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="h-9 w-9 rounded-full bg-slate-100 flex items-center justify-center group-hover:bg-white group-hover:shadow-sm transition-all">
                                            <FileText className="h-4 w-4 text-slate-500 group-hover:text-slate-900" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-slate-900">{oit.oitNumber || `OIT-${oit.id.slice(0, 8)}`}</p>
                                            <p className="text-xs text-slate-500">{oit.description || 'Sin descripción'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-6">
                                        <span className="text-xs text-slate-400 font-mono">
                                            {new Date(oit.createdAt).toLocaleDateString()}
                                        </span>
                                        <div className={`px-2.5 py-0.5 rounded-full text-[10px] font-medium border ${getStatusColor(oit.status)}`}>
                                            {getStatusLabel(oit.status)}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
