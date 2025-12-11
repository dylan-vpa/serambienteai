import { useState } from 'react';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, Loader2, Lock, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';

interface SamplingStepProps {
    oitId: string;
    step: any;
    stepIndex: number;
    isLocked: boolean;
    validation: any | null;
    onValidationComplete: () => void;
}

export function SamplingStep({ oitId, step, stepIndex, isLocked, validation, onValidationComplete }: SamplingStepProps) {
    const [userData, setUserData] = useState(validation?.data || {});
    const [isValidating, setIsValidating] = useState(false);

    const handleSubmit = async () => {
        if (!userData || Object.keys(userData).length === 0) {
            toast.error('Por favor ingresa los datos del paso');
            return;
        }

        setIsValidating(true);
        try {
            const response = await api.post(`/oits/${oitId}/validate-step`, {
                stepIndex,
                stepDescription: step.description,
                stepRequirements: step.requirements || 'Completar el paso correctamente',
                userData
            });

            if (response.data.validated) {
                toast.success('¡Paso validado correctamente por IA!');
            } else {
                toast.error('Paso rechazado por IA. Revisa los datos.');
            }

            onValidationComplete();
        } catch (error: any) {
            console.error('Error validating step:', error);
            toast.error(error.response?.data?.error || 'Error al validar el paso');
        } finally {
            setIsValidating(false);
        }
    };

    const getStatusBadge = () => {
        if (isLocked) {
            return (
                <Badge className="bg-slate-200 text-slate-600 flex items-center gap-1">
                    <Lock className="h-3 w-3" />
                    Bloqueado
                </Badge>
            );
        }

        if (!validation) {
            return (
                <Badge className="bg-amber-100 text-amber-700 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    Pendiente
                </Badge>
            );
        }

        if (validation.validated) {
            return (
                <Badge className="bg-green-100 text-green-700 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    Validado
                </Badge>
            );
        }

        return (
            <Badge className="bg-red-100 text-red-700 flex items-center gap-1">
                <XCircle className="h-3 w-3" />
                Rechazado
            </Badge>
        );
    };

    return (
        <Card className={`${isLocked ? 'opacity-60' : ''}`}>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Paso {stepIndex + 1}</CardTitle>
                    {getStatusBadge()}
                </div>
                <p className="text-sm text-slate-600 mt-2">{step.description}</p>
            </CardHeader>

            <CardContent className="space-y-4">
                {!isLocked && (
                    <>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Datos del Muestreo
                            </label>
                            <textarea
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100"
                                rows={4}
                                placeholder="Ingresa los datos recopilados en este paso..."
                                value={JSON.stringify(userData, null, 2)}
                                onChange={(e) => {
                                    try {
                                        setUserData(JSON.parse(e.target.value));
                                    } catch {
                                        // Invalid JSON, ignore
                                    }
                                }}
                                disabled={validation?.validated}
                            />
                            <p className="text-xs text-slate-500 mt-1">
                                Ingresa los datos en formato JSON. Ejemplo: {`{"temperatura": "25°C", "humedad": "60%"}`}
                            </p>
                        </div>

                        {validation?.feedback && (
                            <div className={`p-3 rounded-lg ${validation.validated ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                                <p className="text-sm font-medium text-slate-700 mb-1">Retroalimentación de IA:</p>
                                <p className="text-sm text-slate-600">{validation.feedback}</p>
                                {validation.confidence && (
                                    <p className="text-xs text-slate-500 mt-1">
                                        Confianza: {(validation.confidence * 100).toFixed(0)}%
                                    </p>
                                )}
                            </div>
                        )}

                        {!validation?.validated && (
                            <Button
                                onClick={handleSubmit}
                                disabled={isValidating}
                                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
                            >
                                {isValidating ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Validando...
                                    </>
                                ) : (
                                    'Validar Paso con IA'
                                )}
                            </Button>
                        )}
                    </>
                )}

                {isLocked && (
                    <div className="text-center py-4">
                        <Lock className="h-8 w-8 mx-auto text-slate-400 mb-2" />
                        <p className="text-sm text-slate-500">
                            Completa los pasos anteriores primero
                        </p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
