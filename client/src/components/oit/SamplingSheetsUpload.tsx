import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Upload, Loader2, CheckCircle2, AlertTriangle, FileCheck, Sparkles } from 'lucide-react';
import { notify } from '@/lib/notify';
import api from '@/lib/api';


interface SamplingSheetsUploadProps {
    oitId: string;
    initialSheetUrl?: string | null;
    initialAnalysis?: any;
    onAnalysisComplete?: () => void;
}

export function SamplingSheetsUpload({ oitId, initialSheetUrl, initialAnalysis, onAnalysisComplete }: SamplingSheetsUploadProps) {
    const [isUploading, setIsUploading] = useState(false);
    const [sheetFile, setSheetFile] = useState<File | null>(null);
    const [sheetUploaded, setSheetUploaded] = useState(!!initialSheetUrl);
    const [sheetUrl, setSheetUrl] = useState<string | null>(initialSheetUrl || null);
    const [analysisData, setAnalysisData] = useState<any>(initialAnalysis || null);
    const [isDragging, setIsDragging] = useState(false);

    // Update from props
    useEffect(() => {
        if (initialSheetUrl) {
            setSheetUrl(initialSheetUrl);
            setSheetUploaded(true);
        }
    }, [initialSheetUrl]);

    useEffect(() => {
        if (initialAnalysis) {
            setAnalysisData(initialAnalysis);
        }
    }, [initialAnalysis]);

    // Polling for Analysis
    useEffect(() => {
        let intervalId: any;

        if (sheetUploaded && !analysisData) {
            intervalId = setInterval(async () => {
                try {
                    console.log('Polling for sampling sheet analysis...');
                    const response = await api.get(`/oits/${oitId}`);
                    if (response.data?.samplingSheetAnalysis) {
                        const parsed = typeof response.data.samplingSheetAnalysis === 'string'
                            ? JSON.parse(response.data.samplingSheetAnalysis)
                            : response.data.samplingSheetAnalysis;
                        setAnalysisData(parsed);
                        notify.success('¡Análisis de planillas completado!');
                        if (onAnalysisComplete) {
                            onAnalysisComplete();
                        }
                    }
                } catch (error) {
                    console.error('Error polling OIT:', error);
                }
            }, 5000);
        }

        return () => {
            if (intervalId) clearInterval(intervalId);
        };
    }, [oitId, sheetUploaded, analysisData, onAnalysisComplete]);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSheetFile(file);
            handleUpload(file);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        const file = e.dataTransfer.files?.[0];
        if (file && (file.type === 'application/pdf' || file.name.endsWith('.xlsx') || file.name.endsWith('.xls'))) {
            setSheetFile(file);
            handleUpload(file);
        } else {
            notify.error('Solo se permiten archivos PDF o Excel (.xlsx, .xls)');
        }
    };

    const handleUpload = async (file: File) => {
        setIsUploading(true);

        try {
            const formData = new FormData();
            formData.append('file', file);

            const response = await api.post(`/oits/${oitId}/sampling-sheets`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            setSheetUrl(response.data.samplingSheetUrl);
            setSheetUploaded(true);
            notify.success('Planillas subidas. Analizando...');
        } catch (error: any) {
            console.error('Error uploading sampling sheets:', error);
            notify.error(error.response?.data?.error || 'Error al subir planillas');
        } finally {
            setIsUploading(false);
        }
    };

    const getQualityBadge = (quality: string) => {
        if (quality === 'buena') {
            return <Badge variant="secondary" className="bg-green-100 text-green-700"><CheckCircle2 className="h-3 w-3 mr-1" />Buena Calidad</Badge>;
        } else if (quality === 'deficiente') {
            return <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" />Deficiente</Badge>;
        } else {
            return <Badge variant="outline"><AlertTriangle className="h-3 w-3 mr-1" />Regular</Badge>;
        }
    };

    return (
        <Card className="border-slate-200 shadow-sm">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <FileCheck className="h-5 w-5 text-indigo-600" />
                            Planillas de Muestreo
                        </CardTitle>
                        <CardDescription>
                            Sube las planillas de campo para análisis previo al informe de laboratorio
                        </CardDescription>
                    </div>
                    {analysisData && getQualityBadge(analysisData.quality)}
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {!sheetUploaded ? (
                    <div
                        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${isDragging
                            ? 'border-indigo-500 bg-indigo-50'
                            : 'border-slate-300 hover:border-indigo-400 hover:bg-slate-50'
                            }`}
                        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                        onDragLeave={() => setIsDragging(false)}
                        onDrop={handleDrop}
                    >
                        <Upload className="h-12 w-12 mx-auto text-slate-400 mb-4" />
                        <h3 className="text-lg font-semibold text-slate-700 mb-2">
                            Arrastra tu archivo aquí
                        </h3>
                        <p className="text-sm text-slate-500 mb-4">
                            o haz clic para seleccionar (PDF, XLSX, XLS)
                        </p>
                        <input
                            type="file"
                            accept=".pdf,.xlsx,.xls"
                            onChange={handleFileSelect}
                            className="hidden"
                            id="sampling-sheet-upload"
                            disabled={isUploading}
                        />
                        <label htmlFor="sampling-sheet-upload">
                            <Button
                                type="button"
                                variant="outline"
                                className="cursor-pointer"
                                disabled={isUploading}
                                asChild
                            >
                                <span>
                                    {isUploading ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Subiendo...
                                        </>
                                    ) : (
                                        <>
                                            <Upload className="mr-2 h-4 w-4" />
                                            Seleccionar Archivo
                                        </>
                                    )}
                                </span>
                            </Button>
                        </label>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
                            <div className="flex items-center gap-3">
                                <CheckCircle2 className="h-5 w-5 text-green-600" />
                                <div>
                                    <p className="font-medium text-green-900">Planillas Subidas</p>
                                    <p className="text-sm text-green-600">{sheetFile?.name || 'Archivo cargado'}</p>
                                </div>
                            </div>
                            {sheetUrl && (
                                <a
                                    href={`${api.defaults.baseURL?.replace('/api', '')}${sheetUrl}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-indigo-600 hover:text-indigo-700 text-sm underline"
                                >
                                    Ver Archivo
                                </a>
                            )}
                        </div>

                        {/* Analysis Section */}
                        {!analysisData && (
                            <div className="flex items-center gap-2 p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
                                <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
                                <p className="text-sm text-indigo-700">Analizando planillas con IA...</p>
                            </div>
                        )}

                        {analysisData && (
                            <div className="space-y-4">
                                <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-4 rounded-lg border border-indigo-100">
                                    <div className="flex items-center gap-2 mb-3">
                                        <Sparkles className="h-4 w-4 text-indigo-600" />
                                        <h4 className="font-semibold text-indigo-900">Análisis de IA</h4>
                                    </div>
                                    <p className="text-sm text-slate-700 mb-3">{analysisData.summary}</p>
                                    {getQualityBadge(analysisData.quality)}
                                </div>

                                {analysisData.findings && analysisData.findings.length > 0 && (
                                    <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
                                        <h5 className="font-semibold text-amber-900 mb-2 flex items-center gap-2">
                                            <AlertTriangle className="h-4 w-4" />
                                            Hallazgos
                                        </h5>
                                        <ul className="list-disc list-inside space-y-1">
                                            {analysisData.findings.map((finding: string, idx: number) => (
                                                <li key={idx} className="text-sm text-amber-800">{finding}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {analysisData.recommendations && analysisData.recommendations.length > 0 && (
                                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                                        <h5 className="font-semibold text-blue-900 mb-2">Recomendaciones</h5>
                                        <ul className="list-disc list-inside space-y-1">
                                            {analysisData.recommendations.map((rec: string, idx: number) => (
                                                <li key={idx} className="text-sm text-blue-800">{rec}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
