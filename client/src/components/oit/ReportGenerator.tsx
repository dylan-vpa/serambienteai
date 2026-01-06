import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileBarChart, Upload, Loader2, CheckCircle2, Download, Sparkles } from 'lucide-react';
import { notify } from '@/lib/notify';
import api from '@/lib/api';
import { useAuthStore } from '@/features/auth/authStore';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { FeedbackModal, FeedbackButton } from '@/components/feedback/FeedbackModal';

interface ReportGeneratorProps {
    oitId: string;
    finalReportUrl?: string | null;
    initialAnalysis?: any;
}

export function ReportGenerator({ oitId, finalReportUrl: initialReportUrl, initialAnalysis }: ReportGeneratorProps) {
    const [isGenerating, setIsGenerating] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [analysisFile, setAnalysisFile] = useState<File | null>(null);
    const [reportGenerated, setReportGenerated] = useState(!!initialReportUrl);
    const [labResultsUrl, setLabResultsUrl] = useState<string | null>(null);
    const [finalReportUrl, setFinalReportUrl] = useState<string | null>(null);
    const [analysisData, setAnalysisData] = useState<any | null>(initialAnalysis || null);
    const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);

    // New state for verification
    const [fieldFormFile, setFieldFormFile] = useState<File | null>(null);
    const [isVerifying, setIsVerifying] = useState(false);
    const [verificationResult, setVerificationResult] = useState<any>(null);


    const { user } = useAuthStore();
    const canDownload = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';

    // Initialize/Update finalReportUrl from prop
    useEffect(() => {
        if (initialReportUrl) {
            // If already complete URL or blob
            if (initialReportUrl.startsWith('http') || initialReportUrl.startsWith('blob:')) {
                setFinalReportUrl(initialReportUrl);
            } else {
                // Construct URL from filename (assuming stored in uploads/reports)
                const baseUrl = (api.defaults.baseURL || '').replace(/\/api$/, '');
                setFinalReportUrl(`${baseUrl}/uploads/${initialReportUrl}`);
            }
            setReportGenerated(true);
        }
    }, [initialReportUrl]);

    // Update analysis data if prop changes
    useEffect(() => {
        if (initialAnalysis) {
            setAnalysisData(initialAnalysis);
        }
    }, [initialAnalysis]);

    // Polling for Analysis
    useEffect(() => {
        let intervalId: any;

        // If we have uploaded a file (labResultsUrl is set) but no analysis yet, poll!
        // Or if we are explicitly in a "waiting" state.
        // We check if we have a labResultsUrl (meaning file exists) but no analysisData.
        if (labResultsUrl && !analysisData) {
            intervalId = setInterval(async () => {
                try {
                    console.log('Polling for analysis...');
                    const response = await api.get(`/oits/${oitId}`);
                    if (response.data && response.data.labResultsAnalysis) {
                        setAnalysisData(response.data.labResultsAnalysis);
                        // Also update parent/context if possible, but local state is enough for display
                        notify.success('¡Análisis IA Completado!');
                    }
                } catch (error) {
                    console.error('Error polling OIT:', error);
                }
            }, 5000); // Poll every 5 seconds
        }

        return () => {
            if (intervalId) clearInterval(intervalId);
        };
    }, [oitId, labResultsUrl, analysisData]);

    const handleAnalysisUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setAnalysisFile(file);
        setIsUploading(true);

        try {
            const formData = new FormData();
            formData.append('file', file);

            const response = await api.post(`/oits/${oitId}/lab-results`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            setLabResultsUrl(URL.createObjectURL(file));

            // Analysis will be polled by parent or updated via state if immediate
            if (response.data && response.data.labResultsAnalysis) {
                setAnalysisData(response.data.labResultsAnalysis);
            }

            notify.success('Resultados de laboratorio cargados. Analizando...');
        } catch (error) {
            console.error('Error uploading lab results:', error);
            notify.error('Error al cargar resultados');
        } finally {
            setIsUploading(false);
        }
    };

    const handleFieldFormUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setFieldFormFile(file);
        // Upload logic if needed immediately or keep local until verify?
        // Let's assume we need to upload it for the backend to read it
        const formData = new FormData();
        formData.append('oitFile', file); // Multer expects specific field? reusing updateOIT endpoint or need new one?
        // Actually schema has oitFileUrl but we added fieldFormUrl.
        // We probably need a specific endpoint or use updateOIT with specific field.
        // Let's us updateOIT PATCH.
        try {
            await api.patch(`/oits/${oitId}`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            notify.success('Planilla cargada');
        } catch (e) { console.error(e); notify.error('Error cargando planilla'); }
    };

    const handleVerify = async () => {
        setIsVerifying(true);
        try {
            const res = await api.post(`/oits/${oitId}/verify`);
            setVerificationResult(res.data);
            if (res.data.valid) notify.success('Verificación Exitosa');
            else notify.warning('Se encontraron discrepancias');
        } catch (e) {
            console.error(e);
            notify.error('Error en verificación');
        } finally {
            setIsVerifying(false);
        }
    };

    const handleGenerateReport = async () => {
        if (!analysisFile && !finalReportUrl) {
            notify.error('Sube los resultados de laboratorio primero');
            return;
        }

        setIsGenerating(true);
        try {
            const response = await api.post(`/oits/${oitId}/generate-final-report`, {}, {
                responseType: 'blob'
            });

            // Determine content type from headers or default to octet-stream
            const contentType = response.headers['content-type'] || 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
            const isPdf = contentType.includes('pdf');

            const fileBlob = new Blob([response.data], { type: contentType });
            const url = window.URL.createObjectURL(fileBlob);
            setFinalReportUrl(url);
            setReportGenerated(true);

            // Auto-trigger download with correct extension
            const link = document.createElement('a');
            link.href = url;
            link.download = `Informe_Final_OIT-${oitId}.${isPdf ? 'pdf' : 'docx'}`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            notify.success('Informe final generado exitosamente');
        } catch (error) {
            console.error('Error generating report:', error);
            notify.error('Error al generar informe');
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Lab Results Upload Card */}
            <Card className="border-slate-200 shadow-sm bg-white overflow-hidden">
                <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600">
                                <Upload className="h-4 w-4" />
                            </div>
                            <div>
                                <CardTitle className="text-base font-semibold text-slate-900">1. Cargar Resultados de Lab</CardTitle>
                                <CardDescription className="text-xs text-slate-500">Sube el reporte oficial emitido por el laboratorio.</CardDescription>
                            </div>
                        </div>
                        {labResultsUrl && canDownload && (
                            <Button variant="ghost" size="sm" asChild className="h-8 text-xs">
                                <a href={labResultsUrl} download>
                                    <Download className="h-3.5 w-3.5 mr-1" />
                                    Bajar Original
                                </a>
                            </Button>
                        )}
                    </div>
                </CardHeader>
                <CardContent className="pt-6">
                    <div className={`relative w-full h-32 border-2 border-dashed rounded-xl flex flex-col items-center justify-center transition-all ${analysisFile || labResultsUrl ? 'border-emerald-500 bg-emerald-50/10' : 'border-slate-200 hover:border-slate-400 bg-slate-50/50 group'}`}>
                        <input
                            type="file"
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                            onChange={handleAnalysisUpload}
                            accept=".pdf,.xlsx,.csv"
                            disabled={isUploading}
                        />
                        {isUploading ? (
                            <div className="flex flex-col items-center">
                                <Loader2 className="h-8 w-8 text-emerald-500 animate-spin mb-2" />
                                <p className="text-sm font-medium text-slate-600">Procesando archivo...</p>
                            </div>
                        ) : (analysisFile || labResultsUrl) ? (
                            <div className="flex flex-col items-center">
                                <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center mb-2">
                                    <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                                </div>
                                <p className="text-sm font-semibold text-slate-900">{analysisFile?.name || 'Archivo Cargado'}</p>
                                <p className="text-xs text-slate-500 mt-1">Haga clic o arrastre para reemplazar</p>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center group-hover:scale-105 transition-transform">
                                <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center mb-2">
                                    <Upload className="h-5 w-5 text-slate-400" />
                                </div>
                                <p className="text-sm font-semibold text-slate-600">Seleccionar reporte de lab</p>
                                <p className="text-xs text-slate-400 mt-1">PDF, Excel o CSV hasta 10MB</p>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* AI Analysis Result Card - Premium Style */}
            {(analysisData || isUploading) && (
                <Card className="border-indigo-200 shadow-md bg-indigo-50/30 overflow-hidden animate-in fade-in slide-in-from-top-4 duration-500">
                    <CardHeader className="pb-3 border-b border-indigo-100 bg-indigo-100/30 backdrop-blur-sm">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-indigo-200 shadow-lg">
                                <Sparkles className="h-5 w-5" />
                            </div>
                            <div>
                                <CardTitle className="text-lg font-bold text-indigo-900 flex items-center gap-2">
                                    Análisis Técnico IA
                                    <Badge variant="outline" className="bg-indigo-100/50 border-indigo-300 text-indigo-700 text-[10px] uppercase tracking-wider px-2 h-5">Automático</Badge>
                                </CardTitle>
                                <CardDescription className="text-xs text-indigo-700 font-medium">Interpretación inteligente de resultados de laboratorio</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-6 px-6">
                        {analysisData ? (
                            <div className="prose prose-slate max-w-none">
                                <ReactMarkdown
                                    remarkPlugins={[remarkGfm]}
                                    components={{
                                        table: ({ node, ...props }) => <div className="overflow-x-auto my-6 rounded-xl border border-indigo-200 shadow-sm"><table className="w-full text-sm text-left" {...props} /></div>,
                                        thead: ({ node, ...props }) => <thead className="bg-indigo-600 text-white font-semibold" {...props} />,
                                        th: ({ node, ...props }) => <th className="px-6 py-3 border-b border-indigo-500" {...props} />,
                                        td: ({ node, ...props }) => <td className="px-6 py-4 border-b border-indigo-100 bg-white/50" {...props} />,
                                        tr: ({ node, ...props }) => <tr className="hover:bg-indigo-50/50 transition-colors" {...props} />,
                                        h1: ({ node, ...props }) => <h1 className="text-2xl font-bold text-indigo-900 mt-8 mb-4 border-l-4 border-indigo-500 pl-4" {...props} />,
                                        h2: ({ node, ...props }) => <h2 className="text-xl font-bold text-indigo-800 mt-6 mb-3 flex items-center gap-2" {...props} />,
                                        h3: ({ node, ...props }) => <h3 className="text-base font-semibold text-indigo-700 mt-4 mb-2" {...props} />,
                                        p: ({ node, ...props }) => <p className="text-slate-700 leading-relaxed mb-4" {...props} />,
                                        ul: ({ node, ...props }) => <ul className="list-disc pl-5 space-y-2 mb-4 text-slate-700" {...props} />,
                                        li: ({ node, ...props }) => <li className="pl-1" {...props} />,
                                        strong: ({ node, ...props }) => <strong className="text-indigo-900 font-bold" {...props} />,
                                        hr: () => <hr className="my-8 border-t border-indigo-200" />
                                    }}
                                >
                                    {typeof analysisData === 'string' ? analysisData : JSON.stringify(analysisData, null, 2)}
                                </ReactMarkdown>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-12 text-indigo-400 bg-white/50 rounded-xl border border-indigo-100 border-dashed">
                                <Loader2 className="h-10 w-10 animate-spin mb-4 text-indigo-500" />
                                <p className="text-base font-semibold text-indigo-900">Analizando Documento</p>
                                <p className="text-xs text-indigo-600 mt-1">Extrayendo métricas y comparando normativas...</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Field Form & Verification Card */}
            <Card className="border-slate-200 shadow-sm bg-white">
                <CardHeader className="pb-3 border-b border-slate-100">
                    <CardTitle className="text-base font-semibold text-slate-900">2. Verificación de Consistencia</CardTitle>
                    <CardDescription className="text-xs text-slate-500">Carga la planilla de campo para cruzar datos.</CardDescription>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                    <div className="flex items-center gap-4">
                        <div className="relative flex-1">
                            <input type="file" className="text-sm" onChange={handleFieldFormUpload} accept=".pdf,.jpg,.png" />
                        </div>
                        <Button onClick={handleVerify} disabled={isVerifying || !fieldFormFile} variant="outline">
                            {isVerifying ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                            Verificar
                        </Button>
                    </div>

                    {verificationResult && (
                        <div className={`p-4 rounded-lg border ${verificationResult.valid ? 'bg-emerald-50 border-emerald-100' : 'bg-amber-50 border-amber-100'}`}>
                            <h4 className="font-semibold text-sm mb-2">Resultado: {verificationResult.score}/100</h4>
                            <ul className="list-disc pl-5 text-xs space-y-1">
                                {verificationResult.discrepancies?.map((d: string, i: number) => (
                                    <li key={i} className="text-red-700">{d}</li>
                                ))}
                                {verificationResult.matches?.map((m: string, i: number) => (
                                    <li key={i} className="text-emerald-700">{m}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Report Generation Card */}
            <Card className="border-slate-200 shadow-sm bg-white">
                <CardHeader className="pb-3 border-b border-slate-100">
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-base font-medium text-slate-900">3. Generar Informe</CardTitle>
                            <CardDescription className="text-xs mt-1 text-slate-500">Procesamiento IA y generación de documento final.</CardDescription>
                        </div>
                        {finalReportUrl && canDownload && (
                            <a href={finalReportUrl} download className="text-xs text-slate-900 hover:underline flex items-center gap-1">
                                <Download className="h-3 w-3" />
                                Descargar
                            </a>
                        )}
                    </div>
                </CardHeader>
                <CardContent className="pt-6 flex flex-col items-center">
                    {reportGenerated ? (
                        <div className="w-full space-y-4">
                            <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-md">
                                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                                <p className="text-sm font-medium text-slate-900">Informe generado correctamente</p>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                {canDownload ? (
                                    <Button asChild variant="outline" className="w-full border-slate-200 hover:bg-slate-50 text-slate-900">
                                        <a href={finalReportUrl || '#'} download>
                                            <Download className="mr-2 h-4 w-4" /> Descargar
                                        </a>
                                    </Button>
                                ) : (
                                    <Button disabled variant="outline" className="w-full border-slate-200 text-slate-400">
                                        <Download className="mr-2 h-4 w-4" /> Descargar
                                    </Button>
                                )}
                                <Button variant="ghost" className="w-full text-slate-500 hover:text-slate-900" onClick={() => setReportGenerated(false)}>
                                    Generar Nuevo
                                </Button>
                            </div>

                            {/* Feedback Button */}
                            <div className="mt-4 pt-4 border-t border-slate-200">
                                <FeedbackButton
                                    onClick={() => setFeedbackModalOpen(true)}
                                    variant="default"
                                    label="¿Algo incorrecto? Dar feedback"
                                    className="w-full"
                                />
                            </div>
                        </div>
                    ) : (
                        <Button
                            onClick={handleGenerateReport}
                            disabled={isGenerating || !analysisFile}
                            className="w-full bg-slate-900 hover:bg-slate-800 text-white h-10 shadow-none"
                        >
                            {isGenerating ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Procesando...
                                </>
                            ) : (
                                <>
                                    <FileBarChart className="mr-2 h-4 w-4" />
                                    Generar Informe
                                </>
                            )}
                        </Button>
                    )}
                </CardContent>
            </Card>

            {/* Feedback Modal */}
            <FeedbackModal
                open={feedbackModalOpen}
                onOpenChange={setFeedbackModalOpen}
                oitId={oitId}
                category="REPORT"
                aiOutput={analysisData?.rawText || ''}
                title="Feedback del Informe"
                fields={[
                    { name: 'introduction', value: '', label: 'Introducción' },
                    { name: 'methodology', value: '', label: 'Metodología' },
                    { name: 'results', value: '', label: 'Resultados' },
                    { name: 'conclusions', value: '', label: 'Conclusiones' },
                    { name: 'template', value: '', label: 'Formato/Plantilla' }
                ]}
            />
        </div>
    );
}
