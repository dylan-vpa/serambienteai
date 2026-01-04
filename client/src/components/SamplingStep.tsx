import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Lock, AlertCircle, Loader2, Camera, Upload, Sparkles, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import type { TemplateStep } from '@/types/sampling';
import { cn } from '@/lib/utils'; // Assuming this utility exists, if not I will use inline or template literals but standard shadcn uses it

interface ValidationResult {
    validated: boolean;
    feedback: string;
    confidence: number;
    data?: any;
}

interface SamplingStepProps {
    step: TemplateStep;
    stepIndex: number;
    isLocked: boolean;
    validation?: ValidationResult;
    onValidationComplete: (data: any) => void;
}

export function SamplingStep({
    step,
    stepIndex,
    isLocked,
    validation,
    onValidationComplete
}: SamplingStepProps) {
    const [value, setValue] = useState<any>('');
    const [files] = useState<File[]>([]);
    const [comment, setComment] = useState('');
    const [isValidating, setIsValidating] = useState(false);
    const [localError, setLocalError] = useState<string | null>(null);

    // Initialize state from existing validation data
    useEffect(() => {
        if (validation?.data) {
            if (typeof validation.data === 'object') {
                if (validation.data.value !== undefined) setValue(validation.data.value);
                if (validation.data.comment !== undefined) setComment(validation.data.comment);
            } else {
                setValue(validation.data);
            }
        }
    }, [validation]);

    const handleValidate = async () => {
        setLocalError(null);

        // Basic frontend validation
        if (step.required && !value && files.length === 0) {
            setLocalError('Este campo es obligatorio para continuar.');
            return;
        }

        try {
            setIsValidating(true);

            const payload = {
                value,
                files: files.map(f => f.name),
                comment,
                stepId: step.id,
                stepType: step.type,
                stepIndex
            };

            // Simulate a slight delay for "AI" feel if it's too fast locally
            await new Promise(r => setTimeout(r, 600));

            await onValidationComplete(payload);
            toast.success('Dato validado correctamente');

        } catch (error) {
            console.error('Save error:', error);
            setLocalError('Hubo un problema al validar este paso.');
        } finally {
            setIsValidating(false);
        }
    };

    if (isLocked) {
        return (
            <div className="relative group">
                <div className="absolute inset-0 bg-slate-100/50 backdrop-blur-[1px] z-10 rounded-xl flex items-center justify-center transition-opacity opacity-0 group-hover:opacity-100">
                    <span className="bg-white/90 px-3 py-1 rounded-full text-xs font-medium text-slate-500 shadow-sm border border-slate-200">
                        Paso bloqueado
                    </span>
                </div>
                <Card className="bg-slate-50/50 border-slate-200/60 shadow-none opacity-60 grayscale-[0.5]">
                    <CardContent className="flex items-center gap-4 py-4 px-5">
                        <div className="h-10 w-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center shadow-inner">
                            <Lock className="h-4 w-4 text-slate-400" />
                        </div>
                        <div>
                            <h4 className="font-medium text-slate-600 text-sm uppercase tracking-wide">Paso {stepIndex + 1}</h4>
                            <p className="text-sm font-semibold text-slate-700">{step.title}</p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const isCompleted = validation?.validated;

    if (isCompleted) {
        return (
            <Card className="bg-white border-emerald-100 shadow-sm overflow-hidden ring-1 ring-emerald-50 relative group transition-all duration-300 hover:shadow-md">
                <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-emerald-400 to-emerald-600" />
                <CardContent className="flex flex-col gap-4 py-5 px-6">
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-4">
                            <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0 border border-emerald-200 shadow-inner">
                                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] px-2 h-5 font-normal uppercase tracking-wider">
                                        Completado
                                    </Badge>
                                    <span className="text-xs text-slate-400">Paso {stepIndex + 1}</span>
                                </div>
                                <h4 className="font-bold text-slate-800 text-lg leading-tight">{step.title}</h4>
                            </div>
                        </div>
                        <Button variant="ghost" size="sm" className="text-slate-400 hover:text-slate-600 h-8 w-8 p-0 hidden group-hover:flex" onClick={() => { }}>
                            <span className="sr-only">Editar</span>
                            {/* Edit icon could go here */}
                        </Button>
                    </div>

                    <div className="pl-[56px]">
                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-sm text-slate-700">
                            {typeof value === 'boolean' ? (value ? 'Sí' : 'No') : value}
                        </div>

                        {/* AI Insight Section */}
                        {validation?.feedback && (
                            <div className="mt-3 flex items-start gap-3 bg-gradient-to-r from-blue-50 to-indigo-50 p-3 rounded-lg border border-blue-100/50">
                                <Sparkles className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-xs font-semibold text-blue-700 mb-0.5">Análisis IA</p>
                                    <p className="text-xs text-blue-600/90 leading-relaxed">
                                        {validation.feedback}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        );
    }

    // Active Input State
    const renderInput = () => {
        switch (step.type) {
            case 'INPUT':
                const inputStep = step as any;
                return (
                    <div className="space-y-4">
                        <Label className="text-sm font-medium text-slate-700">
                            {inputStep.description || 'Ingrese el valor'}
                            {step.required && <span className="text-red-500 ml-1" title="Requerido">*</span>}
                        </Label>
                        <div className="relative group/input">
                            <Input
                                type={inputStep.inputType || 'text'}
                                placeholder={inputStep.placeholder || 'Escriba aquí...'}
                                value={value}
                                onChange={(e) => setValue(e.target.value)}
                                className="pl-4 h-11 border-slate-200 focus:border-indigo-500 focus:ring-indigo-500/20 transition-all bg-slate-50/50 focus:bg-white text-base"
                            />
                            {inputStep.unit && (
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 px-2 py-1 bg-slate-100 rounded text-xs text-slate-500 font-medium">
                                    {inputStep.unit}
                                </div>
                            )}
                        </div>
                    </div>
                );

            case 'CHECKBOX':
                const checkStep = step as any;
                return (
                    <div className="space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                        <div className="flex items-start space-x-3">
                            <Checkbox
                                id={`step-${stepIndex}`}
                                checked={!!value}
                                onCheckedChange={(checked) => setValue(checked)}
                                className="mt-1 data-[state=checked]:bg-indigo-600 border-slate-300"
                            />
                            <div className="space-y-1">
                                <Label htmlFor={`step-${stepIndex}`} className="font-medium text-slate-800 text-base cursor-pointer leading-tight">
                                    {checkStep.label || step.description || 'Confirmar acción'}
                                </Label>
                                <p className="text-xs text-slate-500">Marque esta casilla para validar el paso.</p>
                            </div>
                        </div>
                        {checkStep.requiresComment && value && (
                            <div className="pt-2 pl-7 animate-in fade-in slide-in-from-top-2">
                                <Label className="text-xs text-slate-500 mb-1.5 block">Observaciones adicionales</Label>
                                <Textarea
                                    value={comment}
                                    onChange={(e) => setComment(e.target.value)}
                                    placeholder="Detalles importantes..."
                                    className="min-h-[80px] text-sm resize-none bg-white border-slate-200 focus:border-indigo-500"
                                />
                            </div>
                        )}
                    </div>
                );

            case 'DOCUMENT':
            case 'IMAGE':
                return (
                    <div className="space-y-3">
                        <Label className="text-sm font-medium text-slate-700">
                            {step.description || 'Evidencia requerida'}
                            {step.required && <span className="text-red-500 ml-1">*</span>}
                        </Label>
                        <div className="group relative border-2 border-dashed border-slate-200 hover:border-indigo-400 rounded-xl p-8 transition-colors bg-slate-50/30 hover:bg-slate-50 cursor-pointer text-center">
                            <div className="mx-auto h-12 w-12 bg-white rounded-full shadow-sm border border-slate-100 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300">
                                {step.type === 'IMAGE' ?
                                    <Camera className="h-6 w-6 text-indigo-500" /> :
                                    <Upload className="h-6 w-6 text-indigo-500" />
                                }
                            </div>
                            <h5 className="text-sm font-semibold text-slate-900 mb-1">
                                {step.type === 'IMAGE' ? 'Tomar o subir foto' : 'Subir documento'}
                            </h5>
                            <p className="text-xs text-slate-500 mb-4 max-w-[200px] mx-auto">
                                Soporta {step.type === 'IMAGE' ? 'JPG, PNG' : 'PDF, DOCX'}. Máx 10MB.
                            </p>
                            <Button variant="secondary" size="sm" className="bg-white hover:bg-slate-50 border border-slate-200 shadow-sm text-slate-700" onClick={() => toast.info('Demo: Carga simulada')}>
                                Seleccionar archivo
                            </Button>
                        </div>
                    </div>
                )

            default:
                return (
                    <div className="space-y-3">
                        <Label className="text-sm font-medium text-slate-700">{step.description || 'Respuesta'}</Label>
                        <Textarea
                            value={value}
                            onChange={(e) => setValue(e.target.value)}
                            placeholder="Escriba los detalles aquí..."
                            className="min-h-[120px] text-base leading-relaxed bg-slate-50/50 border-slate-200 focus:bg-white transition-colors"
                        />
                    </div>
                );
        }
    };

    return (
        <Card className="border-0 shadow-lg shadow-slate-200/50 ring-1 ring-slate-100 bg-white overflow-visible transition-all duration-300 hover:shadow-xl hover:shadow-slate-200/60 hover:-translate-y-0.5">
            <CardHeader className="pb-4 border-b border-slate-50">
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white flex items-center justify-center font-bold text-lg shadow-lg shadow-indigo-200 transform rotate-3 group-hover:rotate-0 transition-transform duration-500">
                            {stepIndex + 1}
                        </div>
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <Badge variant="secondary" className="bg-slate-100 text-slate-600 text-[10px] px-2 h-5 font-medium uppercase tracking-wider">
                                    {step.type || 'General'}
                                </Badge>
                                {step.required && (
                                    <span className="text-[10px] font-semibold text-rose-500 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-100">
                                        Requerido
                                    </span>
                                )}
                            </div>
                            <CardTitle className="text-lg font-bold text-slate-900 leading-tight">
                                {step.title}
                            </CardTitle>
                        </div>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="pt-6 space-y-6">

                <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                    {renderInput()}
                </div>

                {localError && (
                    <div className="flex items-start gap-3 p-4 bg-red-50/80 border border-red-100 text-red-800 rounded-xl text-sm animate-in shake">
                        <AlertTriangle className="h-5 w-5 text-red-600 shrink-0" />
                        <div>
                            <span className="font-bold block mb-0.5 text-red-900">Atención</span>
                            {localError}
                        </div>
                    </div>
                )}

                <div className="flex justify-end pt-2">
                    <Button
                        onClick={handleValidate}
                        disabled={isValidating}
                        className={cn(
                            "min-w-[160px] h-11 text-sm font-semibold rounded-lg shadow-lg shadow-indigo-200 transition-all active:scale-95",
                            isValidating
                                ? "bg-slate-100 text-slate-400 shadow-none cursor-not-allowed"
                                : "bg-gradient-to-r from-slate-900 to-slate-800 hover:from-slate-800 hover:to-slate-700 text-white"
                        )}
                    >
                        {isValidating ? (
                            <div className="flex items-center gap-2">
                                <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />
                                <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 to-purple-500 font-bold">
                                    Analizando...
                                </span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2">
                                <span>Guardar y Validar</span>
                                <Sparkles className="h-4 w-4 text-indigo-300" />
                            </div>
                        )}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
