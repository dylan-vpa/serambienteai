import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Camera, Upload, FileText } from 'lucide-react';
import type { TemplateStep, StepData } from '@/types/sampling';

interface StepRendererProps {
    step: TemplateStep;
    onComplete: (data: StepData) => void;
}

export const StepRenderer: React.FC<StepRendererProps> = ({ step, onComplete }) => {
    const [value, setValue] = useState<any>(null);
    const [comment, setComment] = useState('');
    const [files, setFiles] = useState<File[]>([]);

    const handleComplete = () => {
        const stepData: StepData = {
            stepId: step.id,
            stepType: step.type,
            value,
            timestamp: new Date().toISOString(),
            metadata: {}
        };

        // Add comment if exists
        if (comment) {
            stepData.metadata!.comment = comment;
        }

        // Add files if exists
        if (files.length > 0) {
            stepData.files = files.map(f => f.name); // URLs will be set after upload
        }

        onComplete(stepData);
    };

    switch (step.type) {
        case 'TEXT':
            const textStep = step as any;
            return (
                <div className="space-y-4">
                    <div className="prose prose-sm max-w-none">
                        <div dangerouslySetInnerHTML={{ __html: textStep.content || step.description }} />
                    </div>
                    <Button onClick={handleComplete} className="w-full">
                        Continuar
                    </Button>
                </div>
            );

        case 'INPUT':
            const inputStep = step as any;
            return (
                <div className="space-y-4">
                    <div>
                        <Label>{step.title}</Label>
                        {step.description && (
                            <p className="text-sm text-slate-500 mb-2">{step.description}</p>
                        )}
                        <div className="flex gap-2">
                            <Input
                                type={inputStep.inputType || 'text'}
                                placeholder={inputStep.placeholder}
                                value={value || ''}
                                onChange={(e) => setValue(e.target.value)}
                                min={inputStep.validation?.min}
                                max={inputStep.validation?.max}
                                required={step.required}
                                className="flex-1"
                            />
                            {inputStep.unit && (
                                <span className="flex items-center px-3 bg-slate-100 rounded-md text-sm text-slate-600">
                                    {inputStep.unit}
                                </span>
                            )}
                        </div>
                    </div>
                    <Button
                        onClick={handleComplete}
                        disabled={step.required && !value}
                        className="w-full"
                    >
                        Siguiente
                    </Button>
                </div>
            );

        case 'IMAGE':
            const imageStep = step as any;
            return (
                <div className="space-y-4">
                    <div>
                        <Label>{step.title}</Label>
                        {step.description && (
                            <p className="text-sm text-slate-500 mb-2">{step.description}</p>
                        )}

                        {/* Image capture/upload */}
                        <div className="border-2 border-dashed border-slate-300 rounded-lg p-8">
                            <div className="flex flex-col items-center gap-4">
                                <div className="flex gap-4">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => {
                                            const input = document.createElement('input');
                                            input.type = 'file';
                                            input.accept = 'image/*';
                                            input.capture = 'environment';
                                            input.multiple = imageStep.allowMultiple;
                                            input.onchange = (e: any) => {
                                                const selectedFiles = Array.from(e.target.files || []);
                                                setFiles(prev => [...prev, ...selectedFiles as File[]]);
                                            };
                                            input.click();
                                        }}
                                    >
                                        <Camera className="mr-2 h-4 w-4" />
                                        Tomar Foto
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => {
                                            const input = document.createElement('input');
                                            input.type = 'file';
                                            input.accept = 'image/*';
                                            input.multiple = imageStep.allowMultiple;
                                            input.onchange = (e: any) => {
                                                const selectedFiles = Array.from(e.target.files || []);
                                                setFiles(prev => [...prev, ...selectedFiles as File[]]);
                                            };
                                            input.click();
                                        }}
                                    >
                                        <Upload className="mr-2 h-4 w-4" />
                                        Subir Imagen
                                    </Button>
                                </div>

                                {files.length > 0 && (
                                    <div className="grid grid-cols-3 gap-2 w-full">
                                        {files.map((file, idx) => (
                                            <div key={idx} className="relative aspect-square">
                                                <img
                                                    src={URL.createObjectURL(file)}
                                                    alt={`Imagen ${idx + 1}`}
                                                    className="w-full h-full object-cover rounded-md"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {imageStep.requireGPS && (
                                    <p className="text-xs text-slate-500">
                                        📍 Se capturará la ubicación GPS
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                    <Button
                        onClick={handleComplete}
                        disabled={step.required && files.length === 0}
                        className="w-full"
                    >
                        Siguiente
                    </Button>
                </div>
            );

        case 'DOCUMENT':
            const docStep = step as any;
            return (
                <div className="space-y-4">
                    <div>
                        <Label>{step.title}</Label>
                        {step.description && (
                            <p className="text-sm text-slate-500 mb-2">{step.description}</p>
                        )}

                        <div className="border-2 border-dashed border-slate-300 rounded-lg p-8">
                            <div className="flex flex-col items-center gap-4">
                                <FileText className="h-12 w-12 text-slate-400" />
                                <Button
                                    type="button"
                                    onClick={() => {
                                        const input = document.createElement('input');
                                        input.type = 'file';
                                        input.accept = docStep.acceptedFormats?.join(',') || '.pdf,.doc,.docx';
                                        input.multiple = docStep.allowMultiple;
                                        input.onchange = (e: any) => {
                                            const selectedFiles = Array.from(e.target.files || []);
                                            setFiles(prev => [...prev, ...selectedFiles as File[]]);
                                        };
                                        input.click();
                                    }}
                                >
                                    <Upload className="mr-2 h-4 w-4" />
                                    Seleccionar Archivo
                                </Button>

                                {files.length > 0 && (
                                    <div className="w-full space-y-2">
                                        {files.map((file, idx) => (
                                            <div key={idx} className="flex items-center gap-2 p-2 bg-slate-50 rounded-md">
                                                <FileText className="h-4 w-4" />
                                                <span className="text-sm flex-1">{file.name}</span>
                                                <span className="text-xs text-slate-500">
                                                    {(file.size / 1024).toFixed(1)} KB
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                    <Button
                        onClick={handleComplete}
                        disabled={step.required && files.length === 0}
                        className="w-full"
                    >
                        Siguiente
                    </Button>
                </div>
            );

        case 'CHECKBOX':
            const checkStep = step as any;
            return (
                <div className="space-y-4">
                    <div className="flex items-start space-x-3">
                        <Checkbox
                            checked={value}
                            onCheckedChange={(checked: boolean) => setValue(checked)}
                            className="mt-1"
                        />
                        <div className="flex-1">
                            <Label className="text-base">{checkStep.label || step.title}</Label>
                            {step.description && (
                                <p className="text-sm text-slate-500 mt-1">{step.description}</p>
                            )}
                        </div>
                    </div>

                    {checkStep.requiresComment && (
                        <div>
                            <Label>Comentario</Label>
                            <Textarea
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
                                placeholder={checkStep.commentPlaceholder || 'Añade un comentario...'}
                                className="mt-2"
                            />
                        </div>
                    )}

                    <Button
                        onClick={handleComplete}
                        disabled={step.required && !value}
                        className="w-full"
                    >
                        Siguiente
                    </Button>
                </div>
            );

        case 'SIGNATURE':
            const sigStep = step as any;
            return (
                <div className="space-y-4">
                    <div>
                        <Label>{step.title}</Label>
                        {step.description && (
                            <p className="text-sm text-slate-500 mb-2">{step.description}</p>
                        )}

                        {/* Simplified signature - in production you'd use a canvas library */}
                        <div className="border-2 border-slate-300 rounded-lg p-8 bg-slate-50">
                            <div className="text-center space-y-4">
                                <p className="text-sm text-slate-600">
                                    Firmante: {sigStep.signerName || 'N/A'}
                                </p>
                                <Input
                                    type="text"
                                    placeholder="Escriba su nombre completo"
                                    value={value || ''}
                                    onChange={(e) => setValue(e.target.value)}
                                    className="text-center italic"
                                />
                                <p className="text-xs text-slate-500">
                                    Al escribir su nombre, acepta firmar digitalmente este documento
                                </p>
                            </div>
                        </div>
                    </div>
                    <Button
                        onClick={handleComplete}
                        disabled={step.required && !value}
                        className="w-full"
                    >
                        Firmar y Continuar
                    </Button>
                </div>
            );

        default:
            return (
                <div className="text-center py-8">
                    <p className="text-slate-500">Tipo de paso no soportado: {(step as TemplateStep).type}</p>
                </div>
            );
    }
};
