import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import api from '@/lib/api';
import { CheckCircle2, AlertCircle, Loader2, FileText, Calendar, Beaker, FileBarChart, Clock, Hash, Users, Download, MoreVertical, RefreshCcw, Sparkles, MapPin } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { SamplingExecutor } from '@/components/sampling/SamplingExecutor';
import { SamplingStep } from '@/components/SamplingStep';
import { FileDown } from 'lucide-react';
import { ReportGenerator } from '@/components/oit/ReportGenerator';

export default function OITDetailPage() {
    const { id } = useParams<{ id: string }>();
    const [oit, setOit] = useState<any>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isManualScheduling, setIsManualScheduling] = useState(false);
    const [stepValidations, setStepValidations] = useState<any>({});
    const [finalAnalysis, setFinalAnalysis] = useState<string | null>(null);

    // Polling for status updates
    useEffect(() => {
        if (!id) return;

        let intervalId: ReturnType<typeof setInterval>;

        const fetchOIT = async () => {
            try {
                const response = await api.get(`/oits/${id}`);
                setOit(response.data);

                // Load validations and analysis
                if (response.data.stepValidations) {
                    setStepValidations(JSON.parse(response.data.stepValidations));
                }
                if (response.data.finalAnalysis) {
                    setFinalAnalysis(response.data.finalAnalysis);
                }

                if (response.data.status !== 'ANALYZING' && response.data.status !== 'UPLOADING') {
                    clearInterval(intervalId);
                }
            } catch (error) {
                console.error('Error fetching OIT:', error);
            }
        };

        fetchOIT();

        intervalId = setInterval(() => {
            if (oit && (oit.status === 'ANALYZING' || oit.status === 'UPLOADING')) {
                fetchOIT();
            }
        }, 3000);

        return () => clearInterval(intervalId);
    }, [id, oit?.status]);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, type: 'oit' | 'quotation') => {
        const file = e.target.files?.[0];
        if (!file || !id) return;

        if (file.type === 'application/pdf') {
            setIsProcessing(true);
            try {
                const formData = new FormData();
                formData.append(type === 'oit' ? 'oitFile' : 'quotationFile', file);
                await api.patch(`/oits/${id}`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });
                toast.success(`${type === 'oit' ? 'Documento OIT' : 'Cotización'} actualizado`);
                const response = await api.get(`/oits/${id}`);
                setOit(response.data);
            } catch (error) {
                console.error('Error updating file:', error);
                toast.error('Error al actualizar archivo');
            } finally {
                setIsProcessing(false);
                // Reset input
                e.target.value = '';
            }
        }
    };

    const handleDownload = async (fileUrl: string, filename: string) => {
        try {
            const extractedFilename = fileUrl.split('/').pop()?.split('\\').pop() || filename;
            const response = await api.get(`/files/download/${extractedFilename}`, {
                responseType: 'blob'
            });

            // Create blob link to download
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', extractedFilename);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);

            toast.success('Descarga iniciada');
        } catch (error) {
            console.error('Error downloading file:', error);
            toast.error('Error al descargar archivo');
        }
    };

    const handleCheckCompliance = async () => {
        try {
            setIsProcessing(true);
            toast.info('Iniciando verificación de normativa con IA...');
            const response = await api.post(`/oits/${id}/compliance`);
            const result = response.data;

            if (result.compliant) {
                toast.success(`Cumple con la normativa (Score: ${result.score}/100)`);
            } else {
                toast.warning(`No cumple con la normativa (Score: ${result.score}/100)`);
            }

            // Refresh OIT data to show new notification/status if any
            const oitResponse = await api.get(`/oits/${id}`);
            setOit(oitResponse.data);
        } catch (error) {
            console.error('Error checking compliance:', error);
            toast.error('Error al verificar cumplimiento');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleFinalizeSampling = async () => {
        if (!id) return;
        try {
            setIsProcessing(true);
            const response = await api.post(`/oits/${id}/finalize-sampling`);
            setFinalAnalysis(response.data.analysis);
            toast.success('Muestreo finalizado y análisis generado');

            // Refresh OIT
            const oitRes = await api.get(`/oits/${id}`);
            setOit(oitRes.data);
        } catch (error) {
            console.error('Error finalizing:', error);
            toast.error('Error al finalizar el muestreo');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDownloadReport = async () => {
        if (!id) return;
        try {
            const response = await api.get(`/oits/${id}/sampling-report`, {
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Informe_Muestreo_${oit.oitNumber}.html`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            toast.success('Informe descargado');
        } catch (error) {
            console.error('Error downloading report:', error);
            toast.error('Error al descargar el informe');
        }
    };

    if (!oit) return <div className="flex items-center justify-center min-h-screen bg-slate-50"><Loader2 className="h-8 w-8 animate-spin text-slate-400" /></div>;

    const aiData = oit.aiData ? JSON.parse(oit.aiData) : null;
    const resources = oit.resources ? JSON.parse(oit.resources) : [];

    return (
        <div className="min-h-screen bg-slate-50/50 pb-12">
            {/* Header Section */}
            <div className="bg-slate-50/50 border-b border-slate-200">
                <div className="container mx-auto py-6">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <div className="flex items-center gap-3 mb-1">
                                <h1 className="text-3xl font-bold tracking-tight text-slate-900 font-display">
                                    {oit.oitNumber || `OIT #${oit.id.slice(0, 8)}`}
                                </h1>
                                <Badge variant={oit.status === 'ANALYZING' ? 'secondary' : 'default'} className="text-xs px-2.5 py-0.5 font-medium">
                                    {oit.status === 'ANALYZING' && <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />}
                                    {oit.status}
                                </Badge>
                            </div>
                            <p className="text-slate-500 text-sm max-w-2xl truncate">
                                {oit.status === 'ANALYZING' ? 'Análisis en curso...' : (oit.description || 'Sin descripción')}
                            </p>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-slate-500">
                            <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-full">
                                <Clock className="h-3.5 w-3.5" />
                                <span>{new Date(oit.createdAt).toLocaleDateString()}</span>
                            </div>
                            <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-full">
                                <Hash className="h-3.5 w-3.5" />
                                <span className="font-mono">{oit.id.slice(0, 8)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="container mx-auto py-8 space-y-8">
                {/* Analysis Alert */}
                {oit.status === 'ANALYZING' && (
                    <div className="bg-blue-50/80 backdrop-blur-sm border border-blue-200 rounded-xl p-6 flex items-center gap-4 shadow-sm">
                        <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
                        </div>
                        <div>
                            <p className="font-semibold text-blue-900">Analizando documentos...</p>
                            <p className="text-sm text-blue-700 mt-0.5">La IA está extrayendo información y recursos. Esto puede tomar unos momentos.</p>
                        </div>
                    </div>
                )}

                <Tabs defaultValue="info" className="w-full">
                    <div className="flex justify-center mb-8">
                        <TabsList className="grid w-full max-w-2xl grid-cols-4 bg-white p-1 rounded-full border border-slate-200 shadow-sm">
                            <TabsTrigger value="info" className="rounded-full data-[state=active]:bg-slate-900 data-[state=active]:text-white transition-all">
                                <FileText className="mr-2 h-4 w-4" /> Info
                            </TabsTrigger>
                            <TabsTrigger value="scheduling" className="rounded-full data-[state=active]:bg-slate-900 data-[state=active]:text-white transition-all">
                                <Calendar className="mr-2 h-4 w-4" /> Agendamiento
                            </TabsTrigger>
                            <TabsTrigger value="sampling" className="rounded-full data-[state=active]:bg-slate-900 data-[state=active]:text-white transition-all">
                                <Beaker className="mr-2 h-4 w-4" /> Muestreo
                            </TabsTrigger>
                            <TabsTrigger value="report" className="rounded-full data-[state=active]:bg-slate-900 data-[state=active]:text-white transition-all">
                                <FileBarChart className="mr-2 h-4 w-4" /> Informe
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    <TabsContent value="info" className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="grid md:grid-cols-3 gap-6">
                            {/* Main Info Card */}
                            <Card className="md:col-span-2 border-slate-200 shadow-sm bg-white/50 backdrop-blur-sm">
                                <CardHeader>
                                    <CardTitle>Información General</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="space-y-1">
                                            <strong className="text-xs font-semibold uppercase tracking-wider text-slate-500">Número OIT</strong>
                                            <p className="text-lg font-medium text-slate-900">{oit.oitNumber}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <strong className="text-xs font-semibold uppercase tracking-wider text-slate-500">Estado</strong>
                                            <p className="text-lg font-medium text-slate-900">{oit.status}</p>
                                        </div>
                                        <div className="col-span-2 space-y-1">
                                            <strong className="text-xs font-semibold uppercase tracking-wider text-slate-500">Descripción</strong>
                                            <p className="text-slate-700 leading-relaxed">{oit.description}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4 pt-6 border-t border-slate-100">
                                        <div className="flex-1 p-3 bg-slate-50 rounded-lg border border-slate-100 flex items-center justify-between group hover:border-slate-300 transition-colors">
                                            <div>
                                                <strong className="block text-xs font-semibold text-slate-500 mb-1">Documento OIT</strong>
                                                <span className="text-sm text-slate-700 truncate block max-w-[150px]">
                                                    {oit.oitFileUrl ? 'Archivo cargado' : 'No disponible'}
                                                </span>
                                            </div>
                                            {oit.oitFileUrl && (
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                                                            <MoreVertical className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem onClick={() => handleDownload(oit.oitFileUrl, 'documento-oit.pdf')}>
                                                            <Download className="mr-2 h-4 w-4" />
                                                            Descargar
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => document.getElementById('oitFileInput')?.click()}>
                                                            <RefreshCcw className="mr-2 h-4 w-4" />
                                                            Reemplazar
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            )}
                                        </div>
                                        <div className="flex-1 p-3 bg-slate-50 rounded-lg border border-slate-100 flex items-center justify-between group hover:border-slate-300 transition-colors">
                                            <div>
                                                <strong className="block text-xs font-semibold text-slate-500 mb-1">Cotización</strong>
                                                <span className="text-sm text-slate-700 truncate block max-w-[150px]">
                                                    {oit.quotationFileUrl ? 'Archivo cargado' : 'No disponible'}
                                                </span>
                                            </div>
                                            {oit.quotationFileUrl && (
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                                                            <MoreVertical className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem onClick={() => handleDownload(oit.quotationFileUrl, 'cotizacion.pdf')}>
                                                            <Download className="mr-2 h-4 w-4" />
                                                            Descargar
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => document.getElementById('quotationFileInput')?.click()}>
                                                            <RefreshCcw className="mr-2 h-4 w-4" />
                                                            Reemplazar
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            )}
                                        </div>
                                    </div>
                                    {/* Hidden file inputs */}
                                    <input type="file" id="oitFileInput" accept=".pdf" onChange={(e) => handleFileChange(e, 'oit')} className="hidden" />
                                    <input type="file" id="quotationFileInput" accept=".pdf" onChange={(e) => handleFileChange(e, 'quotation')} className="hidden" />
                                </CardContent>
                            </Card>

                            {/* AI Analysis Card */}
                            <Card className="border-slate-200 shadow-sm bg-white/50 backdrop-blur-sm h-fit">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        Análisis IA
                                        {aiData && (aiData.valid ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <AlertCircle className="h-4 w-4 text-red-500" />)}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {aiData ? (
                                        <div className="space-y-4">
                                            <div className={`p-4 rounded-lg text-sm border ${aiData.valid ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 'bg-red-50 border-red-100 text-red-800'}`}>
                                                {aiData.message}
                                            </div>

                                            {/* Detailed Analysis Info */}
                                            {aiData.valid && aiData.data && (
                                                <div className="space-y-3 pt-2">
                                                    {aiData.data.templateName && (
                                                        <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                                                            <Beaker className="h-5 w-5 text-indigo-600 mt-0.5" />
                                                            <div className="flex-1">
                                                                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Plantilla Seleccionada</p>
                                                                <p className="text-sm font-medium text-slate-900 mt-1">{aiData.data.templateName}</p>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {aiData.data.estimatedDuration && (
                                                        <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                                                            <Clock className="h-5 w-5 text-indigo-600 mt-0.5" />
                                                            <div className="flex-1">
                                                                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Duración Estimada</p>
                                                                <p className="text-sm font-medium text-slate-900 mt-1">{aiData.data.estimatedDuration}</p>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {aiData.data.steps && Array.isArray(aiData.data.steps) && (
                                                        <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                                                            <FileText className="h-5 w-5 text-indigo-600 mt-0.5" />
                                                            <div className="flex-1">
                                                                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pasos de Muestreo</p>
                                                                <p className="text-sm font-medium text-slate-900 mt-1">{aiData.data.steps.length} pasos identificados</p>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {aiData.data.assignedResources && Array.isArray(aiData.data.assignedResources) && aiData.data.assignedResources.length > 0 && (
                                                        <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                                                            <Users className="h-5 w-5 text-indigo-600 mt-0.5" />
                                                            <div className="flex-1">
                                                                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Recursos Asignados</p>
                                                                <p className="text-sm font-medium text-slate-900 mt-1">{aiData.data.assignedResources.length} recursos propuestos</p>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {aiData.errors?.length > 0 && (
                                                <div className="space-y-2">
                                                    <p className="text-xs font-semibold text-red-700 uppercase tracking-wider">Errores Detectados</p>
                                                    <ul className="space-y-1">
                                                        {aiData.errors.map((e: string, i: number) => (
                                                            <li key={i} className="text-xs text-red-600 flex items-start gap-2">
                                                                <span className="mt-0.5 block h-1 w-1 rounded-full bg-red-400 flex-shrink-0" />
                                                                {e}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="text-center py-8 text-slate-400">
                                            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3" />
                                            <p className="text-sm">Esperando análisis...</p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    <TabsContent value="scheduling" className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <>
                            <Card className="border-slate-200 shadow-sm bg-white/50 backdrop-blur-sm">
                                <CardHeader>
                                    <CardTitle>Programación de Visita</CardTitle>
                                    <CardDescription>Define la fecha y hora para la toma de muestras.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {/* AI Proposal Section */}
                                    {aiData?.data?.proposedDate && !isManualScheduling && !oit.scheduledDate ? (
                                        <div className="p-6 bg-indigo-50 border border-indigo-100 rounded-xl animate-in fade-in slide-in-from-top-2">
                                            <div className="flex items-start gap-4">
                                                <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                                                    <Sparkles className="h-5 w-5 text-indigo-600" />
                                                </div>
                                                <div className="flex-1 space-y-3">
                                                    <div>
                                                        <h4 className="text-base font-semibold text-indigo-900">Propuesta de Agendamiento IA</h4>
                                                        <p className="text-sm text-indigo-700 mt-1">
                                                            Basado en el análisis de documentos, se sugiere la siguiente fecha:
                                                        </p>
                                                    </div>

                                                    <div className="flex items-center gap-3 p-3 bg-white/60 rounded-lg border border-indigo-100 w-fit">
                                                        <Calendar className="h-5 w-5 text-indigo-600" />
                                                        <span className="text-lg font-semibold text-indigo-900">
                                                            {new Date(aiData.data.proposedDate).toLocaleDateString()}
                                                        </span>
                                                        {aiData.data.proposedTime && (
                                                            <>
                                                                <span className="text-indigo-300">|</span>
                                                                <Clock className="h-5 w-5 text-indigo-600" />
                                                                <span className="text-lg font-semibold text-indigo-900">
                                                                    {aiData.data.proposedTime}
                                                                </span>
                                                            </>
                                                        )}
                                                    </div>

                                                    {oit.location && (
                                                        <div className="flex items-start gap-3 p-3 bg-white/60 rounded-lg border border-indigo-100 mt-2">
                                                            <MapPin className="h-5 w-5 text-indigo-600 mt-0.5" />
                                                            <div>
                                                                <p className="text-xs font-medium text-indigo-700 uppercase tracking-wider">Ubicación</p>
                                                                <p className="text-sm text-slate-900 mt-0.5">{oit.location}</p>
                                                            </div>
                                                        </div>
                                                    )}

                                                    <div className="flex items-center gap-3 pt-2">
                                                        <Button
                                                            className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
                                                            onClick={async () => {
                                                                const dateStr = aiData.data.proposedDate;
                                                                const timeStr = aiData.data.proposedTime || '09:00';
                                                                const fullDate = new Date(`${dateStr}T${timeStr}`);

                                                                try {
                                                                    // Call accept-planning endpoint to update resources
                                                                    await api.post(`/oits/${id}/accept-planning`, {
                                                                        templateId: aiData.data.templateId
                                                                    });

                                                                    // Then update scheduled date
                                                                    await api.patch(`/oits/${id}`, {
                                                                        scheduledDate: fullDate.toISOString()
                                                                    });

                                                                    toast.success('Propuesta aceptada. Recursos asignados.');
                                                                    const response = await api.get(`/oits/${id}`);
                                                                    setOit(response.data);
                                                                } catch (error) {
                                                                    console.error('Error accepting planning:', error);
                                                                    toast.error('Error al aceptar propuesta');
                                                                }
                                                            }}
                                                        >
                                                            <CheckCircle2 className="mr-2 h-4 w-4" />
                                                            Aceptar Propuesta
                                                        </Button>
                                                        <Button
                                                            variant="outline"
                                                            className="border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                                                            onClick={() => setIsManualScheduling(true)}
                                                        >
                                                            Modificar Manualmente
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-6 animate-in fade-in">
                                            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                                                <div>
                                                    <h4 className="text-sm font-semibold text-slate-900 mb-4">Programar Fecha y Hora</h4>
                                                    <div className="grid md:grid-cols-2 gap-4">
                                                        {/* Date Input */}
                                                        <div className="space-y-2">
                                                            <label className="text-xs font-medium text-slate-600 uppercase tracking-wider">Fecha</label>
                                                            <div className="relative">
                                                                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                                                                <input
                                                                    type="date"
                                                                    className="w-full pl-10 h-11 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:border-transparent transition-all"
                                                                    value={oit.scheduledDate ? new Date(oit.scheduledDate).toISOString().split('T')[0] : ''}
                                                                    onChange={async (e) => {
                                                                        const currentDate = oit.scheduledDate ? new Date(oit.scheduledDate) : new Date();
                                                                        const newDate = new Date(e.target.value);
                                                                        newDate.setHours(currentDate.getHours(), currentDate.getMinutes());

                                                                        try {
                                                                            await api.patch(`/oits/${id}`, { scheduledDate: newDate.toISOString(), status: 'SCHEDULED' });
                                                                            toast.success('Fecha actualizada');
                                                                            const response = await api.get(`/oits/${id}`);
                                                                            setOit(response.data);
                                                                        } catch (error) {
                                                                            toast.error('Error al actualizar fecha');
                                                                        }
                                                                    }}
                                                                />
                                                            </div>
                                                        </div>

                                                        {/* Time Input */}
                                                        <div className="space-y-2">
                                                            <label className="text-xs font-medium text-slate-600 uppercase tracking-wider">Hora</label>
                                                            <div className="relative">
                                                                <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                                                                <input
                                                                    type="time"
                                                                    className="w-full pl-10 h-11 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:border-transparent transition-all"
                                                                    value={oit.scheduledDate ? new Date(oit.scheduledDate).toTimeString().slice(0, 5) : '09:00'}
                                                                    onChange={async (e) => {
                                                                        const currentDate = oit.scheduledDate ? new Date(oit.scheduledDate) : new Date();
                                                                        const [hours, minutes] = e.target.value.split(':');
                                                                        currentDate.setHours(parseInt(hours), parseInt(minutes));

                                                                        try {
                                                                            await api.patch(`/oits/${id}`, { scheduledDate: currentDate.toISOString(), status: 'SCHEDULED' });
                                                                            toast.success('Hora actualizada');
                                                                            const response = await api.get(`/oits/${id}`);
                                                                            setOit(response.data);
                                                                        } catch (error) {
                                                                            toast.error('Error al actualizar hora');
                                                                        }
                                                                    }}
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <p className="text-xs text-slate-500 mt-3">
                                                        Selecciona la fecha y hora para la visita de muestreo.
                                                    </p>
                                                </div>

                                                {aiData?.data?.proposedDate && (
                                                    <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <Sparkles className="h-4 w-4 text-indigo-600" />
                                                            <span className="text-sm font-medium text-indigo-900">Sugerencia de IA</span>
                                                        </div>
                                                        <p className="text-sm text-indigo-700">
                                                            {new Date(aiData.data.proposedDate).toLocaleDateString('es-ES', {
                                                                weekday: 'long',
                                                                year: 'numeric',
                                                                month: 'long',
                                                                day: 'numeric'
                                                            })} a las {aiData.data.proposedTime || '09:00'}
                                                        </p>
                                                        <Button
                                                            variant="link"
                                                            className="h-auto p-0 text-indigo-600 text-sm mt-1"
                                                            onClick={() => setIsManualScheduling(false)}
                                                        >
                                                            ← Volver a la propuesta
                                                        </Button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            <Card className="border-slate-200 shadow-sm bg-white/50 backdrop-blur-sm">
                                <CardHeader>
                                    <CardTitle>Recursos</CardTitle>
                                    <CardDescription>Personal y equipos identificados y propuestos para el muestreo.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    {/* AI Proposed Resources */}
                                    {aiData?.data?.assignedResources && aiData.data.assignedResources.length > 0 && (
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-2">
                                                <Sparkles className="h-4 w-4 text-indigo-600" />
                                                <h4 className="text-sm font-semibold text-indigo-900">Recursos Propuestos por IA</h4>
                                            </div>
                                            <div className="grid md:grid-cols-2 gap-4">
                                                {aiData.data.assignedResources.map((res: any, idx: number) => (
                                                    <div key={idx} className="flex items-center justify-between p-4 bg-indigo-50/50 rounded-xl border border-indigo-100 shadow-sm">
                                                        <div className="flex items-center gap-3">
                                                            <div className={`h-10 w-10 rounded-full flex items-center justify-center ${res.type === 'PERSONNEL' ? 'bg-indigo-100 text-indigo-700' : 'bg-amber-100 text-amber-700'}`}>
                                                                {res.type === 'PERSONNEL' ? <Users className="h-5 w-5" /> : <Beaker className="h-5 w-5" />}
                                                            </div>
                                                            <div>
                                                                <p className="font-medium text-slate-900">{res.name}</p>
                                                                <p className="text-xs text-slate-500">{res.type === 'PERSONNEL' ? 'Personal Técnico' : 'Equipo / Material'}</p>
                                                            </div>
                                                        </div>
                                                        {res.quantity && (
                                                            <Badge variant="outline" className="bg-white">x{res.quantity}</Badge>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Document Extracted Resources */}
                                    {resources.length > 0 && (
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-2">
                                                <FileText className="h-4 w-4 text-slate-600" />
                                                <h4 className="text-sm font-semibold text-slate-700">Recursos Extraídos de Documentos</h4>
                                            </div>
                                            <div className="grid md:grid-cols-2 gap-4">
                                                {resources.map((res: any, idx: number) => (
                                                    <div key={idx} className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-all">
                                                        <div className="flex items-center gap-3">
                                                            <div className={`h-10 w-10 rounded-full flex items-center justify-center ${res.type === 'PERSONNEL' ? 'bg-slate-100 text-slate-600' : 'bg-slate-100 text-slate-600'}`}>
                                                                {res.type === 'PERSONNEL' ? <Users className="h-5 w-5" /> : <Beaker className="h-5 w-5" />}
                                                            </div>
                                                            <div>
                                                                <p className="font-medium text-slate-900">{typeof res === 'string' ? res : res.name}</p>
                                                                <p className="text-xs text-slate-500">{res.type === 'PERSONNEL' ? 'Personal Técnico' : 'Equipo / Material'}</p>
                                                            </div>
                                                        </div>
                                                        {typeof res !== 'string' && res.quantity && (
                                                            <Badge variant="outline" className="bg-slate-50">x{res.quantity}</Badge>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* No resources */}
                                    {(!resources || resources.length === 0) && (!aiData?.data?.assignedResources || aiData.data.assignedResources.length === 0) && (
                                        <div className="text-center py-12 text-slate-400">
                                            <p>No se han identificado recursos.</p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </>
                    </TabsContent>

                    <TabsContent value="sampling" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {(() => {
                            // Check if planning has been accepted
                            if (!oit.planningAccepted) {
                                return (
                                    <Card className="border-slate-200 shadow-sm bg-white/50 backdrop-blur-sm">
                                        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                                            <div className="h-16 w-16 bg-amber-50 rounded-full flex items-center justify-center mb-4">
                                                <Calendar className="h-8 w-8 text-amber-500" />
                                            </div>
                                            <h3 className="text-lg font-semibold text-slate-900">Planeación Pendiente</h3>
                                            <p className="text-slate-500 max-w-md mt-2">
                                                Debes aceptar la propuesta de planeación en la pestaña "Agendamiento" antes de iniciar el muestreo.
                                            </p>
                                        </CardContent>
                                    </Card>
                                );
                            }

                            // Check if template is selected
                            if (!oit.selectedTemplateId) {
                                return (
                                    <Card className="border-slate-200 shadow-sm bg-white/50 backdrop-blur-sm">
                                        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                                            <div className="h-16 w-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                                                <Beaker className="h-8 w-8 text-slate-400" />
                                            </div>
                                            <h3 className="text-lg font-semibold text-slate-900">Plantilla no seleccionada</h3>
                                            <p className="text-slate-500 max-w-md mt-2">
                                                No hay una plantilla de muestreo asociada a este OIT.
                                            </p>
                                        </CardContent>
                                    </Card>
                                );
                            }

                            return (
                                <div className="space-y-6">
                                    <Card className="border-indigo-200 bg-indigo-50/50">
                                        <CardContent className="pt-6">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                                                    <Sparkles className="h-5 w-5 text-indigo-600" />
                                                </div>
                                                <div>
                                                    <h4 className="font-semibold text-indigo-900">Muestreo Validado por IA</h4>
                                                    <p className="text-sm text-indigo-700">Completa cada paso secuencialmente. La IA validará tus datos.</p>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    <div className="space-y-4">
                                        {aiData?.data?.steps?.map((step: any, index: number) => {
                                            const isLocked = index > 0 && !stepValidations[index - 1]?.validated;
                                            return (
                                                <SamplingStep
                                                    key={index}
                                                    oitId={id!}
                                                    step={step}
                                                    stepIndex={index}
                                                    isLocked={isLocked}
                                                    validation={stepValidations[index]}
                                                    onValidationComplete={async () => {
                                                        const response = await api.get(`/oits/${id}`);
                                                        setOit(response.data);
                                                        if (response.data.stepValidations) {
                                                            setStepValidations(JSON.parse(response.data.stepValidations));
                                                        }
                                                    }}
                                                />
                                            );
                                        })}
                                    </div>

                                    {/* Final Actions */}
                                    <div className="flex flex-col items-center gap-4 py-6">
                                        {!finalAnalysis && aiData?.data?.steps?.length > 0 &&
                                            Object.keys(stepValidations).length >= aiData?.data?.steps?.length &&
                                            Object.values(stepValidations).every((v: any) => v.validated) && (
                                                <Button
                                                    size="lg"
                                                    onClick={handleFinalizeSampling}
                                                    disabled={isProcessing}
                                                    className="bg-green-600 hover:bg-green-700"
                                                >
                                                    {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-5 w-5" />}
                                                    Finalizar Muestreo y Generar Análisis
                                                </Button>
                                            )}

                                        {finalAnalysis && (
                                            <div className="w-full space-y-6 animate-in fade-in">
                                                <Card className="bg-slate-900 text-slate-50 border-slate-800">
                                                    <CardHeader>
                                                        <div className="flex items-center gap-2">
                                                            <Sparkles className="text-indigo-400" />
                                                            <CardTitle className="text-xl">Análisis Final de IA</CardTitle>
                                                        </div>
                                                    </CardHeader>
                                                    <CardContent>
                                                        <div className="prose prose-invert max-w-none">
                                                            <pre className="whitespace-pre-wrap font-sans text-sm text-slate-300">
                                                                {finalAnalysis}
                                                            </pre>
                                                        </div>
                                                    </CardContent>
                                                </Card>

                                                <div className="flex justify-center">
                                                    <Button size="lg" onClick={handleDownloadReport} className="shadow-lg">
                                                        <FileDown className="mr-2 h-5 w-5" />
                                                        Descargar Informe PDF
                                                    </Button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })()}
                    </TabsContent>

                    <TabsContent value="report" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <ReportGenerator oitId={id!} />
                    </TabsContent>
                </Tabs>
            </div>
        </div >
    );
}
