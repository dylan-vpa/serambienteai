import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { StepRenderer } from './StepRenderer';
import { ChevronLeft, Save } from 'lucide-react';
import type { TemplateStep, StepData, SamplingData } from '@/types/sampling';
import api from '@/lib/api';
import { toast } from 'sonner';

interface SamplingExecutorProps {
    templateId: string;
    oitId: string;
    onComplete: (data: SamplingData) => void;
}

export const SamplingExecutor: React.FC<SamplingExecutorProps> = ({
    templateId,
    oitId,
    onComplete
}) => {
    const [templateName, setTemplateName] = useState('');
    const [steps, setSteps] = useState<TemplateStep[]>([]);
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const [collectedData, setCollectedData] = useState<StepData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        loadTemplate();
    }, [templateId]);

    const loadTemplate = async () => {
        try {
            const response = await api.get(`/sampling-templates/${templateId}`);
            const template = response.data;
            setTemplateName(template.name);

            const parsedSteps: TemplateStep[] = JSON.parse(template.steps);
            // Sort by order
            parsedSteps.sort((a, b) => a.order - b.order);
            setSteps(parsedSteps);
        } catch (error) {
            console.error('Error loading template:', error);
            toast.error('Error al cargar la plantilla');
        } finally {
            setIsLoading(false);
        }
    };

    const handleStepComplete = (stepData: StepData) => {
        const newCollectedData = [...collectedData, stepData];
        setCollectedData(newCollectedData);

        // Auto-advance to next step
        if (currentStepIndex < steps.length - 1) {
            setCurrentStepIndex(currentStepIndex + 1);
        } else {
            // All steps complete
            finalizeSampling(newCollectedData);
        }
    };

    const finalizeSampling = async (data: StepData[]) => {
        const samplingData: SamplingData = {
            templateId,
            templateName,
            startedAt: collectedData[0]?.timestamp || new Date().toISOString(),
            completedAt: new Date().toISOString(),
            steps: data,
            progress: 100,
            syncStatus: 'pending'
        };

        try {
            setIsSaving(true);
            await api.post(`/oits/${oitId}/sampling-data`, samplingData);
            toast.success('Muestreo completado exitosamente');
            onComplete(samplingData);
        } catch (error) {
            console.error('Error saving sampling data:', error);
            toast.error('Error al guardar datos de muestreo');
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveProgress = async () => {
        const samplingData: SamplingData = {
            templateId,
            templateName,
            startedAt: collectedData[0]?.timestamp || new Date().toISOString(),
            steps: collectedData,
            progress: Math.round((collectedData.length / steps.length) * 100),
            syncStatus: 'pending'
        };

        try {
            setIsSaving(true);
            await api.post(`/oits/${oitId}/sampling-data`, { ...samplingData, partial: true });
            toast.success('Progreso guardado');
        } catch (error) {
            console.error('Error saving progress:', error);
            toast.error('Error al guardar progreso');
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900 mx-auto mb-4"></div>
                    <p className="text-slate-500">Cargando plantilla...</p>
                </div>
            </div>
        );
    }

    if (steps.length === 0) {
        return (
            <div className="text-center py-12">
                <p className="text-slate-500">No hay pasos definidos en esta plantilla</p>
            </div>
        );
    }

    const currentStep = steps[currentStepIndex];
    const progress = Math.round((collectedData.length / steps.length) * 100);

    return (
        <div className="space-y-6">
            {/* Progress */}
            <Card>
                <CardContent className="pt-6">
                    <div className="space-y-3">
                        <div className="flex items-center justify-between text-sm">
                            <span className="font-medium text-slate-700">
                                Paso {currentStepIndex + 1} de {steps.length}
                            </span>
                            <span className="text-slate-500">{progress}% completado</span>
                        </div>
                        <Progress value={progress} className="h-2" />
                        <div className="flex items-center justify-between">
                            <Badge variant="outline" className="text-xs">
                                {templateName}
                            </Badge>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleSaveProgress}
                                disabled={isSaving || collectedData.length === 0}
                            >
                                <Save className="h-4 w-4 mr-2" />
                                {isSaving ? 'Guardando...' : 'Guardar Progreso'}
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Current Step */}
            <Card>
                <CardHeader className="border-b">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-slate-900 text-white flex items-center justify-center font-semibold">
                            {currentStepIndex + 1}
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center gap-2">
                                <Badge>{currentStep.type}</Badge>
                                {currentStep.required && (
                                    <Badge variant="destructive" className="text-xs">Requerido</Badge>
                                )}
                            </div>
                            <h3 className="text-lg font-semibold mt-1">{currentStep.title}</h3>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="pt-6">
                    <StepRenderer
                        step={currentStep}
                        onComplete={handleStepComplete}
                    />
                </CardContent>
            </Card>

            {/* Navigation */}
            <div className="flex justify-between">
                <Button
                    variant="outline"
                    onClick={() => setCurrentStepIndex(Math.max(0, currentStepIndex - 1))}
                    disabled={currentStepIndex === 0}
                >
                    <ChevronLeft className="h-4 w-4 mr-2" />
                    Anterior
                </Button>

                {collectedData.length > 0 && (
                    <p className="text-sm text-slate-500 flex items-center">
                        {collectedData.length} paso{collectedData.length !== 1 ? 's' : ''} completado{collectedData.length !== 1 ? 's' : ''}
                    </p>
                )}
            </div>
        </div>
    );
};
