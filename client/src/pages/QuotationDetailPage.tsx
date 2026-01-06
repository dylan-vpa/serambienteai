import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import api from '@/lib/api';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, FileText, Building2, Calendar, Download, Link2, Sparkles, Loader2 } from 'lucide-react';

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
            'REVIEW_REQUIRED': 'Revisión Requerida'
        };
        return <Badge className={`${styles[status] || styles['PENDING']}`}>{labels[status] || status}</Badge>;
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

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate('/quotations')}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight text-slate-900">{quotation.quotationNumber}</h2>
                        <p className="text-slate-500">{quotation.clientName || 'Sin cliente asignado'}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {getStatusBadge(quotation.status)}
                    {quotation.status === 'PENDING' && (
                        <Button onClick={handleAnalyze} disabled={isAnalyzing}>
                            {isAnalyzing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                            Analizar
                        </Button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Info */}
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <FileText className="h-5 w-5" />
                            Información
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-sm text-slate-500">Número</p>
                                <p className="font-medium">{quotation.quotationNumber}</p>
                            </div>
                            <div>
                                <p className="text-sm text-slate-500">Cliente</p>
                                <p className="font-medium flex items-center gap-1">
                                    <Building2 className="h-4 w-4 text-slate-400" />
                                    {quotation.clientName || '-'}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-slate-500">Fecha de Creación</p>
                                <p className="font-medium flex items-center gap-1">
                                    <Calendar className="h-4 w-4 text-slate-400" />
                                    {new Date(quotation.createdAt).toLocaleDateString('es-ES')}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-slate-500">Archivo</p>
                                {quotation.fileUrl ? (
                                    <a
                                        href={`${import.meta.env.VITE_API_URL?.replace('/api', '')}/api/files/${quotation.fileUrl}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="font-medium text-blue-600 hover:underline flex items-center gap-1"
                                    >
                                        <Download className="h-4 w-4" />
                                        Descargar PDF
                                    </a>
                                ) : <p className="text-slate-400">Sin archivo</p>}
                            </div>
                        </div>
                        {quotation.description && (
                            <div>
                                <p className="text-sm text-slate-500">Descripción</p>
                                <p className="font-medium">{quotation.description}</p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Linked OITs */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Link2 className="h-5 w-5" />
                            OITs Vinculadas
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {quotation.linkedOITs?.length ? (
                            <ul className="space-y-2">
                                {quotation.linkedOITs.map(oit => (
                                    <li key={oit.id}>
                                        <button
                                            onClick={() => navigate(`/oits/${oit.id}`)}
                                            className="w-full text-left p-2 rounded border border-slate-200 hover:bg-slate-50 transition-colors"
                                        >
                                            <p className="font-medium text-slate-900">{oit.oitNumber}</p>
                                            <p className="text-sm text-slate-500">{oit.status}</p>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-slate-400 text-center py-4">Ninguna OIT vinculada</p>
                        )}
                    </CardContent>
                </Card>

                {/* Compliance Result */}
                {quotation.complianceResult && (
                    <Card className="lg:col-span-3">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Sparkles className="h-5 w-5" />
                                Resultado del Análisis
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <pre className="bg-slate-50 p-4 rounded-lg text-sm overflow-auto max-h-96">
                                {JSON.stringify(JSON.parse(quotation.complianceResult), null, 2)}
                            </pre>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}
