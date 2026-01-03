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
import { SamplingStep } from '@/components/SamplingStep';
import { FileDown } from 'lucide-react';
import { Plus, X } from 'lucide-react';
import { ReportGenerator } from '@/components/oit/ReportGenerator';
import {
    DropdownMenuLabel,
    DropdownMenuCheckboxItem
} from "@/components/ui/dropdown-menu";
import { useAuthStore } from '@/features/auth/authStore';

export default function OITDetailPage() {
    const { id } = useParams<{ id: string }>();
    const [oit, setOit] = useState<any>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isManualScheduling, setIsManualScheduling] = useState(false);
    const [stepValidations, setStepValidations] = useState<any>({});
    const [finalAnalysis, setFinalAnalysis] = useState<string | null>(null);
    const [templateSteps, setTemplateSteps] = useState<any[]>([]);
    const [isLocationVerified, setIsLocationVerified] = useState(false);
    const [verificationMsg, setVerificationMsg] = useState('');

    // Engineer Scheduling State
    const [availableEngineers, setAvailableEngineers] = useState<any[]>([]);
    const [selectedEngineerIds, setSelectedEngineerIds] = useState<string[]>([]);
    const [isEditingSchedule, setIsEditingSchedule] = useState(false);

    // Auth for permissions
    const { user } = useAuthStore();

    // Polling for status updates
    useEffect(() => {
        if (!id) return;

        let intervalId: ReturnType<typeof setInterval>;

        const fetchOIT = async () => {
            try {
                // Add cache buster
                const response = await api.get(`/oits/${id}?_t=${Date.now()}`);

                // Only update if data changed (deep comparison/string check would be better but this is ok)
                setOit((prev: any) => {
                    const newData = response.data;

                    // Sync loaded engineers
                    if (newData.engineers && newData.engineers.length > 0) {
                        setSelectedEngineerIds(newData.engineers.map((e: any) => e.id));
                    }

                    if (JSON.stringify(prev) !== JSON.stringify(newData)) {
                        return newData;
                    }
                    return prev;
                });

                // Load validations and analysis
                if (response.data.stepValidations) {
                    setStepValidations(JSON.parse(response.data.stepValidations));
                }
                if (response.data.finalAnalysis) {
                    setFinalAnalysis(response.data.finalAnalysis);
                }

                // Load template steps if available (handle multiple or single legacy)
                if (response.data.selectedTemplateIds || response.data.selectedTemplateId) {
                    try {
                        let allSteps: any[] = [];

                        // Parse IDs
                        let ids: string[] = [];
                        if (response.data.selectedTemplateIds) {
                            try {
                                ids = JSON.parse(response.data.selectedTemplateIds);
                            } catch (e) { console.error('Error parsing template IDs', e); }
                        } else if (response.data.selectedTemplateId) {
                            ids = [response.data.selectedTemplateId];
                        }

                        // Fetch all templates sequentially (or parallel promise.all)
                        const templatePromises = ids.map(tid => api.get(`/sampling-templates/${tid}`));
                        const templateResponses = await Promise.all(templatePromises);

                        templateResponses.forEach(templateRes => {
                            if (templateRes.data.steps) {
                                try {
                                    const parsedSteps = JSON.parse(templateRes.data.steps);
                                    allSteps = [...allSteps, ...parsedSteps];
                                } catch (e) {
                                    console.error('Error parsing steps for template', templateRes.data.id, e);
                                }
                            }
                        });


                        // Re-sort steps if needed or keep sequence? 
                        // For now, we assume they are appended. Or we could sort by a global order if defined.
                        // Let's just re-index them to ensure unique IDs locally if needed, or rely on logic inside Wizard.
                        // Assuming simple append for now.
                        setTemplateSteps(allSteps);
                    } catch (err) {
                        console.error('Error fetching templates:', err);
                    }
                }

                if (response.data.status !== 'ANALYZING' && response.data.status !== 'UPLOADING') {
                    if (intervalId) clearInterval(intervalId);
                }
            } catch (error) {
                console.error('Error fetching OIT:', error);
            }
        };

        // If status is analyzing, start polling
        if (oit?.status === 'ANALYZING' || oit?.status === 'UPLOADING' || !oit) {
            fetchOIT(); // Initial fetch
            intervalId = setInterval(fetchOIT, 3000);
        } else {
            // Just fetch once to ensure fresh data if we just mounted or status changed
            fetchOIT();
        }

        return () => {
            if (intervalId) clearInterval(intervalId);
        };
    }, [id, oit?.status]);

    // Load Local Storage on mount
    useEffect(() => {
        if (id) {
            const saved = localStorage.getItem(`sampling_session_${id}`);
            if (saved) {
                try {
                    const parsed = JSON.parse(saved);
                    setStepValidations(parsed);
                    // toast.info('Datos de muestreo recuperados localmente');
                } catch (e) {
                    console.error('Error loading local sampling data', e);
                }
            }
        }
    }, [id]);

    // Fetch engineers
    useEffect(() => {
        const loadEngineers = async () => {
            try {
                // Use dedicated engineers endpoint which includes assignments
                const res = await api.get('/users/engineers');
                setAvailableEngineers(res.data);
            } catch (error) {
                console.error('Error fetching engineers', error);
                // Fallback to /users if /engineers fails (backwards compatibility)
                try {
                    const fallbackRes = await api.get('/users');
                    const engineers = fallbackRes.data.filter((u: any) => u.role === 'ENGINEER' || u.role === 'ADMIN' || u.role === 'SUPER_ADMIN');
                    setAvailableEngineers(engineers);
                } catch (e) {
                    console.error('Fallback failed', e);
                }
            }
        };
        loadEngineers();
    }, []);

    // Helper to check if engineer is available on a specific date
    const isEngineerAvailable = (engineer: any, dateString: string) => {
        if (!dateString) return true;
        if (!engineer.assignedOITs || engineer.assignedOITs.length === 0) return true;

        const targetDate = new Date(dateString).toDateString();

        // Check if any assignment conflicts (same day)
        // Note: This is a simple day-check. Could be refined for time slots.
        const hasConflict = engineer.assignedOITs.some((assignment: any) => {
            if (!assignment.oit?.scheduledDate) return false;
            const assignmentDate = new Date(assignment.oit.scheduledDate).toDateString();
            // Only consider conflict if explicitly scheduled or in progress
            const isActive = ['SCHEDULED', 'IN_PROGRESS'].includes(assignment.oit.status);
            return isActive && assignmentDate === targetDate;
        });

        return !hasConflict;
    };

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



    const handleSaveStep = (data: any) => {
        // Update state
        const updatedValidations = {
            ...stepValidations,
            [data.stepIndex]: {
                validated: true,
                data: data,
                timestamp: new Date().toISOString()
            }
        };
        setStepValidations(updatedValidations);

        // Save to localStorage
        if (id) {
            localStorage.setItem(`sampling_session_${id}`, JSON.stringify(updatedValidations));
        }
    };

    const handleFinalizeSampling = async () => {
        if (!id) return;

        const isOffline = !navigator.onLine;

        if (isOffline) {
            toast.warning('Estás offline. Los datos se guardaron localmente y se enviarán cuando tengas conexión.');
            // We could just leave it pending in localStorage. 
            // The user will need to press "Finalize" again when online, or we implement auto-sync.
            // For now, simple manual retry.
            return;
        }

        try {
            setIsProcessing(true);

            // Prepare Payload
            const payload = {
                steps: templateSteps.map((s, i) => ({
                    description: s.description || s.title,
                    ...stepValidations[i]?.data
                })),
                completedAt: new Date(),
                location: isLocationVerified ? oit.location : 'Ubicación no verificada'
            };

            const response = await api.post(`/oits/${id}/submit-sampling`, payload);

            toast.success(response.data.message || 'Muestreo enviado exitosamente');

            // Clear local storage
            localStorage.removeItem(`sampling_session_${id}`);

            // Refresh OIT
            const oitRes = await api.get(`/oits/${id}`);
            setOit(oitRes.data);
        } catch (error) {
            console.error('Error finalizing:', error);
            toast.error('Error al enviar el muestreo. Intenta nuevamente.');
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
            link.setAttribute('download', `Informe_Muestreo_${oit.oitNumber}.pdf`);
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

    const getStatusLabel = (status: string) => {
        const statusMap: Record<string, string> = {
            'PENDING': 'Pendiente',
            'IN_PROGRESS': 'En Progreso',
            'COMPLETED': 'Completada',
            'ANALYZING': 'Analizando',
            'SCHEDULED': 'Programada',
            'UPLOADING': 'Subiendo'
        };
        return statusMap[status] || status;
    };

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
                                    {getStatusLabel(oit.status)}
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
                        <TabsList className={`grid w-full ${user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN' ? 'max-w-2xl grid-cols-2 sm:grid-cols-4' : 'max-w-md grid-cols-2'} bg-white p-1 rounded-xl sm:rounded-full border border-slate-200 shadow-sm h-auto transition-all duration-300`}>
                            <TabsTrigger value="info" className="rounded-lg sm:rounded-full data-[state=active]:bg-slate-900 data-[state=active]:text-white transition-all">
                                <FileText className="mr-2 h-4 w-4" /> Info
                            </TabsTrigger>
                            {(user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') && (
                                <TabsTrigger value="scheduling" className="rounded-lg sm:rounded-full data-[state=active]:bg-slate-900 data-[state=active]:text-white transition-all">
                                    <Calendar className="mr-2 h-4 w-4" /> Agenda
                                </TabsTrigger>
                            )}
                            <TabsTrigger value="sampling" className="rounded-lg sm:rounded-full data-[state=active]:bg-slate-900 data-[state=active]:text-white transition-all">
                                <Beaker className="mr-2 h-4 w-4" /> Muestreo
                            </TabsTrigger>
                            {(user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') && (
                                <TabsTrigger value="report" className="rounded-lg sm:rounded-full data-[state=active]:bg-slate-900 data-[state=active]:text-white transition-all">
                                    <FileBarChart className="mr-2 h-4 w-4" /> Informe
                                </TabsTrigger>
                            )}
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
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                        <div className="space-y-1">
                                            <strong className="text-xs font-semibold uppercase tracking-wider text-slate-500">Número OIT</strong>
                                            <p className="text-lg font-medium text-slate-900">{oit.oitNumber}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <strong className="text-xs font-semibold uppercase tracking-wider text-slate-500">Estado</strong>
                                            <p className="text-lg font-medium text-slate-900">{getStatusLabel(oit.status)}</p>
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
                                    <CardTitle className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-2">
                                            Análisis IA
                                            {aiData && (aiData.valid ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <AlertCircle className="h-4 w-4 text-red-500" />)}
                                        </div>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-8 text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                                            disabled={isProcessing || oit.status === 'ANALYZING' || oit.status === 'UPLOADING'}
                                            onClick={async () => {
                                                try {
                                                    setIsProcessing(true);
                                                    toast.info('Iniciando re-análisis...');
                                                    await api.post(`/oits/${id}/reanalyze`);
                                                    toast.success('Análisis iniciado en segundo plano');

                                                    // Trigger manual fetch to update status to ANALYZING immediately
                                                    // And clear current aiData to show visual feedback
                                                    setOit((prev: any) => ({ ...prev, status: 'ANALYZING', aiData: null }));
                                                } catch (err) {
                                                    console.error(err);
                                                    toast.error('Error al solicitar análisis');
                                                } finally {
                                                    setIsProcessing(false);
                                                }
                                            }}
                                        >
                                            <RefreshCcw className={`mr-2 h-3.5 w-3.5 ${(isProcessing || oit.status === 'ANALYZING' || oit.status === 'UPLOADING') ? 'animate-spin' : ''}`} />
                                            Reiniciar Análisis
                                        </Button>
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

                                                    {/* AI Proposal Actions */}
                                                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
                                                        <Button
                                                            className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm w-full sm:w-auto"
                                                            onClick={async () => {
                                                                try {
                                                                    const dateStr = aiData.data.proposedDate;
                                                                    const timeStr = aiData.data.proposedTime || '09:00';

                                                                    // Validar que dateStr existe
                                                                    if (!dateStr) throw new Error("Fecha no disponible");

                                                                    // Intentar parsing básico
                                                                    let proposedDate = new Date(`${dateStr}T${timeStr}`);

                                                                    // Si falla, intentar solo fecha
                                                                    if (isNaN(proposedDate.getTime())) {
                                                                        proposedDate = new Date(dateStr);
                                                                    }

                                                                    // Si sigue fallando
                                                                    if (isNaN(proposedDate.getTime())) {
                                                                        console.error("Fecha inválida recibida:", dateStr);
                                                                        toast.error("Error al procesar la fecha propuesta. Por favor selecciónala manualmente.");
                                                                        setIsManualScheduling(true);
                                                                        return;
                                                                    }

                                                                    setOit((prev: any) => ({
                                                                        ...prev,
                                                                        scheduledDate: proposedDate.toISOString()
                                                                    }));

                                                                    toast.success("Fecha propuesta cargada. Por favor asigna un ingeniero y confirma.");
                                                                } catch (e) {
                                                                    console.error("Error setting date:", e);
                                                                    toast.warning("No se pudo cargar la fecha automáticamente.");
                                                                }
                                                                setIsManualScheduling(true);
                                                            }}
                                                        >
                                                            <CheckCircle2 className="mr-2 h-4 w-4" />
                                                            Revisar y Aceptar
                                                        </Button>
                                                        <Button
                                                            variant="outline"
                                                            className="border-indigo-200 text-indigo-700 hover:bg-indigo-50 w-full sm:w-auto"
                                                            onClick={() => setIsManualScheduling(true)}
                                                        >
                                                            Modificar Manualmente
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (oit.status === 'SCHEDULED' && !isEditingSchedule) ? (
                                        <div className="space-y-6 animate-in fade-in">
                                            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <h4 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                                                            <Calendar className="h-4 w-4 text-indigo-600" />
                                                            Visita Programada
                                                        </h4>
                                                        <p className="text-sm text-slate-500 mt-1">La visita técnica ya ha sido confirmada.</p>
                                                    </div>
                                                    <Button variant="outline" size="sm" onClick={() => setIsEditingSchedule(true)}>
                                                        Editar Programación
                                                    </Button>
                                                </div>

                                                <div className="grid md:grid-cols-2 gap-6 pt-2">
                                                    <div className="space-y-1">
                                                        <p className="text-xs font-medium text-slate-500 uppercase">Fecha y Hora</p>
                                                        <div className="flex items-center gap-2 text-slate-900 font-medium">
                                                            <Calendar className="h-4 w-4 text-slate-400" />
                                                            {new Date(oit.scheduledDate).toLocaleDateString()}
                                                            <span className="text-slate-300">|</span>
                                                            <Clock className="h-4 w-4 text-slate-400" />
                                                            {new Date(oit.scheduledDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </div>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <p className="text-xs font-medium text-slate-500 uppercase">Ubicación</p>
                                                        <div className="flex items-center gap-2 text-slate-900 font-medium">
                                                            <MapPin className="h-4 w-4 text-slate-400" />
                                                            {oit.location || 'No especificada'}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="pt-2">
                                                    <p className="text-xs font-medium text-slate-500 uppercase mb-2">Ingenieros Asignados</p>
                                                    <div className="flex flex-wrap gap-2">
                                                        {selectedEngineerIds.map(id => {
                                                            const eng = availableEngineers.find(e => e.id === id);
                                                            return eng ? (
                                                                <Badge key={id} variant="secondary" className="pl-1 pr-3 py-1 bg-indigo-50 text-indigo-700 border-indigo-100 gap-2">
                                                                    <div className="w-5 h-5 rounded-full bg-indigo-200 flex items-center justify-center text-[10px]">
                                                                        {eng.name.charAt(0)}
                                                                    </div>
                                                                    {eng.name}
                                                                </Badge>
                                                            ) : null;
                                                        })}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-6 animate-in fade-in">
                                            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
                                                <div>
                                                    <h4 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
                                                        <Calendar className="h-4 w-4 text-indigo-600" />
                                                        Programar Fecha y Hora
                                                    </h4>
                                                    <div className="grid md:grid-cols-2 gap-6">
                                                        {/* Date Input */}
                                                        <div className="space-y-2">
                                                            <label className="text-xs font-medium text-slate-600 uppercase tracking-wider">Fecha</label>
                                                            <div className="relative">
                                                                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                                                                <input
                                                                    type="date"
                                                                    className="w-full pl-10 h-11 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:border-transparent transition-all"
                                                                    value={oit.scheduledDate ? new Date(oit.scheduledDate).toISOString().split('T')[0] : ''}
                                                                    onChange={(e) => {
                                                                        const currentDate = oit.scheduledDate ? new Date(oit.scheduledDate) : new Date();
                                                                        const newDate = new Date(e.target.value);
                                                                        // Keep time if exists
                                                                        newDate.setHours(currentDate.getHours(), currentDate.getMinutes());
                                                                        // Just update local state for preview, commit on button click
                                                                        setOit({ ...oit, scheduledDate: newDate.toISOString() });
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
                                                                    onChange={(e) => {
                                                                        const currentDate = oit.scheduledDate ? new Date(oit.scheduledDate) : new Date();
                                                                        const [hours, minutes] = e.target.value.split(':');
                                                                        currentDate.setHours(parseInt(hours), parseInt(minutes));
                                                                        setOit({ ...oit, scheduledDate: currentDate.toISOString() });
                                                                    }}
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Location Input */}
                                                    <div className="space-y-2 mt-4">
                                                        <label className="text-xs font-medium text-slate-600 uppercase tracking-wider">Ubicación del Muestreo</label>
                                                        <div className="relative">
                                                            <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                                                            <input
                                                                type="text"
                                                                className="w-full pl-10 h-11 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:border-transparent transition-all"
                                                                value={oit.location || ''}
                                                                placeholder="Dirección o Coordenadas (Ej: Calle 123 # 45-67)"
                                                                onChange={(e) => setOit({ ...oit, location: e.target.value })}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="w-full h-px bg-slate-100" />

                                                {/* Engineer Selection */}
                                                <div>
                                                    <div className="flex items-center justify-between mb-4">
                                                        <h4 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                                                            <Users className="h-4 w-4 text-indigo-600" />
                                                            Ingenieros Asignados
                                                            <span className="text-xs font-normal text-red-500 bg-red-50 px-2 py-0.5 rounded-full border border-red-100">* Requerido</span>
                                                        </h4>

                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button variant="outline" size="sm" className="h-8 border-dashed">
                                                                    <Plus className="mr-2 h-3.5 w-3.5" />
                                                                    Asignar Ingeniero
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end" className="w-56">
                                                                <DropdownMenuLabel>Ingenieros Disponibles</DropdownMenuLabel>
                                                                {availableEngineers.map((eng) => {
                                                                    const isSelected = selectedEngineerIds.includes(eng.id);
                                                                    const isAvailable = isEngineerAvailable(eng, oit.scheduledDate || aiData?.data?.proposedDate);

                                                                    return (
                                                                        <DropdownMenuCheckboxItem
                                                                            key={eng.id}
                                                                            checked={isSelected}
                                                                            disabled={!isAvailable && !isSelected} // Optional: disable if busy, or just warn
                                                                            onCheckedChange={(checked) => {
                                                                                if (checked) {
                                                                                    setSelectedEngineerIds([...selectedEngineerIds, eng.id]);
                                                                                } else {
                                                                                    setSelectedEngineerIds(selectedEngineerIds.filter(id => id !== eng.id));
                                                                                }
                                                                            }}
                                                                        >
                                                                            <div className="flex flex-col w-full">
                                                                                <div className="flex justify-between items-center w-full gap-2">
                                                                                    <span>{eng.name}</span>
                                                                                    {!isAvailable && (
                                                                                        <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-medium">
                                                                                            Ocupado
                                                                                        </span>
                                                                                    )}
                                                                                </div>
                                                                                <span className="text-xs text-slate-500">{eng.email}</span>
                                                                            </div>
                                                                        </DropdownMenuCheckboxItem>
                                                                    );
                                                                })}
                                                                {availableEngineers.length === 0 && (
                                                                    <div className="p-2 text-xs text-slate-500 text-center">No hay ingenieros disponibles</div>
                                                                )}
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    </div>

                                                    {selectedEngineerIds.length > 0 ? (
                                                        <div className="flex flex-wrap gap-2">
                                                            {selectedEngineerIds.map(id => {
                                                                const eng = availableEngineers.find(e => e.id === id);
                                                                return eng ? (
                                                                    <Badge key={id} variant="secondary" className="pl-2 pr-1 py-1 h-7 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-indigo-100 gap-1">
                                                                        <div className="w-4 h-4 rounded-full bg-indigo-200 flex items-center justify-center text-[10px] mr-1">
                                                                            {eng.name.charAt(0)}
                                                                        </div>
                                                                        {eng.name}
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            className="h-4 w-4 ml-1 hover:bg-indigo-200 rounded-full"
                                                                            onClick={() => setSelectedEngineerIds(selectedEngineerIds.filter(eid => eid !== id))}
                                                                        >
                                                                            <X className="h-3 w-3" />
                                                                        </Button>
                                                                    </Badge>
                                                                ) : null;
                                                            })}
                                                        </div>
                                                    ) : (
                                                        <div className="text-sm text-slate-500 italic p-3 bg-slate-50 rounded border border-dashed border-slate-200 text-center">
                                                            No hay ingenieros asignados. Debes seleccionar al menos uno.
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="pt-4 flex justify-end">
                                                    <Button
                                                        className="bg-indigo-600 hover:bg-indigo-700 text-white min-w-[200px]"
                                                        disabled={!selectedEngineerIds.length || !oit.scheduledDate}
                                                        onClick={async () => {
                                                            try {
                                                                setIsProcessing(true);
                                                                await api.patch(`/oits/${id}`, {
                                                                    scheduledDate: oit.scheduledDate,
                                                                    location: oit.location,
                                                                    status: 'SCHEDULED',
                                                                    engineerIds: selectedEngineerIds
                                                                });
                                                                toast.success('Visita programada exitosamente');

                                                                // Refresh
                                                                const res = await api.get(`/oits/${id}`);
                                                                setOit(res.data);
                                                            } catch (error: any) {
                                                                toast.error(error.response?.data?.error || 'Error al programar visita');
                                                            } finally {
                                                                setIsProcessing(false);
                                                            }
                                                        }}
                                                    >
                                                        {isProcessing ? (
                                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                        ) : (
                                                            <Calendar className="mr-2 h-4 w-4" />
                                                        )}
                                                        Confirmar Programación
                                                    </Button>
                                                </div>

                                                {aiData?.data?.proposedDate && (
                                                    <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100 mt-4">
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
                            // Permission Check: only assigned engineers or SUPER_ADMIN
                            const isAssigned = selectedEngineerIds.includes(user?.id || '');
                            const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';

                            // Admins can see the tab (specifically to see the result), but maybe not the active sampling form if not assigned.
                            // But request says: "admin no puede hacer el muestreo pero si debera ver la card del analisis"

                            // If OIT is COMPLETED, Admin should see the view (Analysis Card).
                            // If NOT completed, Admin sees "Waiting for sampling".

                            const canView = isAdmin || isAssigned;
                            const canEdit = isAssigned || user?.role === 'SUPER_ADMIN'; // Super admin can do anything

                            if (!canView) {
                                return (
                                    <Card className="border-red-200 bg-red-50/50">
                                        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                                            <div className="h-16 w-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                                                <Users className="h-8 w-8 text-red-500" />
                                            </div>
                                            <h3 className="text-lg font-semibold text-slate-900">Acceso Restringido</h3>
                                            <p className="text-slate-600 max-w-md mt-2">
                                                Solo los ingenieros asignados a esta OIT pueden acceder al muestreo.
                                            </p>
                                        </CardContent>
                                    </Card>
                                );
                            }

                            // If Admin (not super) and NOT assigned, show status or analysis
                            if (user?.role === 'ADMIN' && !isAssigned) {
                                if (oit.status === 'COMPLETED' || oit.finalAnalysis) {
                                    // Show Analysis Card (It will fall through to logic below if we handle it right, 
                                    // but standard flow expects editing steps. Let's return the Analysis Card directly if present)
                                    // Or simply fall through but disable editing?
                                } else {
                                    return (
                                        <Card className="border-slate-200 bg-slate-50/50">
                                            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                                                <div className="h-16 w-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                                                    <Clock className="h-8 w-8 text-slate-400" />
                                                </div>
                                                <h3 className="text-lg font-semibold text-slate-900">Muestreo en Progreso</h3>
                                                <p className="text-slate-500 max-w-md mt-2">
                                                    El ingeniero asignado está realizando el muestreo. Verás el análisis aquí cuando finalice.
                                                </p>
                                            </CardContent>
                                        </Card>
                                    );
                                }
                            }

                            // 0. Verification of Conditions (Time & Location)
                            const isStarted = oit.status === 'IN_PROGRESS' || oit.status === 'COMPLETED';
                            if (!isLocationVerified && !isStarted) {
                                return (
                                    <Card className="border-indigo-200 bg-indigo-50/50 mb-6">
                                        <CardHeader>
                                            <div className="flex items-center gap-2">
                                                <MapPin className="h-5 w-5 text-indigo-600" />
                                                <CardTitle className="text-lg">Verificación de Sitio y Hora</CardTitle>
                                            </div>
                                            <CardDescription>
                                                Para iniciar, valida que estás en el sitio ({oit.location || 'No definido'}) y en el horario agendado.
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            {verificationMsg && (
                                                <div className={`p-4 rounded-lg flex items-center gap-3 ${verificationMsg.includes('Exitoso') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                    {verificationMsg.includes('Exitoso') ? <CheckCircle2 className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
                                                    <p className="text-sm font-medium">{verificationMsg}</p>
                                                </div>
                                            )}

                                            <Button
                                                className="w-full bg-slate-900 hover:bg-slate-800"
                                                size="lg"
                                                onClick={() => {
                                                    setVerificationMsg('Verificando condiciones...');

                                                    if (!oit.scheduledDate) {
                                                        setVerificationMsg('No hay fecha agendada.');
                                                        return;
                                                    }

                                                    const scheduled = new Date(oit.scheduledDate);
                                                    const now = new Date();
                                                    // Logic: Allow from 15 min BEFORE scheduled time. No upper limit on lateness (Past days allowed).

                                                    // Allow if now >= scheduled - 15min
                                                    const startWindow = new Date(scheduled.getTime() - 15 * 60000);

                                                    if (now < startWindow) {
                                                        const waitMin = Math.ceil((startWindow.getTime() - now.getTime()) / 60000);
                                                        setVerificationMsg(`Muy temprano. Podrás iniciar en ${waitMin} minutos (15 min antes de la hora).`);
                                                        return;
                                                    }

                                                    if (!navigator.geolocation) {
                                                        setVerificationMsg('Geolocalización no soportada por el navegador.');
                                                        return;
                                                    }

                                                    navigator.geolocation.getCurrentPosition(
                                                        (pos) => {
                                                            const currentLat = pos.coords.latitude;
                                                            const currentLng = pos.coords.longitude;

                                                            // Check 200m radius if location is coordinates
                                                            let distanceInfo = '';
                                                            const locParts = (oit.location || '').split(',').map((s: string) => s.trim());

                                                            if (locParts.length === 2) {
                                                                const targetLat = parseFloat(locParts[0]);
                                                                const targetLng = parseFloat(locParts[1]);

                                                                if (!isNaN(targetLat) && !isNaN(targetLng)) {
                                                                    // Haversine Distance
                                                                    const R = 6371; // km
                                                                    const dLat = (targetLat - currentLat) * Math.PI / 180;
                                                                    const dLon = (targetLng - currentLng) * Math.PI / 180;
                                                                    const a =
                                                                        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                                                                        Math.cos(currentLat * Math.PI / 180) * Math.cos(targetLat * Math.PI / 180) *
                                                                        Math.sin(dLon / 2) * Math.sin(dLon / 2);
                                                                    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                                                                    const distKm = R * c;

                                                                    if (distKm > 0.2) { // 200m = 0.2km
                                                                        const distM = (distKm * 1000).toFixed(0);
                                                                        setVerificationMsg(`FUERA DE RANGO. Estás a ${distM}m del sitio. Radio máximo: 200m.`);
                                                                        return;
                                                                    }
                                                                    distanceInfo = `Distancia: ${(distKm * 1000).toFixed(0)}m`;
                                                                }
                                                            }

                                                            setIsLocationVerified(true);
                                                            setVerificationMsg(`Verificación Exitosa ${distanceInfo ? '(' + distanceInfo + ')' : ''}`);
                                                            toast.success('Ubicación y Hora Validadas');
                                                        },
                                                        (err) => {
                                                            console.error(err);
                                                            let errMsg = 'Error GPS.';
                                                            if (err.code === 1) errMsg = 'Permiso denegado. Revisa configuración del sitio.';
                                                            else if (err.code === 2) errMsg = 'Ubicación no disponible.';
                                                            else if (err.code === 3) errMsg = 'Tiempo de espera agotado.';

                                                            if (!window.isSecureContext) {
                                                                errMsg += ' (Tu conexión es HTTP no segura. El navegador bloquea GPS).';
                                                            }

                                                            setVerificationMsg(`${errMsg} (${err.message})`);
                                                        },
                                                        { enableHighAccuracy: true, timeout: 10000 }
                                                    );
                                                }}
                                            >
                                                Verificar Condiciones para Iniciar
                                            </Button>
                                        </CardContent>
                                    </Card>
                                );
                            }

                            // Check if planning has been accepted (or at least Scheduled)
                            if (!oit.planningAccepted && !oit.scheduledDate) {
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
                            if (!oit.selectedTemplateId && !oit.selectedTemplateIds) {
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

                                    <div className="max-w-3xl mx-auto space-y-4">
                                        {templateSteps.length > 0 ? (
                                            templateSteps.map((step: any, index: number) => {
                                                const isLocked = (index > 0 && !stepValidations[index - 1]?.validated) || !canEdit;
                                                return (
                                                    <SamplingStep
                                                        key={index}
                                                        step={step}
                                                        stepIndex={index}
                                                        isLocked={isLocked}
                                                        validation={stepValidations[index]}
                                                        onValidationComplete={(data) => handleSaveStep(data)}
                                                    />
                                                );
                                            })
                                        ) : (
                                            <div className="text-center py-12 text-slate-500">
                                                <p>Cargando pasos de la plantilla...</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Final Actions */}
                                    <div className="flex flex-col items-center gap-4 py-6">
                                        {!finalAnalysis && templateSteps.length > 0 &&
                                            Object.keys(stepValidations).length >= templateSteps.length &&
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
                                            <div className="w-full flex justify-center py-6 animate-in fade-in">
                                                <Button size="lg" onClick={handleDownloadReport} className="shadow-lg bg-slate-900 hover:bg-slate-800 text-white">
                                                    <FileDown className="mr-2 h-5 w-5" />
                                                    Descargar Informe PDF
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })()}
                    </TabsContent>

                    <TabsContent value="report" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <ReportGenerator
                            oitId={id!}
                            finalReportUrl={oit.finalReportUrl}
                            initialAnalysis={oit.labResultsAnalysis || null}
                        />
                    </TabsContent>
                </Tabs>
            </div>
        </div >
    );
}
