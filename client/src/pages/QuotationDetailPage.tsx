import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import api from '@/lib/api';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
    ArrowLeft, FileText, Building2, Calendar, Download, Link2,
    Sparkles, Loader2, DollarSign, CheckCircle2, AlertCircle,
    Clock, Hash
} from 'lucide-react';

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
    const [activeTab, setActiveTab] = useState('info');

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

    const getStatusBadge = (status: string) => {
        const config = {
            'PENDING': { className: 'bg-yellow-100 text-yellow-700 border-yellow-300', label: 'Pendiente', icon: Clock },
            'ANALYZING': { className: 'bg-blue-100 text-blue-700 border-blue-300', label: 'Analizando', icon: Loader2 },
            'COMPLIANT': { className: 'bg-green-100 text-green-700 border-green-300', label: 'Conforme', icon: CheckCircle2 },
            'NON_COMPLIANT': { className: 'bg-red-100 text-red-700 border-red-300', label: 'No Conforme', icon: AlertCircle },
            'REVIEW_REQUIRED': { className: 'bg-orange-100 text-orange-700 border-orange-300', label: 'Revisión Requerida', icon: AlertCircle }
        };
        const { className = '', label = status, icon: Icon = Hash } = config[status as keyof typeof config] || {};
        return (
            <Badge className={`${className} flex items-center gap-1`}>
                <Icon className="h-3 w-3" />
                {label}
            </Badge>
        );
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
            <div className="space-y-6">
                <Skeleton className="h-8 w-48" />
                <Card>
                    <CardContent className="p-6">
                        <Skeleton className="h-64 w-full" />
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (!quotation) {
        return <div className="text-center text-slate-500">Cotización no encontrada</div>;
    }

    const aiData = parseAIData();
    const complianceResult = parseComplianceResult();

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate('/quotations')}
                        className="hover:bg-slate-100"
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                                {quotation.quotationNumber}
                            </h1>
                            {getStatusBadge(quotation.status)}
                        </div>
                        <p className="text-slate-500 mt-1 flex items-center gap-2">
                            <Building2 className="h-4 w-4" />
                            {quotation.clientName || 'Sin cliente asignado'}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {quotation.status === 'PENDING' && (
                        <Button onClick={handleAnalyze} disabled={isAnalyzing} className="bg-indigo-600 hover:bg-indigo-700">
                            {isAnalyzing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                            Analizar con IA
                        </Button>
                    )}
                    {quotation.fileUrl && (
                        <Button variant="outline" asChild>
                            <a
                                href={`${import.meta.env.VITE_API_URL?.replace('/api', '')}/api/files/${quotation.fileUrl}`}
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                <Download className="mr-2 h-4 w-4" />
                                Descargar PDF
                            </a>
                        </Button>
                    )}
                </div>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <TabsList className="bg-slate-100">
                    <TabsTrigger value="info" className="data-[state=active]:bg-white">
                        <FileText className="h-4 w-4 mr-2" />
                        Información
                    </TabsTrigger>
                    <TabsTrigger value="analysis" className="data-[state=active]:bg-white">
                        <Sparkles className="h-4 w-4 mr-2" />
                        Análisis IA
                        {aiData && <Badge className="ml-2 bg-indigo-100 text-indigo-700 text-xs">Disponible</Badge>}
                    </TabsTrigger>
                    <TabsTrigger value="compliance" className="data-[state=active]:bg-white">
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Cumplimiento
                        {complianceResult && <Badge className="ml-2 bg-green-100 text-green-700 text-xs">Completado</Badge>}
                    </TabsTrigger>
                    <TabsTrigger value="linked" className="data-[state=active]:bg-white">
                        <Link2 className="h-4 w-4 mr-2" />
                        OITs Vinculadas
                        {quotation.linkedOITs && quotation.linkedOITs.length > 0 && (
                            <Badge className="ml-2 bg-blue-100 text-blue-700 text-xs">{quotation.linkedOITs.length}</Badge>
                        )}
                    </TabsTrigger>
                </TabsList>

                {/* Info Tab */}
                <TabsContent value="info" className="space-y-6">
                    <Card className="border-slate-200 shadow-sm">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <DollarSign className="h-5 w-5 text-indigo-600" />
                                Detalles de la Cotización
                            </CardTitle>
                            <CardDescription>Información general y metadatos</CardDescription>
                        </CardHeader>
                        <CardContent className="grid md:grid-cols-2 gap-6">
                            <div className="space-y-1">
                                <p className="text-sm font-medium text-slate-500">Número de Cotización</p>
                                <p className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                                    <Hash className="h-4 w-4 text-slate-400" />
                                    {quotation.quotationNumber}
                                </p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-sm font-medium text-slate-500">Cliente</p>
                                <p className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                                    <Building2 className="h-4 w-4 text-slate-400" />
                                    {quotation.clientName || '-'}
                                </p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-sm font-medium text-slate-500">Fecha de Creación</p>
                                <p className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                                    <Calendar className="h-4 w-4 text-slate-400" />
                                    {new Date(quotation.createdAt).toLocaleDateString('es-ES', {
                                        weekday: 'long',
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric'
                                    })}
                                </p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-sm font-medium text-slate-500">Estado</p>
                                <div>{getStatusBadge(quotation.status)}</div>
                            </div>
                            {quotation.description && (
                                <div className="md:col-span-2 space-y-1">
                                    <p className="text-sm font-medium text-slate-500">Descripción</p>
                                    <p className="text-slate-700 bg-slate-50 p-4 rounded-lg">{quotation.description}</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Analysis Tab */}
                <TabsContent value="analysis" className="space-y-6">
                    {aiData ? (
                        <Card className="border-indigo-200 shadow-sm">
                            <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50">
                                <CardTitle className="flex items-center gap-2">
                                    <Sparkles className="h-5 w-5 text-indigo-600" />
                                    Análisis de IA
                                </CardTitle>
                                <CardDescription>Resultados del análisis automático</CardDescription>
                            </CardHeader>
                            <CardContent className="pt-6">
                                <div className="prose prose-slate max-w-none">
                                    {typeof aiData === 'string' ? (
                                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{aiData}</ReactMarkdown>
                                    ) : (
                                        <pre className="bg-slate-50 p-4 rounded-lg text-sm overflow-auto max-h-96 border border-slate-200">
                                            {JSON.stringify(aiData, null, 2)}
                                        </pre>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ) : (
                        <Card className="border-slate-200">
                            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                                <Sparkles className="h-12 w-12 text-slate-300 mb-4" />
                                <h3 className="text-lg font-semibold text-slate-700 mb-2">No hay análisis disponible</h3>
                                <p className="text-slate-500 max-w-md mb-4">
                                    Esta cotización aún no ha sido analizada por IA. Haz clic en "Analizar con IA" para obtener un análisis detallado.
                                </p>
                                {quotation.status === 'PENDING' && (
                                    <Button onClick={handleAnalyze} disabled={isAnalyzing}>
                                        {isAnalyzing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                                        Analizar ahora
                                    </Button>
                                )}
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>

                {/* Compliance Tab */}
                <TabsContent value="compliance" className="space-y-6">
                    {complianceResult ? (
                        <Card className="border-green-200 shadow-sm">
                            <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50">
                                <CardTitle className="flex items-center gap-2">
                                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                                    Resultado de Cumplimiento
                                </CardTitle>
                                <CardDescription>Verificación de requisitos y normativas</CardDescription>
                            </CardHeader>
                            <CardContent className="pt-6">
                                <pre className="bg-slate-50 p-4 rounded-lg text-sm overflow-auto max-h-96 border border-slate-200">
                                    {JSON.stringify(complianceResult, null, 2)}
                                </pre>
                            </CardContent>
                        </Card>
                    ) : (
                        <Card className="border-slate-200">
                            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                                <CheckCircle2 className="h-12 w-12 text-slate-300 mb-4" />
                                <h3 className="text-lg font-semibold text-slate-700 mb-2">Sin verificación de cumplimiento</h3>
                                <p className="text-slate-500 max-w-md">
                                    No se ha realizado una verificación de cumplimiento para esta cotización.
                                </p>
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>

                {/* Linked OITs Tab */}
                <TabsContent value="linked" className="space-y-6">
                    <Card className="border-slate-200 shadow-sm">
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
                                            className="group p-4 rounded-lg border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 transition-all text-left"
                                        >
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="font-semibold text-slate-900 group-hover:text-indigo-700">
                                                        {oit.oitNumber}
                                                    </p>
                                                    {oit.description && (
                                                        <p className="text-sm text-slate-500 mt-1">{oit.description}</p>
                                                    )}
                                                </div>
                                                <Badge variant="outline">{oit.status}</Badge>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-12 text-center">
                                    <Link2 className="h-12 w-12 text-slate-300 mb-4" />
                                    <h3 className="text-lg font-semibold text-slate-700 mb-2">Sin OITs vinculadas</h3>
                                    <p className="text-slate-500 max-w-md">
                                        Esta cotización aún no ha sido vinculada a ninguna orden de inspección.
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}


