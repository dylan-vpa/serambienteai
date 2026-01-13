import React, { useState, useRef } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Star, ThumbsUp, ThumbsDown, AlertCircle, Upload, FileText, X, Send, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export type FeedbackCategory = 'OIT_ANALYSIS' | 'PROPOSAL' | 'REPORT' | 'TEMPLATE_MAPPING' | 'QUOTATION_ANALYSIS' | 'QUOTATION_COMPLIANCE';

interface FeedbackModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    oitId?: string;
    category: FeedbackCategory;
    aiOutput: string;
    title?: string;
    fields?: Array<{ name: string; value: string; label: string }>;
    onSubmitSuccess?: () => void;
}

interface FeedbackData {
    oitId?: string;
    category: FeedbackCategory;
    aiOutput: string;
    rating: number;
    feedbackType: 'CORRECT' | 'PARTIAL' | 'WRONG';
    fieldName?: string;
    correctValue?: string;
    notes?: string;
    attachmentUrl?: string;
}

const categoryLabels: Record<FeedbackCategory, string> = {
    'OIT_ANALYSIS': 'Análisis de OIT',
    'PROPOSAL': 'Propuesta de Programación',
    'REPORT': 'Informe Final',
    'TEMPLATE_MAPPING': 'Mapeo de Plantilla',
    'QUOTATION_ANALYSIS': 'Análisis de Cotización',
    'QUOTATION_COMPLIANCE': 'Cumplimiento de Cotización'
};

export function FeedbackModal({
    open,
    onOpenChange,
    oitId,
    category,
    aiOutput,
    title,
    fields = [],
    onSubmitSuccess
}: FeedbackModalProps) {
    const [rating, setRating] = useState(0);
    const [feedbackType, setFeedbackType] = useState<'CORRECT' | 'PARTIAL' | 'WRONG' | null>(null);
    const [selectedField, setSelectedField] = useState<string | null>(null);
    const [correctValue, setCorrectValue] = useState('');
    const [notes, setNotes] = useState('');
    const [attachment, setAttachment] = useState<File | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleAttachmentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 10 * 1024 * 1024) {
                toast.error('El archivo no puede superar 10MB');
                return;
            }
            setAttachment(file);
        }
    };

    const handleSubmit = async () => {
        if (!feedbackType) {
            toast.error('Por favor indica si el resultado es correcto, parcial o incorrecto');
            return;
        }

        setIsSubmitting(true);

        try {
            let attachmentUrl: string | undefined;

            // Upload attachment if exists
            if (attachment) {
                const formData = new FormData();
                formData.append('file', attachment);
                formData.append('type', 'feedback');

                const uploadRes = await fetch('/api/files/upload', {
                    method: 'POST',
                    body: formData
                });

                if (uploadRes.ok) {
                    const data = await uploadRes.json();
                    attachmentUrl = data.url;
                }
            }

            const feedbackData: FeedbackData = {
                oitId,
                category,
                aiOutput: aiOutput.substring(0, 2000),
                rating,
                feedbackType,
                fieldName: selectedField || undefined,
                correctValue: correctValue || undefined,
                notes: notes || undefined,
                attachmentUrl
            };

            const response = await fetch('/api/feedback', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(feedbackData)
            });

            if (response.ok) {
                toast.success('¡Gracias! Tu feedback ayudará a mejorar la IA');
                onOpenChange(false);
                onSubmitSuccess?.();
                // Reset form
                setRating(0);
                setFeedbackType(null);
                setSelectedField(null);
                setCorrectValue('');
                setNotes('');
                setAttachment(null);
            } else {
                throw new Error('Failed to submit');
            }
        } catch (error) {
            toast.error('Error al enviar feedback');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px] bg-white border-slate-200">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-slate-900">
                        <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white">
                            <Star className="h-4 w-4" />
                        </div>
                        {title || `Feedback: ${categoryLabels[category]}`}
                    </DialogTitle>
                    <DialogDescription className="text-slate-500">
                        Tu retroalimentación nos ayuda a mejorar la calidad de los resultados de la IA.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-5 py-4">
                    {/* Star Rating */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">Calificación general</label>
                        <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                    key={star}
                                    onClick={() => setRating(star)}
                                    className={`p-1 transition-all hover:scale-110 ${rating >= star ? 'text-amber-500' : 'text-slate-300 hover:text-amber-300'
                                        }`}
                                >
                                    <Star className="w-6 h-6" fill={rating >= star ? 'currentColor' : 'none'} />
                                </button>
                            ))}
                            <span className="ml-2 text-sm text-slate-500">
                                {rating > 0 ? `${rating}/5` : 'Sin calificar'}
                            </span>
                        </div>
                    </div>

                    {/* Feedback Type */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">¿El resultado fue correcto?</label>
                        <div className="grid grid-cols-3 gap-2">
                            <button
                                onClick={() => setFeedbackType('CORRECT')}
                                className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all ${feedbackType === 'CORRECT'
                                    ? 'bg-emerald-50 border-emerald-500 text-emerald-700'
                                    : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                                    }`}
                            >
                                <ThumbsUp className="w-5 h-5" />
                                <span className="text-xs font-medium">Correcto</span>
                            </button>
                            <button
                                onClick={() => setFeedbackType('PARTIAL')}
                                className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all ${feedbackType === 'PARTIAL'
                                    ? 'bg-amber-50 border-amber-500 text-amber-700'
                                    : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                                    }`}
                            >
                                <AlertCircle className="w-5 h-5" />
                                <span className="text-xs font-medium">Parcial</span>
                            </button>
                            <button
                                onClick={() => setFeedbackType('WRONG')}
                                className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all ${feedbackType === 'WRONG'
                                    ? 'bg-red-50 border-red-500 text-red-700'
                                    : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                                    }`}
                            >
                                <ThumbsDown className="w-5 h-5" />
                                <span className="text-xs font-medium">Incorrecto</span>
                            </button>
                        </div>
                    </div>

                    {/* Field Selection */}
                    {fields.length > 0 && (feedbackType === 'PARTIAL' || feedbackType === 'WRONG') && (
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700">¿Qué sección está incorrecta?</label>
                            <select
                                value={selectedField || ''}
                                onChange={(e) => setSelectedField(e.target.value)}
                                className="w-full p-2.5 rounded-lg border border-slate-200 bg-white text-slate-900 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                            >
                                <option value="">Seleccionar sección...</option>
                                {fields.map((field) => (
                                    <option key={field.name} value={field.name}>
                                        {field.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Correction Input */}
                    {(feedbackType === 'PARTIAL' || feedbackType === 'WRONG') && (
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700">
                                ¿Cuál sería el valor correcto?
                            </label>
                            <textarea
                                value={correctValue}
                                onChange={(e) => setCorrectValue(e.target.value)}
                                placeholder="Describe cómo debería ser el resultado correcto..."
                                className="w-full p-3 rounded-lg border border-slate-200 bg-white text-slate-900 text-sm min-h-[80px] resize-y focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                            />
                        </div>
                    )}

                    {/* PDF Attachment */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">
                            Adjuntar documento de referencia (opcional)
                        </label>
                        <div
                            className={`relative border-2 border-dashed rounded-lg p-4 transition-all ${attachment
                                ? 'border-emerald-500 bg-emerald-50'
                                : 'border-slate-200 hover:border-slate-400'
                                }`}
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".pdf,.docx,.xlsx"
                                onChange={handleAttachmentChange}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                            {attachment ? (
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <FileText className="w-5 h-5 text-emerald-600" />
                                        <span className="text-sm text-emerald-700 font-medium">
                                            {attachment.name}
                                        </span>
                                    </div>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setAttachment(null);
                                            if (fileInputRef.current) fileInputRef.current.value = '';
                                        }}
                                        className="p-1 hover:bg-emerald-200 rounded"
                                    >
                                        <X className="w-4 h-4 text-emerald-600" />
                                    </button>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center gap-1 text-slate-500">
                                    <Upload className="w-5 h-5" />
                                    <span className="text-xs">PDF, DOCX o XLSX (máx. 10MB)</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Notes */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">
                            Notas adicionales (opcional)
                        </label>
                        <input
                            type="text"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Ej: El formato de fecha debería ser DD/MM/YYYY"
                            className="w-full p-2.5 rounded-lg border border-slate-200 bg-white text-slate-900 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        className="border-slate-200 text-slate-700 hover:bg-slate-50"
                    >
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={isSubmitting || !feedbackType}
                        className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-700 hover:to-teal-700"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Enviando...
                            </>
                        ) : (
                            <>
                                <Send className="w-4 h-4 mr-2" />
                                Enviar Feedback
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// Trigger Button Component
interface FeedbackButtonProps {
    onClick: () => void;
    variant?: 'default' | 'minimal' | 'icon';
    label?: string;
    className?: string;
}

export function FeedbackButton({ onClick, variant = 'default', label, className }: FeedbackButtonProps) {
    if (variant === 'icon') {
        return (
            <button
                onClick={onClick}
                className={`p-2 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 transition-colors ${className}`}
                title="Dar feedback"
            >
                <Star className="w-4 h-4" />
            </button>
        );
    }

    if (variant === 'minimal') {
        return (
            <button
                onClick={onClick}
                className={`text-sm text-slate-500 hover:text-emerald-600 flex items-center gap-1 transition-colors ${className}`}
            >
                <Star className="w-3.5 h-3.5" />
                {label || 'Dar feedback'}
            </button>
        );
    }

    return (
        <Button
            onClick={onClick}
            variant="outline"
            className={`border-slate-200 text-slate-700 hover:border-emerald-500 hover:text-emerald-700 hover:bg-emerald-50 ${className}`}
        >
            <Star className="w-4 h-4 mr-2" />
            {label || 'Dar feedback'}
        </Button>
    );
}

export default FeedbackModal;
