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
    FileText, Building2, Calendar, Download, Link2,
    Sparkles, Loader2, DollarSign, CheckCircle2,
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
                        <TabsList className="grid w-full max-w-2xl grid-cols-4 bg-white p-1 rounded-xl sm:rounded-full border border-slate-200 shadow-sm h-auto transition-all duration-300">
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
                            <Card className="border-indigo-200 shadow-sm bg-white/50 backdrop-blur-sm">
                                <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-t-lg">
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
                                        ) : aiData.analysis ? (
                                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{aiData.analysis}</ReactMarkdown>
                                        ) : (
                                            <pre className="bg-slate-50 p-4 rounded-lg text-sm overflow-auto max-h-96 border border-slate-200">
                                                {JSON.stringify(aiData, null, 2)}
                                            </pre>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
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
                            <Card className="border-green-200 shadow-sm bg-white/50 backdrop-blur-sm">
                                <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-t-lg">
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
                        )}
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
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
