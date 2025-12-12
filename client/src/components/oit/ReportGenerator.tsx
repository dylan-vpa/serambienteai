import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileBarChart, Upload, Loader2, CheckCircle2, Download, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';

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

    // Initialize/Update finalReportUrl from prop
    useEffect(() => {
        if (initialReportUrl) {
            // If already complete URL or blob
            if (initialReportUrl.startsWith('http') || initialReportUrl.startsWith('blob:')) {
                setFinalReportUrl(initialReportUrl);
            } else {
                // Construct URL from filename (assuming stored in uploads/reports)
                const baseUrl = (api.defaults.baseURL || '').replace(/\/api$/, '');
                setFinalReportUrl(`${baseUrl}/uploads/reports/${initialReportUrl}`);
            }
            setReportGenerated(true);
        }
    }, [initialReportUrl]);

    // Update analysis data if prop changes (e.g. from polling)
    useEffect(() => {
        if (initialAnalysis) {
            setAnalysisData(initialAnalysis);
        }
    }, [initialAnalysis]);

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

            // Set analysis data from response if available
            if (response.data && response.data.labResultsAnalysis) {
                setAnalysisData(response.data.labResultsAnalysis);
            }

            toast.success('Resultados de laboratorio cargados y analizados');
        } catch (error) {
            console.error('Error uploading lab results:', error);
            toast.error('Error al cargar resultados');
        } finally {
            setIsUploading(false);
        }
    };

    const handleGenerateReport = async () => {
        if (!analysisFile) {
            toast.error('Sube los resultados de laboratorio primero');
            return;
        }

        setIsGenerating(true);
        try {
            const response = await api.post(`/oits/${oitId}/generate-final-report`, {}, {
                responseType: 'blob'
            });

            const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
            setFinalReportUrl(url);
            setReportGenerated(true);
            toast.success('Informe generado exitosamente');
        } catch (error) {
            console.error('Error generating report:', error);
            toast.error('Error al generar informe');
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Lab Results Upload Card */}
            <Card className="border-slate-200 shadow-sm bg-white">
                <CardHeader className="pb-3 border-b border-slate-100">
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-base font-medium text-slate-900">1. Cargar Resultados</CardTitle>
                            <CardDescription className="text-xs mt-1 text-slate-500">Sube el archivo de resultados del laboratorio.</CardDescription>
                        </div>
                        {labResultsUrl && (
                            <a href={labResultsUrl} download className="text-xs text-slate-900 hover:underline flex items-center gap-1">
                                <Download className="h-3 w-3" />
                                Descargar
                            </a>
                        )}
                    </div>
                </CardHeader>
                <CardContent className="pt-6">
                    <div className={`relative w-full h-32 border border-dashed rounded-lg flex flex-col items-center justify-center transition-all ${analysisFile ? 'border-emerald-500 bg-emerald-50/10' : 'border-slate-300 hover:border-slate-400 bg-slate-50'}`}>
                        <input
                            type="file"
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            onChange={handleAnalysisUpload}
                            accept=".pdf,.xlsx,.csv"
                            disabled={isUploading}
                        />
                        {isUploading ? (
                            <>
                                <Loader2 className="h-6 w-6 text-slate-400 animate-spin mb-2" />
                                <p className="text-sm font-medium text-slate-600">Subiendo...</p>
                            </>
                        ) : analysisFile ? (
                            <>
                                <CheckCircle2 className="h-6 w-6 text-emerald-600 mb-2" />
                                <p className="text-sm font-medium text-slate-900">{analysisFile.name}</p>
                                <p className="text-xs text-slate-500">{(analysisFile.size / 1024).toFixed(1)} KB</p>
                            </>
                        ) : (
                            <>
                                <Upload className="h-6 w-6 text-slate-400 mb-2" />
                                <p className="text-sm font-medium text-slate-600">Subir archivo</p>
                                <p className="text-xs text-slate-400">PDF, Excel o CSV</p>
                            </>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* AI Analysis Result Card */}
            {(analysisData || (labResultsUrl && !reportGenerated)) && (
                <Card className="border-indigo-100 shadow-sm bg-indigo-50/50">
                    <CardHeader className="pb-3 border-b border-indigo-100">
                        <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                                <Sparkles className="h-4 w-4" />
                            </div>
                            <div>
                                <CardTitle className="text-base font-medium text-indigo-900">Análisis Preliminar (IA)</CardTitle>
                                <CardDescription className="text-xs text-indigo-700">Revisión automática de resultados del laboratorio.</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-4 space-y-4">
                        {analysisData ? (
                            <>
                                <div>
                                    <h4 className="text-sm font-semibold text-indigo-900 mb-1">Resumen Ejecutivo</h4>
                                    <p className="text-sm text-indigo-800 leading-relaxed">{analysisData.summary || "Sin resumen disponible."}</p>
                                </div>
                                {analysisData.findings && analysisData.findings.length > 0 && (
                                    <div>
                                        <h4 className="text-sm font-semibold text-indigo-900 mb-2">Hallazgos Clave</h4>
                                        <ul className="space-y-1">
                                            {analysisData.findings.map((finding: string, i: number) => (
                                                <li key={i} className="flex items-start gap-2 text-sm text-indigo-800">
                                                    <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-indigo-400 flex-shrink-0" />
                                                    {finding}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                                <div className="flex items-center gap-2 mt-2">
                                    <span className="text-xs font-semibold uppercase tracking-wider text-indigo-700">Estado Sugerido:</span>
                                    <Badge variant={analysisData.status === 'COMPLIANT' ? 'default' : analysisData.status === 'NON_COMPLIANT' ? 'destructive' : 'secondary'}>
                                        {analysisData.status === 'COMPLIANT' ? 'CUMPLE' : analysisData.status === 'NON_COMPLIANT' ? 'NO CUMPLE' : 'REVISIÓN'}
                                    </Badge>
                                </div>
                            </>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-6 text-indigo-400">
                                <Loader2 className="h-6 w-6 animate-spin mb-2" />
                                <p className="text-sm">Analizando documento...</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Report Generation Card */}
            <Card className="border-slate-200 shadow-sm bg-white">
                <CardHeader className="pb-3 border-b border-slate-100">
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-base font-medium text-slate-900">2. Generar Informe</CardTitle>
                            <CardDescription className="text-xs mt-1 text-slate-500">Procesamiento IA y generación de documento final.</CardDescription>
                        </div>
                        {finalReportUrl && (
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
                                <Button asChild variant="outline" className="w-full border-slate-200 hover:bg-slate-50 text-slate-900">
                                    <a href={finalReportUrl || '#'} download>
                                        <Download className="mr-2 h-4 w-4" /> Descargar
                                    </a>
                                </Button>
                                <Button variant="ghost" className="w-full text-slate-500 hover:text-slate-900" onClick={() => setReportGenerated(false)}>
                                    Generar Nuevo
                                </Button>
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
        </div>
    );
}
