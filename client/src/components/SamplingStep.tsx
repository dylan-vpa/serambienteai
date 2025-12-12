import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Lock, AlertCircle, Loader2, Camera, Upload } from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'sonner';
import type { TemplateStep } from '@/types/sampling';

interface ValidationResult {
    validated: boolean;
    feedback: string;
    confidence: number;
    data?: any;
}

interface SamplingStepProps {
    oitId: string;
    step: TemplateStep;
    stepIndex: number;
    isLocked: boolean;
    validation?: ValidationResult;
    onValidationComplete: () => void;
}

export function SamplingStep({
    oitId,
    step,
    stepIndex,
    isLocked,
    validation,
    onValidationComplete
}: SamplingStepProps) {
    const [value, setValue] = useState<any>('');
    const [files, setFiles] = useState<File[]>([]);
    const [comment, setComment] = useState('');
    const [isValidating, setIsValidating] = useState(false);
    const [localError, setLocalError] = useState<string | null>(null);

    // Initialize state from existing validation data
    useEffect(() => {
        if (validation?.data) {
            // Restore previous data if available
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
            setLocalError('Este paso es requerido');
            return;
        }

        try {
            setIsValidating(true);

            // Construct payload based on step type
            const payload = {
                value,
                files: files.map(f => f.name), // In real app, upload first and send URLs
                comment,
                stepId: step.id,
                stepType: step.type
            };

            const response = await api.post(`/oits/${oitId}/validate-step`, {
                stepIndex,
                stepDescription: step.description || step.title,
                stepRequirements: JSON.stringify(step),
                data: payload // Send as 'data' property
            });

            if (response.data.validated) {
                toast.success('Paso validado correctamente');
                onValidationComplete();
            } else {
                setLocalError(response.data.feedback || 'La validación falló. Revisa los datos.');
                toast.warning('La IA encontró problemas con los datos');
            }
        } catch (error) {
            console.error('Validation error:', error);
            setLocalError('Error de conexión al validar');
            toast.error('Error al validar el paso');
        } finally {
            setIsValidating(false);
        }
    };

    if (isLocked) {
        return (
            <Card className="bg-slate-50 border-slate-200 opacity-75">
                <CardContent className="flex items-center gap-4 py-4">
                    <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center">
                        <Lock className="h-4 w-4 text-slate-500" />
                    </div>
                    <div>
                        <h4 className="font-medium text-slate-700">Paso {stepIndex + 1}: {step.title}</h4>
                        <p className="text-xs text-slate-500">Completa el paso anterior para desbloquear</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    const isCompleted = validation?.validated;

    if (isCompleted) {
        return (
            <Card className="bg-green-50/50 border-green-200">
                <CardContent className="flex items-center gap-4 py-4">
                    <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                        <h4 className="font-medium text-green-900">Paso {stepIndex + 1}: {step.title}</h4>
                        <div className="text-sm text-green-700 mt-1">
                            <strong>Respuesta: </strong>
                            {typeof value === 'boolean' ? (value ? 'Sí' : 'No') : value}
                        </div>
                        {validation?.feedback && (
                            <p className="text-xs text-green-600 mt-1 bg-green-100/50 p-2 rounded">
                                <span className="font-semibold">IA:</span> {validation.feedback}
                            </p>
                        )}
                    </div>
                </CardContent>
            </Card>
        );
    }

    // Render Input Fields based on Type
    const renderInput = () => {
        switch (step.type) {


            case 'INPUT':
                const inputStep = step as any;
                return (
                    <div className="space-y-3">
                        <Label>
                            {inputStep.description || 'Ingrese el valor'}
                            {step.required && <span className="text-red-500 ml-1">*</span>}
                        </Label>
                        <div className="flex gap-2">
                            <Input
                                type={inputStep.inputType || 'text'}
                                placeholder={inputStep.placeholder || inputStep.description || 'Ingrese respuesta...'}
                                value={value}
                                onChange={(e) => setValue(e.target.value)}
                                className="max-w-md"
                            />
                            {inputStep.unit && (
                                <span className="flex items-center px-3 bg-slate-100 border border-slate-200 rounded-md text-sm text-slate-600">
                                    {inputStep.unit}
                                </span>
                            )}
                        </div>
                    </div>
                );

            case 'CHECKBOX':
                const checkStep = step as any;
                return (
                    <div className="space-y-4">
                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id={`step-${stepIndex}`}
                                checked={!!value}
                                onCheckedChange={(checked) => setValue(checked)}
                            />
                            <Label htmlFor={`step-${stepIndex}`} className="font-normal text-base cursor-pointer">
                                {checkStep.label || step.description || 'Confirmar acción'}
                            </Label>
                        </div>
                        {checkStep.requiresComment && (
                            <div className="pl-6 space-y-2">
                                <Label className="text-xs text-slate-500">Comentario adicional</Label>
                                <Textarea
                                    value={comment}
                                    onChange={(e) => setComment(e.target.value)}
                                    placeholder={checkStep.commentPlaceholder || "Observaciones..."}
                                    className="h-20"
                                />
                            </div>
                        )}
                    </div>
                );
            case 'DOCUMENT':
            case 'IMAGE':
                return (
                    <div className="space-y-3">
                        <Label>{step.description || 'Subir archivos'}</Label>
                        <div className="border-2 border-dashed border-slate-200 rounded-lg p-6 flex flex-col items-center justify-center gap-3 bg-slate-50/50">
                            <div className="p-3 bg-white rounded-full shadow-sm">
                                {step.type === 'IMAGE' ? <Camera className="h-6 w-6 text-slate-400" /> : <Upload className="h-6 w-6 text-slate-400" />}
                            </div>
                            <div className="text-center">
                                <p className="text-sm font-medium text-slate-900">
                                    Click para seleccionar
                                </p>
                                <p className="text-xs text-slate-500">
                                    {step.type === 'IMAGE' ? 'JPG, PNG' : 'PDF, DOCX'}
                                </p>
                            </div>
                            {/* Dummy file input for UI demo */}
                            <Button variant="outline" size="sm" onClick={() => toast.info('Funcionalidad de carga simulada para demo')}>
                                Seleccionar
                            </Button>
                        </div>
                        {isLocked}
                    </div>
                )

            default:
                return (
                    <div className="space-y-2">
                        <Label>{step.description || 'Respuesta'}</Label>
                        <Textarea
                            value={value}
                            onChange={(e) => setValue(e.target.value)}
                            placeholder="Ingrese los datos requeridos..."
                            className="min-h-[100px]"
                        />
                    </div>
                );
        }
    };

    return (
        <Card className="border-slate-200 shadow-sm transition-all duration-200 hover:shadow-md">
            <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center h-8 w-8 rounded-full bg-indigo-100 text-indigo-700 font-semibold text-sm">
                            {stepIndex + 1}
                        </div>
                        <div>
                            <CardTitle className="text-base font-semibold text-slate-900">
                                {step.title}
                            </CardTitle>
                            {step.type && (
                                <Badge variant="outline" className="mt-1 text-[10px] px-2 py-0 h-5">
                                    {step.type}
                                </Badge>
                            )}
                        </div>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">

                {renderInput()}

                {localError && (
                    <div className="flex items-start gap-2 p-3 bg-red-50 text-red-700 rounded-lg text-sm animate-in slide-in-from-top-1">
                        <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        <div>
                            <span className="font-semibold block mb-0.5">Atención:</span>
                            {localError}
                        </div>
                    </div>
                )}

                <div className="flex justify-end pt-2">
                    <Button
                        onClick={handleValidate}
                        disabled={isValidating}
                        className="bg-slate-900 hover:bg-slate-800 text-white min-w-[140px]"
                    >
                        {isValidating ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Validando...
                            </>
                        ) : (
                            'Guardar y Siguiente'
                        )}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
