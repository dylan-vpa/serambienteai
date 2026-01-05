import React, { useState } from 'react';
import { Star, ThumbsUp, ThumbsDown, Send, Edit3, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface FeedbackGridProps {
    oitId?: string;
    category: 'OIT_ANALYSIS' | 'PROPOSAL' | 'REPORT' | 'TEMPLATE_MAPPING';
    aiOutput: string;
    fields?: Array<{ name: string; value: string; label: string }>;
    onFeedbackSubmit?: (feedback: FeedbackData) => void;
}

interface FeedbackData {
    category: string;
    aiOutput: string;
    rating: number;
    feedbackType: 'CORRECT' | 'PARTIAL' | 'WRONG';
    fieldName?: string;
    correctValue?: string;
    notes?: string;
}

export const FeedbackGrid: React.FC<FeedbackGridProps> = ({
    oitId,
    category,
    aiOutput,
    fields = [],
    onFeedbackSubmit
}) => {
    const [rating, setRating] = useState(0);
    const [feedbackType, setFeedbackType] = useState<'CORRECT' | 'PARTIAL' | 'WRONG' | null>(null);
    const [selectedField, setSelectedField] = useState<string | null>(null);
    const [correctValue, setCorrectValue] = useState('');
    const [notes, setNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = async () => {
        if (!feedbackType) {
            toast.error('Por favor indica si el resultado es correcto, parcial o incorrecto');
            return;
        }

        setIsSubmitting(true);

        const feedbackData: FeedbackData = {
            category,
            aiOutput: aiOutput.substring(0, 500), // Limit stored content
            rating,
            feedbackType,
            fieldName: selectedField || undefined,
            correctValue: correctValue || undefined,
            notes: notes || undefined
        };

        try {
            const response = await fetch('/api/feedback', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...feedbackData, oitId })
            });

            if (response.ok) {
                toast.success('¡Gracias! Tu feedback ayudará a mejorar la IA');
                setSubmitted(true);
                onFeedbackSubmit?.(feedbackData);
            } else {
                throw new Error('Failed to submit');
            }
        } catch (error) {
            toast.error('Error al enviar feedback');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (submitted) {
        return (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4 flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="text-green-700 dark:text-green-300">Feedback registrado. ¡Gracias!</span>
            </div>
        );
    }

    return (
        <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-5 space-y-4 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300">
                <Edit3 className="w-4 h-4" />
                <span>Califica este resultado para mejorar la IA</span>
            </div>

            {/* Rating Stars */}
            <div className="flex items-center gap-1">
                <span className="text-sm text-slate-500 mr-2">Calidad:</span>
                {[1, 2, 3, 4, 5].map((star) => (
                    <button
                        key={star}
                        onClick={() => setRating(star)}
                        className={`p-1 transition-transform hover:scale-110 ${rating >= star ? 'text-yellow-500' : 'text-slate-300'}`}
                    >
                        <Star className="w-5 h-5" fill={rating >= star ? 'currentColor' : 'none'} />
                    </button>
                ))}
            </div>

            {/* Feedback Type Buttons */}
            <div className="flex gap-2">
                <button
                    onClick={() => setFeedbackType('CORRECT')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all ${feedbackType === 'CORRECT'
                        ? 'bg-green-100 border-green-500 text-green-700 dark:bg-green-900/40 dark:text-green-300'
                        : 'border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700'
                        }`}
                >
                    <ThumbsUp className="w-4 h-4" />
                    Correcto
                </button>
                <button
                    onClick={() => setFeedbackType('PARTIAL')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all ${feedbackType === 'PARTIAL'
                        ? 'bg-yellow-100 border-yellow-500 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300'
                        : 'border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700'
                        }`}
                >
                    <AlertCircle className="w-4 h-4" />
                    Parcial
                </button>
                <button
                    onClick={() => setFeedbackType('WRONG')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all ${feedbackType === 'WRONG'
                        ? 'bg-red-100 border-red-500 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                        : 'border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700'
                        }`}
                >
                    <ThumbsDown className="w-4 h-4" />
                    Incorrecto
                </button>
            </div>

            {/* Field Selection (if fields provided) */}
            {fields.length > 0 && (feedbackType === 'PARTIAL' || feedbackType === 'WRONG') && (
                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-600 dark:text-slate-300">
                        ¿Qué campo está mal?
                    </label>
                    <select
                        value={selectedField || ''}
                        onChange={(e) => setSelectedField(e.target.value)}
                        className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800"
                    >
                        <option value="">Seleccionar campo...</option>
                        {fields.map((field) => (
                            <option key={field.name} value={field.name}>
                                {field.label}: {field.value.substring(0, 50)}...
                            </option>
                        ))}
                    </select>
                </div>
            )}

            {/* Correction Input */}
            {(feedbackType === 'PARTIAL' || feedbackType === 'WRONG') && (
                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-600 dark:text-slate-300">
                        Valor correcto o corrección:
                    </label>
                    <textarea
                        value={correctValue}
                        onChange={(e) => setCorrectValue(e.target.value)}
                        placeholder="Escribe cómo debería ser el resultado correcto..."
                        className="w-full p-3 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 min-h-[80px] resize-y"
                    />
                </div>
            )}

            {/* Notes */}
            <div className="space-y-2">
                <label className="text-sm font-medium text-slate-600 dark:text-slate-300">
                    Notas adicionales (opcional):
                </label>
                <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Ej: El formato de fecha debería ser DD/MM/YYYY"
                    className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800"
                />
            </div>

            {/* Submit Button */}
            <button
                onClick={handleSubmit}
                disabled={isSubmitting || !feedbackType}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-medium hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
                {isSubmitting ? (
                    <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Enviando...
                    </>
                ) : (
                    <>
                        <Send className="w-4 h-4" />
                        Enviar Feedback
                    </>
                )}
            </button>
        </div>
    );
};

export default FeedbackGrid;
