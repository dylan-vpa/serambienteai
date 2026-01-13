import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import api from '@/lib/api';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import {
    FileText, Building2, Calendar, Download, Link2,
    Sparkles, Loader2, DollarSign, CheckCircle2,
    Clock, Hash, AlertTriangle, XCircle
} from 'lucide-react';
import { FeedbackModal, FeedbackButton } from '@/components/feedback/FeedbackModal';
import type { FeedbackCategory } from '@/components/feedback/FeedbackModal';

interface Quotation {
    id: string;
    quotationNumber: string;
    description?: string;
    clientName?: string;
    fileUrl?: string;
    extractedText?: string;
    status: string;
    aiData?: string;
    complianceResult?: string;
    createdAt: string;
    updatedAt: string;
    linkedOITs?: { id: string; oitNumber: string; status: string; description?: string }[];
}

export default function QuotationDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [quotation, setQuotation] = useState<Quotation | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    // Feedback Modal State
    const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
    const [feedbackCategory, setFeedbackCategory] = useState<FeedbackCategory>('QUOTATION_ANALYSIS');
    const [feedbackAiOutput, setFeedbackAiOutput] = useState('');
    const [feedbackTitle, setFeedbackTitle] = useState('');

    // Open feedback modal helper
    const openFeedbackModal = (category: FeedbackCategory, aiOutput: string, title: string) => {
        setFeedbackCategory(category);
        setFeedbackAiOutput(aiOutput);
        setFeedbackTitle(title);
        setFeedbackModalOpen(true);
    };

    useEffect(() => {
        if (id) fetchQuotation();
    }, [id]);

    const fetchQuotation = async () => {
        try {
            const response = await api.get(`/quotations/${id}`);
            setQuotation(response.data);
        } catch (error) {
            console.error('Error fetching quotation:', error);
            toast.error('No se pudo cargar la cotización');
            navigate('/quotations');
        } finally {
            setIsLoading(false);
        }
    };

    const handleAnalyze = async () => {
        setIsAnalyzing(true);
        try {
            await api.post(`/quotations/${id}/analyze`);
            toast.success('Análisis iniciado');
            fetchQuotation();
        } catch (error) {
            console.error('Error analyzing quotation:', error);
            toast.error('Error al iniciar análisis');
        } finally {
            setIsAnalyzing(false);
        }
    };

    const getStatusLabel = (status: string) => {
        const statusMap: Record<string, string> = {
            'PENDING': 'Pendiente',
            'ANALYZING': 'Analizando',
            'COMPLIANT': 'Conforme',
            'NON_COMPLIANT': 'No Conforme',
            'REVIEW_REQUIRED': 'Revisión Requerida'
        };
        return statusMap[status] || status;
    };

    const parseAIData = () => {
        if (!quotation?.aiData) return null;
        try {
            return JSON.parse(quotation.aiData);
        } catch {
            return null;
        }
    };

    const parseComplianceResult = () => {
        if (!quotation?.complianceResult) return null;
        try {
            return JSON.parse(quotation.complianceResult);
        } catch {
            return null;
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-slate-50/50 pb-12">
                <div className="bg-slate-50/50 border-b border-slate-200">
                    <div className="container mx-auto py-6">
                        <Skeleton className="h-8 w-48 mb-2" />
                        <Skeleton className="h-4 w-64" />
                    </div>
                </div>
                <div className="container mx-auto py-8">
                    <Card>
                        <CardContent className="p-6">
                            <Skeleton className="h-64 w-full" />
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    }

    if (!quotation) {
        return <div className="text-center text-slate-500 py-24">Cotización no encontrada</div>;
    }

    const aiData = parseAIData();
    const complianceResult = parseComplianceResult();

    return (
        <div className="min-h-screen bg-slate-50/50 pb-12">
            {/* Header Section - Match OIT Style */}
            <div className="bg-slate-50/50 border-b border-slate-200">
                <div className="container mx-auto py-6">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <div className="flex items-center gap-3 mb-1">
                                <h1 className="text-3xl font-bold tracking-tight text-slate-900 font-display">
                                    {quotation.quotationNumber}
                                </h1>
                                <Badge variant={quotation.status === 'ANALYZING' ? 'secondary' : 'default'} className="text-xs px-2.5 py-0.5 font-medium">
                                    {quotation.status === 'ANALYZING' && <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />}
                                    {getStatusLabel(quotation.status)}
                                </Badge>
                            </div>
                            <p className="text-slate-500 text-sm max-w-2xl truncate flex items-center gap-2">
                                <Building2 className="h-4 w-4" />
                                {quotation.clientName || 'Sin cliente asignado'}
                            </p>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-slate-500">
                            <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-full">
                                <Clock className="h-3.5 w-3.5" />
                                <span>{new Date(quotation.createdAt).toLocaleDateString()}</span>
                            </div>
                            <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-full">
                                <Hash className="h-3.5 w-3.5" />
                                <span className="font-mono">{quotation.id.slice(0, 8)}</span>
                            </div>
                            {quotation.status === 'PENDING' && (
                                <Button onClick={handleAnalyze} disabled={isAnalyzing} size="sm" className="bg-indigo-600 hover:bg-indigo-700">
                                    {isAnalyzing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                                    Analizar con IA
                                </Button>
                            )}
                            {quotation.fileUrl && (
                                <Button variant="outline" size="sm" asChild>
                                    <a
                                        href={`${import.meta.env.VITE_API_URL?.replace('/api', '')}/api/files/${quotation.fileUrl}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        <Download className="mr-2 h-4 w-4" />
                                        PDF
                                    </a>
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="container mx-auto py-8 space-y-8">
                {/* Analysis Alert */}
                {quotation.status === 'ANALYZING' && (
                    <div className="bg-blue-50/80 backdrop-blur-sm border border-blue-200 rounded-xl p-6 flex items-center gap-4 shadow-sm">
                        <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
                        </div>
                        <div>
                            <p className="font-semibold text-blue-900">Analizando cotización...</p>
                            <p className="text-sm text-blue-700 mt-0.5">La IA está extrayendo información. Esto puede tomar unos momentos.</p>
                        </div>
                    </div>
                )}

                <Tabs defaultValue="info" className="w-full">
                    {/* Tabs - Match OIT Style */}
                    <div className="flex justify-center mb-8">
                        <TabsList className="grid w-full max-w-2xl grid-cols-2 sm:grid-cols-4 bg-white p-1 rounded-xl sm:rounded-full border border-slate-200 shadow-sm h-auto transition-all duration-300">
                            <TabsTrigger value="info" className="rounded-lg sm:rounded-full data-[state=active]:bg-slate-900 data-[state=active]:text-white transition-all">
                                <FileText className="mr-2 h-4 w-4" /> Info
                            </TabsTrigger>
                            <TabsTrigger value="analysis" className="rounded-lg sm:rounded-full data-[state=active]:bg-slate-900 data-[state=active]:text-white transition-all">
                                <Sparkles className="mr-2 h-4 w-4" /> Análisis
                            </TabsTrigger>
                            <TabsTrigger value="compliance" className="rounded-lg sm:rounded-full data-[state=active]:bg-slate-900 data-[state=active]:text-white transition-all">
                                <CheckCircle2 className="mr-2 h-4 w-4" /> Cumplimiento
                            </TabsTrigger>
                            <TabsTrigger value="linked" className="rounded-lg sm:rounded-full data-[state=active]:bg-slate-900 data-[state=active]:text-white transition-all">
                                <Link2 className="mr-2 h-4 w-4" /> OITs
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    {/* Info Tab */}
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
                                            <strong className="text-xs font-semibold uppercase tracking-wider text-slate-500">Número de Cotización</strong>
                                            <p className="text-lg font-medium text-slate-900">{quotation.quotationNumber}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <strong className="text-xs font-semibold uppercase tracking-wider text-slate-500">Estado</strong>
                                            <p className="text-lg font-medium text-slate-900">{getStatusLabel(quotation.status)}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <strong className="text-xs font-semibold uppercase tracking-wider text-slate-500">Cliente</strong>
                                            <p className="text-lg font-medium text-slate-900 flex items-center gap-2">
                                                <Building2 className="h-4 w-4 text-slate-400" />
                                                {quotation.clientName || '-'}
                                            </p>
                                        </div>
                                        <div className="space-y-1">
                                            <strong className="text-xs font-semibold uppercase tracking-wider text-slate-500">Fecha de Creación</strong>
                                            <p className="text-lg font-medium text-slate-900 flex items-center gap-2">
                                                <Calendar className="h-4 w-4 text-slate-400" />
                                                {new Date(quotation.createdAt).toLocaleDateString('es-ES')}
                                            </p>
                                        </div>
                                        {quotation.description && (
                                            <div className="col-span-2 space-y-1">
                                                <strong className="text-xs font-semibold uppercase tracking-wider text-slate-500">Descripción</strong>
                                                <p className="text-slate-700 leading-relaxed">{quotation.description}</p>
                                            </div>
                                        )}
                                    </div>

                                    {quotation.fileUrl && (
                                        <div className="flex items-center gap-4 pt-6 border-t border-slate-100">
                                            <div className="flex-1 p-3 bg-slate-50 rounded-lg border border-slate-100 flex items-center justify-between group hover:border-slate-300 transition-colors">
                                                <div>
                                                    <strong className="block text-xs font-semibold text-slate-500 mb-1">Archivo</strong>
                                                    <span className="text-sm text-slate-700 truncate block max-w-[150px]">
                                                        Documento PDF cargado
                                                    </span>
                                                </div>
                                                <Button variant="ghost" size="sm" asChild>
                                                    <a
                                                        href={`${import.meta.env.VITE_API_URL?.replace('/api', '')}/api/files/${quotation.fileUrl}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                    >
                                                        <Download className="h-4 w-4" />
                                                    </a>
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Quick Stats Card */}
                            <Card className="border-slate-200 shadow-sm bg-white/50 backdrop-blur-sm h-fit">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <DollarSign className="h-5 w-5 text-indigo-600" />
                                        Resumen
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                                        <Link2 className="h-5 w-5 text-indigo-600 mt-0.5" />
                                        <div className="flex-1">
                                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">OITs Vinculadas</p>
                                            <p className="text-lg font-medium text-slate-900 mt-1">{quotation.linkedOITs?.length || 0}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                                        <Sparkles className="h-5 w-5 text-indigo-600 mt-0.5" />
                                        <div className="flex-1">
                                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Análisis IA</p>
                                            <p className="text-sm font-medium text-slate-900 mt-1">
                                                {aiData ? 'Completado' : 'Pendiente'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                                        <CheckCircle2 className="h-5 w-5 text-indigo-600 mt-0.5" />
                                        <div className="flex-1">
                                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Cumplimiento</p>
                                            <p className="text-sm font-medium text-slate-900 mt-1">
                                                {complianceResult ? 'Verificado' : 'Sin verificar'}
                                            </p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    {/* Analysis Tab */}
                    <TabsContent value="analysis" className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {aiData ? (
                            <div className="space-y-6">
                                {/* Feedback Button */}
                                <div className="flex justify-end">
                                    <FeedbackButton
                                        onClick={() => openFeedbackModal(
                                            'QUOTATION_ANALYSIS',
                                            JSON.stringify(aiData, null, 2),
                                            `Análisis de Cotización ${quotation?.quotationNumber}`
                                        )}
                                    />
                                </div>
                                {/* Status Banner */}
                                <div className={`rounded-xl p-6 border ${aiData.status === 'check' ? 'bg-green-50 border-green-200' :
                                    aiData.status === 'error' ? 'bg-red-50 border-red-200' :
                                        'bg-amber-50 border-amber-200'
                                    }`}>
                                    <div className="flex items-center gap-4">
                                        <div className={`h-12 w-12 rounded-full flex items-center justify-center ${aiData.status === 'check' ? 'bg-green-100' :
                                            aiData.status === 'error' ? 'bg-red-100' :
                                                'bg-amber-100'
                                            }`}>
                                            {aiData.status === 'check' ? (
                                                <CheckCircle2 className="h-6 w-6 text-green-600" />
                                            ) : (
                                                <Sparkles className={`h-6 w-6 ${aiData.status === 'error' ? 'text-red-600' : 'text-amber-600'}`} />
                                            )}
                                        </div>
                                        <div>
                                            <h3 className={`text-lg font-semibold ${aiData.status === 'check' ? 'text-green-900' :
                                                aiData.status === 'error' ? 'text-red-900' :
                                                    'text-amber-900'
                                                }`}>
                                                {aiData.status === 'check' ? 'Documento Completo' :
                                                    aiData.status === 'error' ? 'Requiere Revisión' :
                                                        'Atención Requerida'}
                                            </h3>
                                            <p className={`text-sm ${aiData.status === 'check' ? 'text-green-700' :
                                                aiData.status === 'error' ? 'text-red-700' :
                                                    'text-amber-700'
                                                }`}>
                                                {aiData.status === 'check' ? 'El análisis no encontró problemas críticos' :
                                                    aiData.status === 'error' ? 'Se detectaron elementos faltantes importantes' :
                                                        'Hay algunos elementos que requieren atención'}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid md:grid-cols-2 gap-6">
                                    {/* Extracted Info */}
                                    {aiData.rawResponse && (() => {
                                        try {
                                            const rawData = JSON.parse(aiData.rawResponse);
                                            return (
                                                <Card className="border-slate-200 shadow-sm">
                                                    <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50">
                                                        <CardTitle className="text-base flex items-center gap-2">
                                                            <FileText className="h-4 w-4 text-indigo-600" />
                                                            Información Extraída
                                                        </CardTitle>
                                                    </CardHeader>
                                                    <CardContent className="pt-4 space-y-3">
                                                        {rawData.offer_id && (
                                                            <div className="flex justify-between items-center py-2 border-b border-slate-100">
                                                                <span className="text-sm text-slate-500">ID Oferta</span>
                                                                <span className="font-medium text-slate-900">{rawData.offer_id}</span>
                                                            </div>
                                                        )}
                                                        {rawData.date && (
                                                            <div className="flex justify-between items-center py-2 border-b border-slate-100">
                                                                <span className="text-sm text-slate-500">Fecha</span>
                                                                <span className="font-medium text-slate-900">{rawData.date}</span>
                                                            </div>
                                                        )}
                                                        {rawData.sender && (
                                                            <div className="flex justify-between items-center py-2 border-b border-slate-100">
                                                                <span className="text-sm text-slate-500">Remitente</span>
                                                                <span className="font-medium text-slate-900">{rawData.sender}</span>
                                                            </div>
                                                        )}
                                                        {rawData.position && (
                                                            <div className="flex justify-between items-center py-2 border-b border-slate-100">
                                                                <span className="text-sm text-slate-500">Cargo</span>
                                                                <span className="font-medium text-slate-900">{rawData.position}</span>
                                                            </div>
                                                        )}
                                                        {rawData.contact_commercial?.name && (
                                                            <div className="flex justify-between items-center py-2 border-b border-slate-100">
                                                                <span className="text-sm text-slate-500">Ejecutivo Comercial</span>
                                                                <span className="font-medium text-slate-900">{rawData.contact_commercial.name}</span>
                                                            </div>
                                                        )}
                                                        {rawData.contact_info?.email_general && (
                                                            <div className="flex justify-between items-center py-2">
                                                                <span className="text-sm text-slate-500">Email</span>
                                                                <span className="font-medium text-slate-900 text-sm">{rawData.contact_info.email_general}</span>
                                                            </div>
                                                        )}
                                                    </CardContent>
                                                </Card>
                                            );
                                        } catch {
                                            return null;
                                        }
                                    })()}

                                    {/* Services - Only show if services exist */}
                                    {aiData.services && aiData.services.length > 0 ? (
                                        <Card className="border-slate-200 shadow-sm">
                                            <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50">
                                                <CardTitle className="text-base flex items-center gap-2">
                                                    <Calendar className="h-4 w-4 text-blue-600" />
                                                    Servicios Detectados
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent className="pt-4">
                                                <div className="space-y-3">
                                                    {aiData.services.map((service: any, idx: number) => (
                                                        <div key={idx} className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                                                            <p className="font-medium text-slate-900">{service.name}</p>
                                                            {service.proposedDate && (
                                                                <p className="text-sm text-slate-500 mt-1">
                                                                    Fecha propuesta: {service.proposedDate}
                                                                </p>
                                                            )}
                                                            {service.duration && (
                                                                <p className="text-sm text-slate-500">
                                                                    Duración: {service.duration} día(s)
                                                                </p>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ) : aiData.rawResponse && (
                                        /* AI Commentary when no services detected */
                                        <Card className="border-slate-200 shadow-sm">
                                            <CardHeader className="bg-gradient-to-r from-slate-50 to-gray-50">
                                                <CardTitle className="text-base flex items-center gap-2">
                                                    <Sparkles className="h-4 w-4 text-indigo-600" />
                                                    Comentarios del Análisis
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent className="pt-4">
                                                {(() => {
                                                    try {
                                                        const rawData = JSON.parse(aiData.rawResponse);
                                                        return (
                                                            <div className="space-y-3 text-sm text-slate-700">
                                                                {rawData.decision_rule?.map((rule: any, idx: number) => (
                                                                    <div key={idx} className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                                                                        <p className="font-medium text-blue-900 mb-1">📋 Regla de Decisión</p>
                                                                        <p className="text-blue-800">{rule.description}</p>
                                                                    </div>
                                                                ))}
                                                                {rawData.confidentiality?.map((conf: any, idx: number) => (
                                                                    <div key={idx} className="p-3 bg-green-50 rounded-lg border border-green-100">
                                                                        <p className="font-medium text-green-900 mb-1">🔒 Confidencialidad</p>
                                                                        <p className="text-green-800">{conf.description}</p>
                                                                    </div>
                                                                ))}
                                                                {rawData.equipment_availability?.map((eq: any, idx: number) => (
                                                                    <div key={idx} className="p-3 bg-amber-50 rounded-lg border border-amber-100">
                                                                        <p className="font-medium text-amber-900 mb-1">🔧 Disponibilidad de Equipos</p>
                                                                        <p className="text-amber-800">{eq.description}</p>
                                                                    </div>
                                                                ))}
                                                                {!rawData.decision_rule && !rawData.confidentiality && !rawData.equipment_availability && (
                                                                    <p className="text-slate-600 italic">
                                                                        El documento fue analizado correctamente. No se encontraron servicios específicos pero la información general fue extraída exitosamente.
                                                                    </p>
                                                                )}
                                                            </div>
                                                        );
                                                    } catch {
                                                        return (
                                                            <p className="text-sm text-slate-600 italic">
                                                                El documento fue analizado. Revise la información extraída para más detalles.
                                                            </p>
                                                        );
                                                    }
                                                })()}
                                            </CardContent>
                                        </Card>
                                    )}
                                </div>

                                {/* Alerts & Missing */}
                                {((aiData.alerts && aiData.alerts.length > 0) || (aiData.missing && aiData.missing.length > 0)) && (
                                    <div className="grid md:grid-cols-2 gap-6">
                                        {aiData.alerts && aiData.alerts.length > 0 && (
                                            <Card className="border-amber-200 shadow-sm">
                                                <CardHeader className="bg-amber-50">
                                                    <CardTitle className="text-base text-amber-900">⚠️ Alertas</CardTitle>
                                                </CardHeader>
                                                <CardContent className="pt-4">
                                                    <ul className="space-y-2">
                                                        {aiData.alerts.map((alert: string, idx: number) => (
                                                            <li key={idx} className="flex items-start gap-2 text-sm text-amber-800">
                                                                <span className="text-amber-500 mt-0.5">•</span>
                                                                {alert}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </CardContent>
                                            </Card>
                                        )}
                                        {aiData.missing && aiData.missing.length > 0 && (
                                            <Card className="border-red-200 shadow-sm">
                                                <CardHeader className="bg-red-50">
                                                    <CardTitle className="text-base text-red-900">❌ Elementos Faltantes</CardTitle>
                                                </CardHeader>
                                                <CardContent className="pt-4">
                                                    <ul className="space-y-2">
                                                        {aiData.missing.map((item: string, idx: number) => (
                                                            <li key={idx} className="flex items-start gap-2 text-sm text-red-800">
                                                                <span className="text-red-500 mt-0.5">•</span>
                                                                {item}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </CardContent>
                                            </Card>
                                        )}
                                    </div>
                                )}

                                {/* Location */}
                                {aiData.location && (
                                    <Card className="border-slate-200 shadow-sm">
                                        <CardContent className="py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 bg-slate-100 rounded-full flex items-center justify-center">
                                                    <Building2 className="h-5 w-5 text-slate-600" />
                                                </div>
                                                <div>
                                                    <p className="text-xs text-slate-500 uppercase tracking-wider">Ubicación</p>
                                                    <p className="font-medium text-slate-900">{aiData.location}</p>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                )}
                            </div>
                        ) : (
                            <Card className="border-slate-200 shadow-sm bg-white/50 backdrop-blur-sm">
                                <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                                    <div className="h-16 w-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                                        <Sparkles className="h-8 w-8 text-slate-400" />
                                    </div>
                                    <h3 className="text-lg font-semibold text-slate-900">No hay análisis disponible</h3>
                                    <p className="text-slate-500 max-w-md mt-2">
                                        Esta cotización aún no ha sido analizada por IA. Haz clic en "Analizar con IA" para obtener un análisis detallado.
                                    </p>
                                    {quotation.status === 'PENDING' && (
                                        <Button onClick={handleAnalyze} disabled={isAnalyzing} className="mt-4">
                                            {isAnalyzing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                                            Analizar ahora
                                        </Button>
                                    )}
                                </CardContent>
                            </Card>
                        )}
                    </TabsContent>

                    {/* Compliance Tab */}
                    <TabsContent value="compliance" className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {complianceResult ? (
                            <div className="space-y-6">
                                {/* Score & Status Banner */}
                                <div className={`rounded-xl p-6 border ${complianceResult.compliant === true ? 'bg-green-50 border-green-200' :
                                    complianceResult.compliant === false ? 'bg-red-50 border-red-200' :
                                        'bg-amber-50 border-amber-200'
                                    }`}>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className={`h-16 w-16 rounded-full flex items-center justify-center ${complianceResult.compliant === true ? 'bg-green-100' :
                                                complianceResult.compliant === false ? 'bg-red-100' :
                                                    'bg-amber-100'
                                                }`}>
                                                {complianceResult.compliant === true ? (
                                                    <CheckCircle2 className="h-8 w-8 text-green-600" />
                                                ) : complianceResult.compliant === false ? (
                                                    <XCircle className="h-8 w-8 text-red-600" />
                                                ) : (
                                                    <AlertTriangle className="h-8 w-8 text-amber-600" />
                                                )}
                                            </div>
                                            <div>
                                                <h3 className={`text-xl font-bold ${complianceResult.compliant === true ? 'text-green-900' :
                                                    complianceResult.compliant === false ? 'text-red-900' :
                                                        'text-amber-900'
                                                    }`}>
                                                    {complianceResult.compliant === true ? 'CUMPLE' :
                                                        complianceResult.compliant === false ? 'NO CUMPLE' :
                                                            'REQUIERE REVISIÓN'}
                                                </h3>
                                                <p className="text-sm text-slate-600 mt-1">
                                                    Verificado: {complianceResult.analyzedAt ?
                                                        new Date(complianceResult.analyzedAt).toLocaleString('es-ES') : 'N/A'}
                                                </p>
                                                {complianceResult.standardsCount !== undefined && (
                                                    <p className="text-xs text-slate-500">
                                                        Normas verificadas: {complianceResult.standardsCount}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        {/* Score Circle */}
                                        {complianceResult.score !== undefined && (
                                            <div className="text-center">
                                                <div className={`w-20 h-20 rounded-full border-4 flex items-center justify-center ${complianceResult.score >= 80 ? 'border-green-500 bg-green-50' :
                                                    complianceResult.score >= 50 ? 'border-amber-500 bg-amber-50' :
                                                        'border-red-500 bg-red-50'
                                                    }`}>
                                                    <span className={`text-2xl font-bold ${complianceResult.score >= 80 ? 'text-green-700' :
                                                        complianceResult.score >= 50 ? 'text-amber-700' :
                                                            'text-red-700'
                                                        }`}>{complianceResult.score}</span>
                                                </div>
                                                <p className="text-xs text-slate-500 mt-1">Puntuación</p>
                                            </div>
                                        )}
                                    </div>
                                    {/* Summary */}
                                    {complianceResult.summary && (
                                        <p className="mt-4 text-sm text-slate-700 bg-white/50 p-3 rounded-lg">
                                            {complianceResult.summary}
                                        </p>
                                    )}
                                </div>

                                {/* Issues List - Detailed */}
                                {complianceResult.issues && complianceResult.issues.length > 0 && (
                                    <Card className="border-red-200 shadow-sm">
                                        <CardHeader className="bg-gradient-to-r from-red-50 to-orange-50">
                                            <CardTitle className="text-base flex items-center gap-2 text-red-900">
                                                <XCircle className="h-5 w-5" />
                                                Incumplimientos Detectados ({complianceResult.issues.length})
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="pt-4 space-y-3">
                                            {complianceResult.issues.map((issue: any, idx: number) => (
                                                <div key={idx} className={`p-4 rounded-lg border ${issue.severity === 'CRITICAL' ? 'bg-red-50 border-red-200' :
                                                    issue.severity === 'WARNING' ? 'bg-amber-50 border-amber-200' :
                                                        'bg-blue-50 border-blue-200'
                                                    }`}>
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <span className={`px-2 py-0.5 text-xs font-bold rounded ${issue.severity === 'CRITICAL' ? 'bg-red-500 text-white' :
                                                            issue.severity === 'WARNING' ? 'bg-amber-500 text-white' :
                                                                'bg-blue-500 text-white'
                                                            }`}>
                                                            {issue.severity || 'INFO'}
                                                        </span>
                                                        {issue.category && (
                                                            <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">{issue.category}</span>
                                                        )}
                                                        {issue.parameter && (
                                                            <span className="text-xs font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded">
                                                                🔬 {issue.parameter}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="mt-2 font-medium text-slate-900">{issue.description}</p>
                                                    {issue.normReference && (
                                                        <p className="mt-1 text-xs text-slate-600 bg-slate-100 p-2 rounded">
                                                            📋 <strong>Norma:</strong> {issue.normReference}
                                                        </p>
                                                    )}
                                                    {issue.location && (
                                                        <p className="mt-1 text-xs text-slate-500">
                                                            📍 <strong>Ubicación:</strong> {issue.location}
                                                        </p>
                                                    )}
                                                    {issue.recommendation && (
                                                        <p className="mt-2 text-sm text-green-800 bg-green-50 p-2 rounded border border-green-200">
                                                            💡 <strong>Acción:</strong> {issue.recommendation}
                                                        </p>
                                                    )}
                                                </div>
                                            ))}
                                        </CardContent>
                                    </Card>
                                )}

                                {/* Missing Parameters & Recommendations */}
                                <div className="grid md:grid-cols-2 gap-6">
                                    {/* Missing Parameters */}
                                    {complianceResult.missingParameters && complianceResult.missingParameters.length > 0 && (
                                        <Card className="border-amber-200 shadow-sm">
                                            <CardHeader className="bg-amber-50">
                                                <CardTitle className="text-base flex items-center gap-2 text-amber-900">
                                                    <AlertTriangle className="h-4 w-4" />
                                                    Parámetros Faltantes ({complianceResult.missingParameters.length})
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent className="pt-4">
                                                <ul className="space-y-3">
                                                    {complianceResult.missingParameters.map((param: any, idx: number) => (
                                                        <li key={idx} className="p-3 bg-amber-50 rounded border border-amber-200">
                                                            {typeof param === 'string' ? (
                                                                <span className="text-sm text-amber-800">{param}</span>
                                                            ) : (
                                                                <div className="space-y-1">
                                                                    <p className="font-bold text-amber-900">🔬 {param.parameter}</p>
                                                                    {param.norm && <p className="text-xs text-amber-700">📋 Norma: {param.norm}</p>}
                                                                    {param.article && <p className="text-xs text-amber-600">📌 Artículo: {param.article}</p>}
                                                                    {param.requiredMethod && <p className="text-xs text-amber-600">🧪 Método: {param.requiredMethod}</p>}
                                                                </div>
                                                            )}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </CardContent>
                                        </Card>
                                    )}
                                    {complianceResult.recommendations && complianceResult.recommendations.length > 0 && (
                                        <Card className="border-blue-200 shadow-sm">
                                            <CardHeader className="bg-blue-50">
                                                <CardTitle className="text-base flex items-center gap-2 text-blue-900">
                                                    💡 Recomendaciones
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent className="pt-4">
                                                <ul className="space-y-2">
                                                    {complianceResult.recommendations.map((rec: any, idx: number) => (
                                                        <li key={idx} className="flex items-start gap-2 text-sm text-blue-800 p-2 bg-blue-50 rounded">
                                                            <span className="text-blue-500 mt-0.5">→</span>
                                                            {typeof rec === 'string' ? rec : JSON.stringify(rec)}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </CardContent>
                                        </Card>
                                    )}
                                </div>

                                {/* Compliant Items */}
                                {complianceResult.compliantItems && complianceResult.compliantItems.length > 0 && (
                                    <Card className="border-green-200 shadow-sm">
                                        <CardHeader className="bg-green-50">
                                            <CardTitle className="text-base flex items-center gap-2 text-green-900">
                                                <CheckCircle2 className="h-4 w-4" />
                                                Requisitos Cumplidos ({complianceResult.compliantItems.length})
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="pt-4">
                                            <ul className="grid md:grid-cols-2 gap-2">
                                                {complianceResult.compliantItems.map((item: any, idx: number) => (
                                                    <li key={idx} className="flex items-start gap-2 text-sm text-green-800">
                                                        <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                                                        {typeof item === 'string' ? item : JSON.stringify(item)}
                                                    </li>
                                                ))}
                                            </ul>
                                        </CardContent>
                                    </Card>
                                )}

                                {/* Applied Standards */}
                                {complianceResult.appliedStandards && complianceResult.appliedStandards.length > 0 && (
                                    <Card className="border-slate-200 shadow-sm">
                                        <CardHeader className="bg-slate-50">
                                            <CardTitle className="text-base text-slate-700">
                                                📚 Normas Aplicadas
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="pt-4">
                                            <div className="flex flex-wrap gap-2">
                                                {complianceResult.appliedStandards.map((std: any, idx: number) => (
                                                    <span key={idx} className="px-3 py-1 bg-slate-100 text-slate-700 text-sm rounded-full">
                                                        {typeof std === 'string' ? std : (std.title || std.name || JSON.stringify(std))}
                                                    </span>
                                                ))}
                                            </div>
                                        </CardContent>
                                    </Card>
                                )}
                            </div>
                        ) : (
                            <Card className="border-slate-200 shadow-sm bg-white/50 backdrop-blur-sm">
                                <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                                    <div className="h-16 w-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                                        <CheckCircle2 className="h-8 w-8 text-slate-400" />
                                    </div>
                                    <h3 className="text-lg font-semibold text-slate-900">Sin verificación de cumplimiento</h3>
                                    <p className="text-slate-500 max-w-md mt-2">
                                        No se ha realizado una verificación de cumplimiento para esta cotización.
                                    </p>
                                </CardContent>
                            </Card>
                        )
                        }
                    </TabsContent>

                    {/* Linked OITs Tab */}
                    <TabsContent value="linked" className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <Card className="border-slate-200 shadow-sm bg-white/50 backdrop-blur-sm">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Link2 className="h-5 w-5 text-blue-600" />
                                    OITs Vinculadas
                                </CardTitle>
                                <CardDescription>
                                    Órdenes de inspección y trabajo que utilizan esta cotización
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {quotation.linkedOITs && quotation.linkedOITs.length > 0 ? (
                                    <div className="grid gap-3">
                                        {quotation.linkedOITs.map(oit => (
                                            <button
                                                key={oit.id}
                                                onClick={() => navigate(`/oits/${oit.id}`)}
                                                className="group p-4 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 transition-all text-left shadow-sm"
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <p className="font-semibold text-slate-900 group-hover:text-indigo-700">
                                                            {oit.oitNumber}
                                                        </p>
                                                        {oit.description && (
                                                            <p className="text-sm text-slate-500 mt-1 line-clamp-1">{oit.description}</p>
                                                        )}
                                                    </div>
                                                    <Badge variant="outline">{oit.status}</Badge>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-12 text-center">
                                        <div className="h-16 w-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                                            <Link2 className="h-8 w-8 text-slate-400" />
                                        </div>
                                        <h3 className="text-lg font-semibold text-slate-700 mb-2">Sin OITs vinculadas</h3>
                                        <p className="text-slate-500 max-w-md">
                                            Esta cotización aún no ha sido vinculada a ninguna orden de inspección.
                                        </p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent >
                </Tabs >
            </div >

            {/* Feedback Modal */}
            <FeedbackModal
                open={feedbackModalOpen}
                onOpenChange={setFeedbackModalOpen}
                category={feedbackCategory}
                aiOutput={feedbackAiOutput}
                title={feedbackTitle}
            />
        </div >
    );
}
