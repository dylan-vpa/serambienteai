import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileBarChart, Upload, Loader2, CheckCircle2, Download, Sparkles, AlertTriangle, FileCheck, FileText } from 'lucide-react';
import { notify } from '@/lib/notify';
import api from '@/lib/api';
// import { useAuthStore } from '@/features/auth/authStore'; // Unused
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { FeedbackModal, FeedbackButton } from '@/components/feedback/FeedbackModal';

interface ReportGeneratorProps {
    oitId: string;
    finalReportUrl?: string | null;
    initialLabAnalysis?: any;
    initialSheetUrl?: string | null;
    initialSheetAnalysis?: any;
}

export function ReportGenerator({
    oitId,
    finalReportUrl: initialReportUrl,
    initialLabAnalysis,
    initialSheetUrl,
    initialSheetAnalysis
}: ReportGeneratorProps) {
    // General State
    const [isGenerating, setIsGenerating] = useState(false);
    const [finalReportUrl, setFinalReportUrl] = useState<string | null>(null);
    const [reportGenerated, setReportGenerated] = useState(false);

    // Sampling Sheet State
    const [sheetFile, setSheetFile] = useState<File | null>(null);
    const [sheetUrl, setSheetUrl] = useState<string | null>(initialSheetUrl || null);
    const [sheetAnalysis, setSheetAnalysis] = useState<any>(initialSheetAnalysis || null);
    const [isUploadingSheet, setIsUploadingSheet] = useState(false);
    const [isSheetDragging, setIsSheetDragging] = useState(false);

    // Lab Results State
    const [labFile, setLabFile] = useState<File | null>(null);
    const [labUrl, setLabUrl] = useState<string | null>(null); // We don't have initialLabUrl passed usually, but local is fine
    const [labAnalysis, setLabAnalysis] = useState<any>(initialLabAnalysis || null);
    const [isUploadingLab, setIsUploadingLab] = useState(false);
    const [isLabDragging, setIsLabDragging] = useState(false);

    const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
    // const { user } = useAuthStore(); // Unused
    // const canDownload = ...; // Unused


    // Initialize Report URL
    useEffect(() => {
        if (initialReportUrl) {
            if (initialReportUrl.startsWith('http') || initialReportUrl.startsWith('blob:')) {
                setFinalReportUrl(initialReportUrl);
            } else {
                const baseUrl = (api.defaults.baseURL || '').replace(/\/api$/, '');
                setFinalReportUrl(`${baseUrl}/uploads/${initialReportUrl}`);
            }
            setReportGenerated(true);
        }
    }, [initialReportUrl]);

    // Initialize Analyses
    useEffect(() => {
        if (initialSheetAnalysis) setSheetAnalysis(initialSheetAnalysis);
        if (initialLabAnalysis) setLabAnalysis(initialLabAnalysis);
    }, [initialSheetAnalysis, initialLabAnalysis]);

    // Polling for Analyses
    useEffect(() => {
        let intervalId: any;

        // Poll if we have uploaded files but missing analysis
        const needSheetAnalysis = sheetUrl && !sheetAnalysis;
        const needLabAnalysis = labUrl && !labAnalysis;

        if (needSheetAnalysis || needLabAnalysis) {
            intervalId = setInterval(async () => {
                try {
                    console.log('Polling for OIT analysis...');
                    const response = await api.get(`/oits/${oitId}`);
                    const data = response.data;

                    if (needSheetAnalysis && data.samplingSheetAnalysis) {
                        const parsed = typeof data.samplingSheetAnalysis === 'string'
                            ? JSON.parse(data.samplingSheetAnalysis)
                            : data.samplingSheetAnalysis;
                        setSheetAnalysis(parsed);
                        notify.success('¡Análisis de planillas completado!');
                    }

                    if (needLabAnalysis && data.labResultsAnalysis) {
                        setLabAnalysis(data.labResultsAnalysis);
                        notify.success('¡Análisis de laboratorio completado!');
                    }
                } catch (error) {
                    console.error('Error polling OIT:', error);
                }
            }, 5000);
        }

        return () => {
            if (intervalId) clearInterval(intervalId);
        };
    }, [oitId, sheetUrl, sheetAnalysis, labUrl, labAnalysis]);

    // --- Sampling Sheet Handlers ---
    const handleSheetDrop = (e: React.DragEvent) => {
        e.preventDefault(); e.stopPropagation(); setIsSheetDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file) handleSheetUpload(file);
    };

    const handleSheetUpload = async (file: File) => {
        setSheetFile(file);
        setIsUploadingSheet(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            const response = await api.post(`/oits/${oitId}/sampling-sheets`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            setSheetUrl(response.data.samplingSheetUrl);
            notify.success('Planillas subidas. Analizando...');
        } catch (error: any) {
            console.error('Error uploading sheets:', error);
            notify.error(error.response?.data?.error || 'Error al subir planillas');
        } finally {
            setIsUploadingSheet(false);
        }
    };

    // --- Lab Results Handlers ---
    const handleLabDrop = (e: React.DragEvent) => {
        e.preventDefault(); e.stopPropagation(); setIsLabDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file) handleLabUpload(file);
    };

    const handleLabUpload = async (file: File) => {
        setLabFile(file);
        setIsUploadingLab(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            const response = await api.post(`/oits/${oitId}/lab-results`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            setLabUrl(URL.createObjectURL(file)); // Local preview
            // Backend might return analysis immediately or we poll
            if (response.data && response.data.labResultsAnalysis) {
                setLabAnalysis(response.data.labResultsAnalysis);
            }
            notify.success('Resultados de laboratorio cargados. Analizando...');
        } catch (error) {
            console.error('Error uploading lab results:', error);
            notify.error('Error al cargar resultados');
        } finally {
            setIsUploadingLab(false);
        }
    };

    // --- Report Generation ---
    const handleGenerateReport = async () => {
        if (!labAnalysis && !labUrl && !finalReportUrl) {
            notify.error('Se requieren resultados de laboratorio para generar el informe');
            return;
        }

        setIsGenerating(true);
        try {
            const response = await api.post(`/oits/${oitId}/generate-final-report`, {}, {
                responseType: 'blob'
            });
            const contentType = response.headers['content-type'] || 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
            const isPdf = contentType.includes('pdf');
            const fileBlob = new Blob([response.data], { type: contentType });
            const url = window.URL.createObjectURL(fileBlob);
            setFinalReportUrl(url);
            setReportGenerated(true);

            // Auto-download
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

    // Helper for Quality Badge
    const getQualityBadge = (quality: string) => {
        if (quality === 'buena') return <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200"><CheckCircle2 className="h-3 w-3 mr-1" />Buena Calidad</Badge>;
        if (quality === 'deficiente') return <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" />Deficiente</Badge>;
        return <Badge variant="outline" className="border-amber-200 text-amber-700 bg-amber-50">Regular</Badge>;
    };

    // Render File Input
    const renderFileInput = (
        title: string,
        description: string,
        icon: any,
        file: File | null,
        uploaded: boolean,
        isUploading: boolean,
        isDragging: boolean,
        setIsDragging: (v: boolean) => void,
        handleDrop: (e: React.DragEvent) => void,
        handleUpload: (f: File) => void,
        accept: string
    ) => (
        <Card className={`border-slate-200 shadow-sm transition-all ${isDragging ? 'border-indigo-400 ring-2 ring-indigo-50' : 'hover:border-indigo-300'}`}>
            <CardHeader className="pb-3 border-b border-slate-50 bg-slate-50/50">
                <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
                    {icon}
                    {title}
                </CardTitle>
                <CardDescription className="text-xs">{description}</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
                <div
                    className={`relative w-full h-32 border-2 border-dashed rounded-xl flex flex-col items-center justify-center transition-all cursor-pointer bg-white
                        ${isDragging ? 'border-indigo-500 bg-indigo-50/20' : uploaded ? 'border-emerald-500 bg-emerald-50/10' : 'border-slate-200 hover:border-slate-400'}`}
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                >
                    <input
                        type="file"
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
                        accept={accept}
                        disabled={isUploading}
                    />

                    {isUploading ? (
                        <div className="flex flex-col items-center">
                            <Loader2 className="h-8 w-8 text-indigo-500 animate-spin mb-2" />
                            <p className="text-xs font-medium text-slate-600">Procesando...</p>
                        </div>
                    ) : uploaded ? (
                        <div className="flex flex-col items-center animate-in fade-in zoom-in-95">
                            <div className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center mb-2">
                                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                            </div>
                            <p className="text-xs font-semibold text-slate-900 truncate max-w-[180px]">{file?.name || 'Archivo Cargado'}</p>
                            <p className="text-[10px] text-slate-400 mt-1">Clic para reemplazar</p>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center text-slate-400 group-hover:text-slate-600">
                            <Upload className="h-8 w-8 mb-2 opacity-50" />
                            <p className="text-xs font-semibold">Seleccionar archivo</p>
                            <p className="text-[10px] opacity-70 mt-1 text-center px-4">Arrastra o haz clic</p>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );

    return (
        <div className="space-y-6">
            {/* 1. INPUTS SECTION */}
            <div className="grid md:grid-cols-2 gap-6">
                {/* Left: Planilla */}
                {renderFileInput(
                    "1. Planillas de Campo",
                    "Sube las planillas de muestreo para análisis.",
                    <FileCheck className="h-4 w-4 text-indigo-600" />,
                    sheetFile,
                    !!sheetUrl,
                    isUploadingSheet,
                    isSheetDragging,
                    setIsSheetDragging,
                    handleSheetDrop,
                    handleSheetUpload,
                    ".pdf,.xlsx,.xls"
                )}

                {/* Right: Lab Results */}
                {renderFileInput(
                    "2. Reporte de Laboratorio",
                    "Sube los resultados oficiales del laboratorio.",
                    <FileText className="h-4 w-4 text-purple-600" />,
                    labFile,
                    !!labUrl,
                    isUploadingLab,
                    isLabDragging,
                    setIsLabDragging,
                    handleLabDrop,
                    handleLabUpload,
                    ".pdf,.xlsx,.csv"
                )}
            </div>

            {/* 2. ANALYSIS CARDS SECTION */}
            {(sheetAnalysis || labAnalysis || isUploadingSheet || isUploadingLab) && (
                <div className="grid md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4">
                    {/* Sheet Analysis Result */}
                    <Card className="border-indigo-100 shadow-sm bg-white flex flex-col h-full">
                        <CardHeader className="pb-3 bg-indigo-50/30 border-b border-indigo-50">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-sm font-semibold text-indigo-900 flex items-center gap-2">
                                    <Sparkles className="h-4 w-4 text-indigo-500" />
                                    Análisis de Planillas
                                </CardTitle>
                                {sheetAnalysis && getQualityBadge(sheetAnalysis.quality)}
                            </div>
                        </CardHeader>
                        <CardContent className="pt-4 flex-1">
                            {!sheetAnalysis ? (
                                <div className="h-full flex flex-col items-center justify-center p-6 text-slate-400 text-center">
                                    {isUploadingSheet ? (
                                        <>
                                            <Loader2 className="h-6 w-6 animate-spin mb-2 text-indigo-400" />
                                            <p className="text-xs">Analizando planillas...</p>
                                        </>
                                    ) : (
                                        <p className="text-xs">Esperando archivo...</p>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-3 text-sm">
                                    <p className="text-slate-700">{sheetAnalysis.summary}</p>
                                    {sheetAnalysis.findings?.length > 0 && (
                                        <div className="bg-amber-50 p-3 rounded-lg border border-amber-100">
                                            <p className="font-medium text-amber-900 text-xs mb-1 flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Hallazgos</p>
                                            <ul className="list-disc pl-4 space-y-1 text-xs text-amber-800">
                                                {sheetAnalysis.findings.map((f: string, i: number) => <li key={i}>{f}</li>)}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Lab Analysis Result */}
                    <Card className="border-purple-100 shadow-sm bg-white flex flex-col h-full">
                        <CardHeader className="pb-3 bg-purple-50/30 border-b border-purple-50">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-sm font-semibold text-purple-900 flex items-center gap-2">
                                    <Sparkles className="h-4 w-4 text-purple-500" />
                                    Análisis de Laboratorio
                                </CardTitle>
                                <Badge variant="outline" className="text-[10px] bg-purple-50 text-purple-700 border-purple-200">Resultados</Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="pt-4 flex-1">
                            {!labAnalysis ? (
                                <div className="h-full flex flex-col items-center justify-center p-6 text-slate-400 text-center">
                                    {isUploadingLab ? (
                                        <>
                                            <Loader2 className="h-6 w-6 animate-spin mb-2 text-purple-400" />
                                            <p className="text-xs">Interpretando resultados...</p>
                                        </>
                                    ) : (
                                        <p className="text-xs">Esperando archivo...</p>
                                    )}
                                </div>
                            ) : (
                                <div className="prose prose-sm prose-slate max-w-none max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                        {typeof labAnalysis === 'string' ? labAnalysis : labAnalysis.rawText || JSON.stringify(labAnalysis)}
                                    </ReactMarkdown>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* 3. GENERATE REPORT BUTTON */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 flex flex-col items-center justify-center space-y-4">
                <div className="text-center max-w-lg">
                    <h3 className="text-lg font-semibold text-slate-900">Generar Informe Final</h3>
                    <p className="text-sm text-slate-500">
                        El sistema combinará la información de las planillas de campo y los resultados de laboratorio interpretados por IA.
                    </p>
                </div>

                {reportGenerated ? (
                    <div className="w-full max-w-md space-y-3">
                        <div className="flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-100 rounded-md mb-2">
                            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                            <p className="text-sm font-medium text-emerald-900">Informe Generado</p>
                        </div>
                        <div className="flex gap-2">
                            <Button asChild className="flex-1 bg-slate-900 text-white hover:bg-slate-800">
                                <a href={finalReportUrl || '#'} download>
                                    <Download className="mr-2 h-4 w-4" /> Descargar
                                </a>
                            </Button>
                            <Button variant="outline" onClick={() => setReportGenerated(false)}>
                                Nuevo
                            </Button>
                        </div>
                        <div className="pt-2">
                            <FeedbackButton onClick={() => setFeedbackModalOpen(true)} className="w-full" label="Reportar problema en informe" />
                        </div>
                    </div>
                ) : (
                    <Button
                        size="lg"
                        className="w-full max-w-md bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200"
                        onClick={handleGenerateReport}
                        disabled={isGenerating || (!labAnalysis && !labUrl)}
                    >
                        {isGenerating ? (
                            <>
                                <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Generando Documento...
                            </>
                        ) : (
                            <>
                                <FileBarChart className="mr-2 h-5 w-5" /> Generar Informe Consolidado
                            </>
                        )}
                    </Button>
                )}
            </div>

            {/* Feedback Modal */}
            <FeedbackModal
                open={feedbackModalOpen}
                onOpenChange={setFeedbackModalOpen}
                oitId={oitId}
                category="REPORT"
                aiOutput={typeof labAnalysis === 'string' ? labAnalysis : JSON.stringify(labAnalysis)}
                title="Feedback del Informe"
                fields={[
                    { name: 'general', value: '', label: 'Comentario General' }
                ]}
            />
        </div>
    );
}
