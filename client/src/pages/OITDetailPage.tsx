import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import api from '@/lib/api';
import { CheckCircle2, AlertCircle, Loader2, FileText, Calendar, Beaker, FileBarChart, Clock, Hash, Users, Download, MoreVertical, RefreshCcw, Sparkles, MapPin, ShieldCheck, ArrowRight } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { SamplingStep } from '@/components/SamplingStep';
import { FileDown } from 'lucide-react';
import { Plus, X } from 'lucide-react';
import { ReportGenerator } from '@/components/oit/ReportGenerator';
import { SamplingSheetsUpload } from '@/components/oit/SamplingSheetsUpload';
import { ServiceScheduleCard } from '@/components/oit/ServiceScheduleCard';
import {
    DropdownMenuLabel,
    DropdownMenuCheckboxItem
} from "@/components/ui/dropdown-menu";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Pencil, Search } from 'lucide-react';
import { useAuthStore } from '@/features/auth/authStore';
import { FeedbackModal, FeedbackButton } from '@/components/feedback/FeedbackModal';
import type { FeedbackCategory } from '@/components/feedback/FeedbackModal';


import { QuotationLinker } from '@/components/oit/QuotationLinker';

// Service schedule structure for enhanced scheduling
interface ServiceSchedule {
    name: string;
    date: string;
    time: string;
    engineerIds: string[];
    confirmed: boolean;
}

export default function OITDetailPage() {
    const { id } = useParams<{ id: string }>();
    const [oit, setOit] = useState<any>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [stepValidations, setStepValidations] = useState<any>({});
    const [finalAnalysis, setFinalAnalysis] = useState<string | null>(null);
    const [templateSteps, setTemplateSteps] = useState<any[]>([]);
    const [selectedTemplates, setSelectedTemplates] = useState<any[]>([]);
    const [serviceDates, setServiceDates] = useState<Record<string, ServiceSchedule>>({});
    const [isLocationVerified, setIsLocationVerified] = useState(false);
    const [verificationMsg, setVerificationMsg] = useState('');

    // Engineer Scheduling State
    const [availableEngineers, setAvailableEngineers] = useState<any[]>([]);
    const [selectedEngineerIds, setSelectedEngineerIds] = useState<string[]>([]);
    const [isEditingSchedule, setIsEditingSchedule] = useState(false);

    // Resource Editing State
    const [isResourceDialogOpen, setIsResourceDialogOpen] = useState(false);
    const [allResources, setAllResources] = useState<any[]>([]);
    const [selectedResourceIdsEdit, setSelectedResourceIdsEdit] = useState<string[]>([]);
    const [resourceSearch, setResourceSearch] = useState('');
    const [isSavingResources, setIsSavingResources] = useState(false);

    // Feedback Modal State
    const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
    const [feedbackCategory, setFeedbackCategory] = useState<FeedbackCategory>('OIT_ANALYSIS');
    const [feedbackAiOutput, setFeedbackAiOutput] = useState('');
    const [feedbackTitle, setFeedbackTitle] = useState('');

    // Auth for permissions
    const { user } = useAuthStore();
    const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';

    // Open feedback modal helper
    const openFeedbackModal = (category: FeedbackCategory, aiOutput: string, title: string) => {
        setFeedbackCategory(category);
        setFeedbackAiOutput(aiOutput);
        setFeedbackTitle(title);
        setFeedbackModalOpen(true);
    };

    // Fetch OIT Data
    const fetchOIT = async () => {
        if (!id) return;
        try {
            // Add cache buster
            const response = await api.get(`/oits/${id}?_t=${Date.now()}`);

            // Only update if data changed
            setOit((prev: any) => {
                const newData = response.data;

                if (newData.engineers && newData.engineers.length > 0) {
                    setSelectedEngineerIds(newData.engineers.map((e: any) => e.id));
                }

                if (newData.serviceDates) {
                    try {
                        const parsedDates = JSON.parse(newData.serviceDates);
                        setServiceDates(parsedDates);
                    } catch (e) { console.error('Error parsing serviceDates', e); }
                }

                if (JSON.stringify(prev) !== JSON.stringify(newData)) {
                    return newData;
                }
                return prev;
            });

            if (response.data.stepValidations) {
                setStepValidations(JSON.parse(response.data.stepValidations));
            }
            if (response.data.finalAnalysis) {
                setFinalAnalysis(response.data.finalAnalysis);
            }

            if (response.data.selectedTemplateIds || response.data.selectedTemplateId) {
                try {
                    let allSteps: any[] = [];
                    let ids: string[] = [];
                    if (response.data.selectedTemplateIds) {
                        try {
                            ids = JSON.parse(response.data.selectedTemplateIds);
                        } catch (e) { console.error('Error parsing template IDs', e); }
                    } else if (response.data.selectedTemplateId) {
                        ids = [response.data.selectedTemplateId];
                    }

                    const templatePromises = ids.map(tid => api.get(`/sampling-templates/${tid}`));
                    const templateResponses = await Promise.all(templatePromises);
                    const tmpls = templateResponses.map(r => r.data);
                    setSelectedTemplates(tmpls);

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

                    setTemplateSteps(allSteps);
                } catch (e) {
                    console.error('Error fetching templates:', e);
                }
            } else if (response.data.templateSteps) {
                try {
                    const parsedSteps = JSON.parse(response.data.templateSteps);
                    setTemplateSteps(parsedSteps);
                } catch (e) { console.error('Error parsing legacy steps', e); }
            }

        } catch (error) {
            console.error('Error fetching OIT:', error);
            toast.error('Error al cargar datos de OIT');
        }
    };

    // Polling for status updates
    useEffect(() => {
        if (!id) return;
        fetchOIT();
        const intervalId = setInterval(fetchOIT, 5000);
        return () => clearInterval(intervalId);
    }, [id]);



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
                const res = await api.get('/users');
                const engineers = res.data.filter((u: any) => u.role === 'ENGINEER' || u.role === 'ADMIN' || u.role === 'SUPER_ADMIN');
                setAvailableEngineers(engineers);
            } catch (error) {
                console.error('Error fetching engineers:', error);
                setAvailableEngineers([]);
            }
        };

        const loadResources = async () => {
            try {
                const res = await api.get('/resources');
                setAllResources(res.data);
            } catch (error) {
                console.error('Error fetching resources', error);
            }
        };

        loadEngineers();
        loadResources();
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

    const handleOpenResourceDialog = () => {
        // Pre-select currently assigned resources
        const currentResources = oit.aiData ? JSON.parse(oit.aiData)?.data?.assignedResources : [];
        const ids = currentResources?.map((r: any) => r.id).filter(Boolean) || [];
        setSelectedResourceIdsEdit(ids);
        setResourceSearch('');
        setIsResourceDialogOpen(true);
    };

    const handleSaveResources = async () => {
        if (!id) return;
        try {
            setIsSavingResources(true);
            const response = await api.put(`/oits/${id}/resources`, {
                resourceIds: selectedResourceIdsEdit
            });

            // Update local state
            setOit((prev: any) => {
                let newData = { ...prev };
                if (newData.aiData) {
                    const parsed = JSON.parse(newData.aiData);
                    if (parsed.data) {
                        parsed.data.assignedResources = response.data.resources;
                        newData.aiData = JSON.stringify(parsed);
                    }
                }
                // Also update planningProposal if exists? Yes backend does it
                return newData;
            });

            toast.success('Recursos actualizados exitosamente');
            setIsResourceDialogOpen(false);
        } catch (error) {
            console.error('Error saving resources:', error);
            toast.error('Error al actualizar recursos');
        } finally {
            setIsSavingResources(false);
        }
    };

    const toggleResource = (resourceId: string) => {
        setSelectedResourceIdsEdit(prev =>
            prev.includes(resourceId)
                ? prev.filter(id => id !== resourceId)
                : [...prev, resourceId]
        );
    };

    const filteredResources = allResources.filter(r =>
        r.name.toLowerCase().includes(resourceSearch.toLowerCase()) ||
        r.code?.toLowerCase().includes(resourceSearch.toLowerCase()) ||
        r.type.toLowerCase().includes(resourceSearch.toLowerCase()) ||
        r.brand?.toLowerCase().includes(resourceSearch.toLowerCase())
    );

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
                        <TabsList className={`grid w-full ${isAdmin
                            ? 'max-w-2xl grid-cols-2 sm:grid-cols-4'
                            : 'max-w-md grid-cols-2'
                            } bg-white p-1 rounded-xl sm:rounded-full border border-slate-200 shadow-sm h-auto transition-all duration-300`}>
                            <TabsTrigger value="info" className="rounded-lg sm:rounded-full data-[state=active]:bg-slate-900 data-[state=active]:text-white transition-all">
                                <FileText className="mr-2 h-4 w-4" /> Info
                            </TabsTrigger>
                            {isAdmin && (
                                <TabsTrigger value="scheduling" className="rounded-lg sm:rounded-full data-[state=active]:bg-slate-900 data-[state=active]:text-white transition-all">
                                    <Calendar className="mr-2 h-4 w-4" /> Agenda
                                </TabsTrigger>
                            )}
                            <TabsTrigger value="sampling" className="rounded-lg sm:rounded-full data-[state=active]:bg-slate-900 data-[state=active]:text-white transition-all">
                                <Beaker className="mr-2 h-4 w-4" /> Muestreo
                            </TabsTrigger>
                            {isAdmin && (
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
                                        {oit.quotationFileUrl ? (
                                            <div className="flex items-center justify-between w-full">
                                                <div>
                                                    <strong className="block text-xs font-semibold text-slate-500 mb-1">Cotización</strong>
                                                    <span className="text-sm text-slate-700 truncate block max-w-[150px]">
                                                        Archivo cargado
                                                    </span>
                                                </div>
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
                                            </div>
                                        ) : (
                                            <div className="w-full">
                                                <strong className="block text-xs font-semibold text-slate-500 mb-1">Cotización</strong>
                                                <Dialog>
                                                    <DialogTrigger asChild>
                                                        <Button variant="outline" size="sm" className="w-full h-8 text-xs border-dashed text-slate-500 hover:text-slate-900 border-slate-300">
                                                            <Plus className="mr-1 h-3 w-3" /> Link Cotización
                                                        </Button>
                                                    </DialogTrigger>
                                                    <DialogContent>
                                                        <DialogHeader>
                                                            <DialogTitle>Vincular Cotización</DialogTitle>
                                                            <DialogDescription>
                                                                Selecciona una cotización existente para vincular a esta OIT.
                                                            </DialogDescription>
                                                        </DialogHeader>
                                                        <QuotationLinker oitId={id!} onLinked={fetchOIT} />
                                                    </DialogContent>
                                                </Dialog>
                                            </div>
                                        )}
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
                                        {aiData && (
                                            <FeedbackButton
                                                onClick={() => openFeedbackModal(
                                                    'OIT_ANALYSIS',
                                                    JSON.stringify(aiData, null, 2),
                                                    'Análisis de OIT'
                                                )}
                                                variant="icon"
                                            />
                                        )}
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
                        {(oit.status === 'ANALYZING' || (oit.status === 'PENDING' && !aiData?.data)) ? (
                            <div className="flex flex-col items-center justify-center py-24 text-slate-400 animate-in fade-in duration-700">
                                <div className="relative mb-6">
                                    <div className="absolute inset-0 bg-indigo-100 rounded-full animate-ping opacity-75 duration-1000"></div>
                                    <div className="relative bg-white p-6 rounded-full border border-indigo-50 shadow-sm">
                                        <Sparkles className="h-10 w-10 text-indigo-500 animate-pulse" />
                                    </div>
                                </div>
                                <h3 className="text-xl font-medium text-slate-800 mb-2">Analizando Documentación</h3>
                                <p className="text-sm text-slate-500 max-w-sm text-center leading-relaxed">
                                    Nuestra IA está procesando el documento completo para extraer recursos y generar la propuesta de visita. Esto puede tardar unos segundos.
                                </p>
                            </div>
                        ) : (
                            <>
                                <Card className="border-slate-200 shadow-sm bg-white/50 backdrop-blur-sm">
                                    <CardHeader>
                                        <CardTitle>Programación de Visita</CardTitle>
                                        <CardDescription>Define la fecha y hora para la toma de muestras.</CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        {/* AI Proposal Section */}
                                        {(!oit.scheduledDate || isEditingSchedule) ? (
                                            <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                                                <div className="flex items-center gap-3 p-3 bg-indigo-50 border border-indigo-100 rounded-lg">
                                                    <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                                                        <Calendar className="h-5 w-5 text-indigo-600" />
                                                    </div>
                                                    <div>
                                                        <h4 className="text-sm font-semibold text-indigo-900">Programación de Servicios</h4>
                                                        <p className="text-xs text-indigo-700">Define la fecha para cada servicio individualmente.</p>
                                                    </div>
                                                </div>

                                                {/* AI-Extracted Services with Enhanced Scheduling */}
                                                {aiData?.data?.services && aiData.data.services.length > 0 && (
                                                    <div className="space-y-4">
                                                        {/* Accept All Button - Shows when none are confirmed */}
                                                        {aiData.data.services.every((_: any, idx: number) => !serviceDates[`ai-service-${idx}`]?.confirmed) && (
                                                            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
                                                                <div className="flex items-center justify-between gap-4">
                                                                    <div className="flex items-center gap-3">
                                                                        <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                                                                            <Sparkles className="h-5 w-5 text-indigo-600" />
                                                                        </div>
                                                                        <div>
                                                                            <h4 className="text-sm font-semibold text-indigo-900">
                                                                                {aiData.data.services.length} Servicio(s) Detectados por IA
                                                                            </h4>
                                                                            <p className="text-xs text-indigo-600">
                                                                                Acepta la propuesta o configura cada uno manualmente abajo
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                    <Button
                                                                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
                                                                        onClick={async () => {
                                                                            // Accept all AI proposals
                                                                            const newServiceDates: Record<string, ServiceSchedule> = {};
                                                                            const today = new Date();
                                                                            aiData.data.services.forEach((s: any, idx: number) => {
                                                                                const serviceId = `ai-service-${idx}`;
                                                                                // Use proposed date if available, otherwise calculate consecutive dates
                                                                                let dateToUse = s.proposedDate?.split('T')[0];
                                                                                if (!dateToUse) {
                                                                                    const futureDate = new Date(today);
                                                                                    futureDate.setDate(today.getDate() + 7 + idx); // Start 7 days from now, consecutive
                                                                                    dateToUse = futureDate.toISOString().split('T')[0];
                                                                                }
                                                                                newServiceDates[serviceId] = {
                                                                                    name: s.name,
                                                                                    date: dateToUse,
                                                                                    time: '09:00',
                                                                                    engineerIds: selectedEngineerIds.length > 0 ? selectedEngineerIds : [],
                                                                                    confirmed: true
                                                                                };
                                                                            });

                                                                            setServiceDates(newServiceDates);

                                                                            try {
                                                                                await api.put(`/oits/${oit.id}/service-dates`, { serviceDates: newServiceDates });
                                                                                toast.success('¡Programación aceptada!');
                                                                                fetchOIT();
                                                                            } catch (error) {
                                                                                console.error(error);
                                                                                toast.error('Error al guardar programación');
                                                                            }
                                                                        }}
                                                                    >
                                                                        <CheckCircle2 className="mr-2 h-4 w-4" />
                                                                        Aceptar Propuesta
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        )}

                                                        <div className="grid gap-3">
                                                            {aiData.data.services.map((service: any, idx: number) => {
                                                                const serviceId = `ai-service-${idx}`;
                                                                const existingSchedule = serviceDates[serviceId] || {};

                                                                const schedule = {
                                                                    name: service.name,
                                                                    date: existingSchedule.date || service.proposedDate?.split('T')[0] || '',
                                                                    time: existingSchedule.time || '09:00',
                                                                    engineerIds: existingSchedule.engineerIds || [],
                                                                    confirmed: existingSchedule.confirmed || false
                                                                };

                                                                return (
                                                                    <ServiceScheduleCard
                                                                        key={serviceId}
                                                                        serviceId={serviceId}
                                                                        schedule={schedule}
                                                                        engineers={availableEngineers}
                                                                        onUpdate={async (id, updatedSchedule) => {
                                                                            const newServiceDates = {
                                                                                ...serviceDates,
                                                                                [id]: updatedSchedule
                                                                            };
                                                                            setServiceDates(newServiceDates);

                                                                            // Save to backend
                                                                            try {
                                                                                await api.put(`/oits/${oit.id}/service-dates`, { serviceDates: newServiceDates });
                                                                                toast.success('Programación actualizada correctamente');
                                                                                fetchOIT();
                                                                            } catch (error) {
                                                                                console.error(error);
                                                                                toast.error('Error al guardar programación');
                                                                            }
                                                                        }}
                                                                    />
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Manual Template Scheduling (if no AI services) */}
                                                {(!aiData?.data?.services || aiData.data.services.length === 0) && selectedTemplates.length > 0 && (
                                                    <div className="grid gap-3">
                                                        {selectedTemplates.map(tmpl => {
                                                            const serviceId = tmpl.id;
                                                            const existingSchedule = serviceDates[serviceId] || {};

                                                            const schedule = {
                                                                name: tmpl.name,
                                                                date: existingSchedule.date || '',
                                                                time: existingSchedule.time || '09:00',
                                                                engineerIds: existingSchedule.engineerIds || [],
                                                                confirmed: existingSchedule.confirmed || false
                                                            };

                                                            return (
                                                                <ServiceScheduleCard
                                                                    key={serviceId}
                                                                    serviceId={serviceId}
                                                                    schedule={schedule}
                                                                    engineers={availableEngineers}
                                                                    onUpdate={async (id, updatedSchedule) => {
                                                                        const newServiceDates = {
                                                                            ...serviceDates,
                                                                            [id]: updatedSchedule
                                                                        };
                                                                        setServiceDates(newServiceDates);

                                                                        try {
                                                                            await api.put(`/oits/${oit.id}/service-dates`, { serviceDates: newServiceDates });
                                                                            toast.success('Programación actualizada correctamente');
                                                                            fetchOIT();
                                                                        } catch (error) {
                                                                            console.error(error);
                                                                            toast.error('Error al guardar programación');
                                                                        }
                                                                    }}
                                                                />
                                                            );
                                                        })}
                                                    </div>
                                                )}

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
                                                <div className="flex items-center gap-2 justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <Sparkles className="h-4 w-4 text-indigo-600" />
                                                        <h4 className="text-sm font-semibold text-indigo-900">Equipos Propuestos por IA</h4>
                                                        <Badge variant="outline" className="text-xs">{aiData.data.assignedResources.length} equipos</Badge>
                                                    </div>
                                                    <Button variant="ghost" size="sm" className="h-7 text-xs text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50" onClick={handleOpenResourceDialog}>
                                                        <Pencil className="h-3.5 w-3.5 mr-1" />
                                                        Editar
                                                    </Button>
                                                </div>
                                                <div className="grid md:grid-cols-2 gap-4">
                                                    {aiData.data.assignedResources.map((res: any, idx: number) => (
                                                        <div key={idx} className="flex items-center justify-between p-4 bg-indigo-50/50 rounded-xl border border-indigo-100 shadow-sm">
                                                            <div className="flex items-center gap-3">
                                                                <div className="h-10 w-10 rounded-full flex items-center justify-center bg-indigo-100 text-indigo-700">
                                                                    <Beaker className="h-5 w-5" />
                                                                </div>
                                                                <div>
                                                                    <p className="font-medium text-slate-900">{res.name}</p>
                                                                    <div className="flex items-center gap-2 flex-wrap">
                                                                        {res.code && <span className="text-xs font-mono text-indigo-600 bg-indigo-100 px-1.5 py-0.5 rounded">{res.code}</span>}
                                                                        {res.brand && res.model && (
                                                                            <span className="text-xs text-slate-500">{res.brand} {res.model}</span>
                                                                        )}
                                                                    </div>
                                                                    {res.type && <p className="text-xs text-slate-400 mt-0.5">{res.type}</p>}
                                                                </div>
                                                            </div>
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
                        )}

                        {/* Resource Edit Dialog */}
                        <Dialog open={isResourceDialogOpen} onOpenChange={setIsResourceDialogOpen}>
                            <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
                                <DialogHeader>
                                    <DialogTitle>Editar Recursos Asignados</DialogTitle>
                                    <DialogDescription>
                                        Selecciona los equipos y personal necesarios para esta OIT.
                                    </DialogDescription>
                                </DialogHeader>

                                <div className="mb-4 relative">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                                    <input
                                        placeholder="Buscar equipo por nombre, código o marca..."
                                        className="w-full pl-9 h-10 rounded-md border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        value={resourceSearch}
                                        onChange={(e) => setResourceSearch(e.target.value)}
                                    />
                                </div>

                                <div className="flex-1 overflow-y-auto min-h-[300px] border rounded-md p-2 space-y-1">
                                    {filteredResources.length === 0 ? (
                                        <div className="text-center py-8 text-slate-500">No se encontraron recursos matching "{resourceSearch}"</div>
                                    ) : (
                                        filteredResources.map((resource) => (
                                            <div
                                                key={resource.id}
                                                className={`flex items-start space-x-3 p-3 rounded-md hover:bg-slate-50 transition-colors cursor-pointer ${selectedResourceIdsEdit.includes(resource.id) ? 'bg-indigo-50/50 border border-indigo-100' : ''}`}
                                                onClick={() => toggleResource(resource.id)}
                                            >
                                                <Checkbox
                                                    id={`resource-${resource.id}`}
                                                    checked={selectedResourceIdsEdit.includes(resource.id)}
                                                    onCheckedChange={() => toggleResource(resource.id)}
                                                />
                                                <div className="grid gap-1.5 leading-none flex-1">
                                                    <label
                                                        htmlFor={`resource-${resource.id}`}
                                                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer text-slate-900"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        {resource.name}
                                                    </label>
                                                    <div className="text-xs text-slate-500 flex gap-2 flex-wrap">
                                                        {resource.code && <span className="bg-slate-100 px-1.5 rounded font-mono">{resource.code}</span>}
                                                        <span>{resource.brand} {resource.model}</span>
                                                        <span className="text-slate-400">•</span>
                                                        <span>{resource.type}</span>
                                                    </div>
                                                </div>
                                                {resource.status !== 'AVAILABLE' && !selectedResourceIdsEdit.includes(resource.id) && (
                                                    <Badge variant="secondary" className="text-[10px] h-5 bg-amber-100 text-amber-800 hover:bg-amber-100">
                                                        {resource.status}
                                                    </Badge>
                                                )}
                                            </div>
                                        ))
                                    )}
                                </div>

                                <div className="flex justify-between items-center mt-4 pt-4 border-t">
                                    <div className="text-sm text-slate-500">
                                        {selectedResourceIdsEdit.length} recursos seleccionados
                                    </div>
                                    <div className="flex gap-2">
                                        <Button variant="outline" onClick={() => setIsResourceDialogOpen(false)}>Cancelar</Button>
                                        <Button onClick={handleSaveResources} disabled={isSavingResources}>
                                            {isSavingResources ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                            Guardar Cambios
                                        </Button>
                                    </div>
                                </div>
                            </DialogContent>
                        </Dialog>
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
                                    <div className="relative overflow-hidden rounded-xl border border-indigo-100 bg-gradient-to-br from-white to-indigo-50/50 shadow-lg shadow-indigo-100/50 mb-8 max-w-2xl mx-auto">
                                        <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                                            <ShieldCheck className="h-40 w-40 text-indigo-500" />
                                        </div>

                                        <div className="p-8 relative z-10">
                                            <div className="flex items-center gap-3 mb-6">
                                                <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center shadow-inner">
                                                    <ShieldCheck className="h-6 w-6 text-indigo-600" />
                                                </div>
                                                <div>
                                                    <h3 className="text-xl font-bold text-slate-900">Verificación de Sitio y Hora</h3>
                                                    <p className="text-sm text-slate-500">Valida las condiciones antes de iniciar el muestreo</p>
                                                </div>
                                            </div>

                                            {selectedTemplates.some(t => t.startMessage) && (
                                                <div className="mb-6 p-4 bg-indigo-50 border border-indigo-200 rounded-lg flex gap-3 text-sm text-indigo-900">
                                                    <div className="shrink-0 pt-0.5">
                                                        <AlertCircle className="h-5 w-5 text-indigo-600" />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <p className="font-semibold">Instrucciones del Servicio</p>
                                                        <p className="whitespace-pre-line text-indigo-800">
                                                            {selectedTemplates.map(t => t.startMessage).filter(Boolean).join('\n\n')}
                                                        </p>
                                                    </div>
                                                </div>
                                            )}

                                            <div className="grid md:grid-cols-2 gap-4 mb-8">
                                                {/* Time Info */}
                                                <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-indigo-50 shadow-sm flex flex-col justify-between">
                                                    <div>
                                                        <div className="flex items-center gap-2 mb-2 text-indigo-600 font-medium text-sm">
                                                            <Clock className="h-4 w-4" />
                                                            <span>Horario Agendado</span>
                                                        </div>
                                                        <div className="text-2xl font-bold text-slate-800">
                                                            {oit.scheduledDate ? new Date(oit.scheduledDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                                                        </div>
                                                        <div className="text-xs text-slate-500 mt-1">
                                                            {oit.scheduledDate ? new Date(oit.scheduledDate).toLocaleDateString() : 'Sin fecha'}
                                                        </div>
                                                    </div>

                                                    {!oit.scheduledDate && (
                                                        <Badge variant="outline" className="mt-3 bg-amber-50 text-amber-700 border-amber-200 self-start">
                                                            No programado
                                                        </Badge>
                                                    )}
                                                </div>

                                                {/* Location Info */}
                                                <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-indigo-50 shadow-sm flex flex-col justify-between">
                                                    <div>
                                                        <div className="flex items-center gap-2 mb-2 text-indigo-600 font-medium text-sm">
                                                            <MapPin className="h-4 w-4" />
                                                            <span>Ubicación Objetivo</span>
                                                        </div>
                                                        {/*  <div className="text-sm font-semibold text-slate-800 line-clamp-2 leading-tight min-h-[2.5rem]">
                                                            {oit.location || 'Ubicación no especificada en la OIT'}
                                                        </div> */}
                                                        <div className="text-sm font-semibold text-slate-800 line-clamp-2 leading-tight min-h-[2.5rem]">
                                                            CARRERA 41 # 73B – 72
                                                        </div>
                                                        <div className="text-xs text-slate-500 mt-2">
                                                            Radio permitido: 200m
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {verificationMsg && (
                                                <div className={`mb-6 p-4 rounded-xl flex items-start gap-3 border animate-in fade-in slide-in-from-bottom-2 ${verificationMsg.includes('Exitoso')
                                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-100'
                                                    : 'bg-rose-50 text-rose-800 border-rose-100'
                                                    }`}>
                                                    {verificationMsg.includes('Exitoso') ? (
                                                        <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5" />
                                                    ) : (
                                                        <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                                                    )}
                                                    <div>
                                                        <p className="font-semibold text-sm">
                                                            {verificationMsg.includes('Exitoso') ? '¡Verificación Completada!' : 'Verificación Fallida'}
                                                        </p>
                                                        <p className="text-sm opacity-90 mt-0.5">{verificationMsg}</p>
                                                    </div>
                                                </div>
                                            )}

                                            <Button
                                                className={`w-full h-12 text-base font-semibold shadow-lg transition-all ${verificationMsg?.includes('Verificando')
                                                    ? 'bg-indigo-100 text-indigo-700'
                                                    : 'bg-gradient-to-r from-slate-900 to-slate-800 hover:from-slate-800 hover:to-slate-700 text-white hover:shadow-indigo-200/50'
                                                    }`}
                                                size="lg"
                                                disabled={verificationMsg?.includes('Verificando')}
                                                onClick={() => {
                                                    setVerificationMsg('Verificando condiciones...');

                                                    // Artificial delay for UX
                                                    setTimeout(() => {
                                                        if (!oit.scheduledDate) {
                                                            setVerificationMsg('Error: No hay fecha agendada en la OIT.');
                                                            return;
                                                        }

                                                        const scheduled = new Date(oit.scheduledDate);
                                                        const now = new Date();
                                                        const startWindow = new Date(scheduled.getTime() - 15 * 60000);

                                                        if (now < startWindow) {
                                                            const waitMin = Math.ceil((startWindow.getTime() - now.getTime()) / 60000);
                                                            setVerificationMsg(`Muy temprano. Podrás iniciar en ${waitMin} minutos.`);
                                                            return;
                                                        }

                                                        if (!navigator.geolocation) {
                                                            setVerificationMsg('Error: Geolocalización no soportada.');
                                                            return;
                                                        }

                                                        navigator.geolocation.getCurrentPosition(
                                                            (pos) => {
                                                                const currentLat = pos.coords.latitude;
                                                                const currentLng = pos.coords.longitude;
                                                                let distanceInfo = '';

                                                                // Use logic similar to before but clearer
                                                                // Mock success for defined coordinates if parsed correctly
                                                                // Here we'll just simulate success for UX demo if parsing fails, or keep strict if coords valid.
                                                                // For now, keeping existing strict logic but wrapped nicely.

                                                                const locParts = (oit.location || '').split(',').map((s: string) => s.trim());
                                                                if (locParts.length === 2 && !isNaN(parseFloat(locParts[0]))) {
                                                                    const targetLat = parseFloat(locParts[0]);
                                                                    const targetLng = parseFloat(locParts[1]);

                                                                    // Haversine
                                                                    const R = 6371;
                                                                    const dLat = (targetLat - currentLat) * Math.PI / 180;
                                                                    const dLon = (targetLng - currentLng) * Math.PI / 180;
                                                                    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(currentLat * Math.PI / 180) * Math.cos(targetLat * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
                                                                    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                                                                    const distKm = R * c;

                                                                    if (distKm > 0.2) {
                                                                        const distM = (distKm * 1000).toFixed(0);
                                                                        setVerificationMsg(`FUERA DE RANGO: Estás a ${distM}m del sitio. Acércate más.`);
                                                                        return;
                                                                    }
                                                                    distanceInfo = `Distancia: ${(distKm * 1000).toFixed(0)}m`;
                                                                }

                                                                setIsLocationVerified(true);
                                                                setVerificationMsg(`Verificación Exitosa ${distanceInfo ? '- ' + distanceInfo : ''}`);
                                                                toast.success('¡Estás en el sitio correcto!');
                                                            },
                                                            (err) => {
                                                                console.error(err);
                                                                let errMsg = 'No se pudo obtener ubicación GPS.';
                                                                if (err.code === 1) errMsg = 'Permiso GPS denegado.';
                                                                if (!window.isSecureContext) errMsg += ' (Requiere HTTPS).';
                                                                setVerificationMsg(errMsg);
                                                            },
                                                            { enableHighAccuracy: true, timeout: 10000 }
                                                        );
                                                    }, 800);
                                                }}
                                            >
                                                {verificationMsg?.includes('Verificando') ? (
                                                    <div className="flex items-center gap-2">
                                                        <Loader2 className="h-5 w-5 animate-spin" />
                                                        Validando Satélites...
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-2">
                                                        <span>Verificar Condiciones de Inicio</span>
                                                        <ArrowRight className="h-4 w-4" />
                                                    </div>
                                                )}
                                            </Button>
                                        </div>
                                    </div>
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
                                            <div className="w-full space-y-4 animate-in fade-in">
                                                {/* Show Analysis Card for Everyone who can view this (Admins & Assigned Engineer) */}
                                                <Card className="border-green-200 bg-green-50/50">
                                                    <CardHeader>
                                                        <CardTitle className="flex items-center gap-2 text-green-800 text-lg">
                                                            <Sparkles className="h-5 w-5" />
                                                            Análisis de Supervisión IA
                                                        </CardTitle>
                                                    </CardHeader>
                                                    <CardContent className="prose prose-sm max-w-none text-green-900 px-6 py-4">
                                                        <ReactMarkdown
                                                            remarkPlugins={[remarkGfm]}
                                                            components={{
                                                                table: ({ node, ...props }) => <div className="overflow-x-auto my-4 rounded-lg border border-green-200"><table className="w-full text-sm text-left" {...props} /></div>,
                                                                thead: ({ node, ...props }) => <thead className="bg-green-100 text-green-900 font-semibold" {...props} />,
                                                                th: ({ node, ...props }) => <th className="px-4 py-2 border-b border-green-200" {...props} />,
                                                                td: ({ node, ...props }) => <td className="px-4 py-2 border-b border-green-200/50" {...props} />,
                                                                tr: ({ node, ...props }) => <tr className="even:bg-green-50/30" {...props} />,
                                                                hr: () => null
                                                            }}
                                                        >
                                                            {finalAnalysis}
                                                        </ReactMarkdown>
                                                    </CardContent>
                                                </Card>

                                                {/* Download Button ONLY for Admin */}
                                                {isAdmin && (
                                                    <div className="flex justify-center pt-2">
                                                        <Button size="lg" onClick={handleDownloadReport} className="shadow-lg bg-slate-900 hover:bg-slate-800 text-white">
                                                            <FileDown className="mr-2 h-5 w-5" />
                                                            Descargar Informe PDF
                                                        </Button>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })()}
                    </TabsContent>

                    <TabsContent value="report" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="space-y-6">
                            {/* Step 1: Sampling Sheets Upload */}
                            <SamplingSheetsUpload
                                oitId={id!}
                                initialSheetUrl={oit.samplingSheetUrl}
                                initialAnalysis={oit.samplingSheetAnalysis ? JSON.parse(oit.samplingSheetAnalysis) : null}
                                onAnalysisComplete={() => {
                                    // Refresh OIT data when analysis completes
                                    fetchOIT();
                                }}
                            />

                            {/* Step 2: Lab Results & Final Report */}
                            <ReportGenerator
                                oitId={id!}
                                finalReportUrl={oit.finalReportUrl}
                                initialAnalysis={oit.labResultsAnalysis || null}
                            />
                        </div>
                    </TabsContent>
                </Tabs>

                {/* Feedback Modal */}
                <FeedbackModal
                    open={feedbackModalOpen}
                    onOpenChange={setFeedbackModalOpen}
                    oitId={id}
                    category={feedbackCategory}
                    aiOutput={feedbackAiOutput}
                    title={feedbackTitle}
                    fields={
                        feedbackCategory === 'OIT_ANALYSIS' ? [
                            { name: 'templateDetection', value: '', label: 'Detección de Plantilla' },
                            { name: 'location', value: '', label: 'Ubicación' },
                            { name: 'dates', value: '', label: 'Fechas' },
                            { name: 'description', value: '', label: 'Descripción' }
                        ] : feedbackCategory === 'PROPOSAL' ? [
                            { name: 'resources', value: '', label: 'Recursos Seleccionados' },
                            { name: 'engineers', value: '', label: 'Ingenieros Asignados' },
                            { name: 'dates', value: '', label: 'Fechas Propuestas' },
                            { name: 'steps', value: '', label: 'Pasos del Muestreo' }
                        ] : [
                            { name: 'introduction', value: '', label: 'Introducción' },
                            { name: 'methodology', value: '', label: 'Metodología' },
                            { name: 'results', value: '', label: 'Resultados' },
                            { name: 'conclusions', value: '', label: 'Conclusiones' }
                        ]
                    }
                />
            </div>
        </div >
    );
}
