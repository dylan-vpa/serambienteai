import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Save, Trash2, GripVertical, FileText, Type, Image, FileUp, CheckSquare, PenTool } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import api from '@/lib/api';
import { toast } from 'sonner';
import type { TemplateStep } from '@/types/sampling';
import { StepTypeBuilder } from '@/components/sampling/StepTypeBuilder';

interface FormData {
    name: string;
    description: string;
    oitType: string;
    steps: TemplateStep[];
}

export default function CreateTemplatePage() {
    const navigate = useNavigate();
    const [isCreating, setIsCreating] = useState(false);
    const [formData, setFormData] = useState<FormData>({
        name: '',
        description: '',
        oitType: '',
        steps: []
    });

    const handleAddStep = (step: TemplateStep) => {
        // Assign order based on current steps length
        const stepWithOrder = { ...step, order: formData.steps.length };
        setFormData({
            ...formData,
            steps: [...formData.steps, stepWithOrder]
        });
        toast.success('Paso agregado');
    };

    const handleRemoveStep = (stepId: string) => {
        setFormData({
            ...formData,
            steps: formData.steps.filter(s => s.id !== stepId)
        });
    };

    const getStepIcon = (type: string) => {
        switch (type) {
            case 'TEXT': return <FileText className="h-4 w-4" />;
            case 'INPUT': return <Type className="h-4 w-4" />;
            case 'IMAGE': return <Image className="h-4 w-4" />;
            case 'DOCUMENT': return <FileUp className="h-4 w-4" />;
            case 'CHECKBOX': return <CheckSquare className="h-4 w-4" />;
            case 'SIGNATURE': return <PenTool className="h-4 w-4" />;
            default: return <FileText className="h-4 w-4" />;
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.name || !formData.description || !formData.oitType) {
            toast.error('Por favor completa todos los campos requeridos');
            return;
        }

        if (formData.steps.length === 0) {
            toast.error('Agrega al menos un paso a la plantilla');
            return;
        }

        try {
            setIsCreating(true);
            await api.post('/sampling-templates', formData);

            toast.success('Plantilla creada exitosamente');
            navigate('/sampling-templates');
        } catch (error) {
            console.error('Error creating template:', error);
            toast.error('Error al crear plantilla');
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-slate-900">Nueva Plantilla de Muestreo</h2>
                    <p className="text-slate-500">Define un flujo de trabajo reutilizable con pasos versátiles</p>
                </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit}>
                <div className="grid md:grid-cols-3 gap-6">
                    {/* Main Form */}
                    <Card className="md:col-span-2 border-slate-200 shadow-sm bg-white">
                        <CardHeader className="border-b border-slate-100">
                            <h3 className="font-semibold text-slate-900">Información de la Plantilla</h3>
                        </CardHeader>
                        <CardContent className="space-y-6 pt-6">
                            <div className="grid gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="name">Nombre de la Plantilla *</Label>
                                    <Input
                                        id="name"
                                        placeholder="Ej: Muestreo de Agua Potable"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        required
                                    />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="oitType">Tipo de OIT *</Label>
                                    <Input
                                        id="oitType"
                                        placeholder="Ej: AGUA, SUELO, AIRE"
                                        value={formData.oitType}
                                        onChange={(e) => setFormData({ ...formData, oitType: e.target.value.toUpperCase() })}
                                        required
                                    />
                                    <p className="text-xs text-slate-500">
                                        La IA usará este tipo para seleccionar automáticamente la plantilla apropiada.
                                    </p>
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="description">Descripción *</Label>
                                    <Textarea
                                        id="description"
                                        placeholder="Describe cuándo usar esta plantilla..."
                                        className="h-24 resize-none"
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>

                            {/* Steps List */}
                            <div className="border-t pt-6">
                                <div className="mb-4">
                                    <h4 className="font-semibold text-slate-900">Pasos del Flujo de Trabajo</h4>
                                    <p className="text-sm text-slate-500">Define los pasos versátiles que se seguirán durante el muestreo</p>
                                </div>

                                {/* Current Steps */}
                                {formData.steps.length > 0 && (
                                    <div className="space-y-2 mb-4">
                                        {formData.steps.map((step, index) => (
                                            <div key={step.id} className="flex items-start gap-3 p-4 bg-slate-50 rounded-lg border border-slate-200">
                                                <div className="flex items-center gap-3 flex-1">
                                                    <GripVertical className="h-4 w-4 text-slate-400" />
                                                    <div className="h-7 w-7 rounded-full bg-slate-900 text-white flex items-center justify-center text-sm font-medium flex-shrink-0">
                                                        {index + 1}
                                                    </div>
                                                    {getStepIcon(step.type)}
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <Badge variant="outline" className="text-xs">
                                                                {step.type}
                                                            </Badge>
                                                            <p className="font-medium text-slate-900">{step.title}</p>
                                                        </div>
                                                        {step.description && (
                                                            <p className="text-sm text-slate-500 mt-0.5">{step.description}</p>
                                                        )}
                                                    </div>
                                                </div>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50"
                                                    onClick={() => handleRemoveStep(step.id)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Step Builder */}
                                <StepTypeBuilder onAddStep={handleAddStep} />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        <Card className="border-slate-200 shadow-sm bg-white">
                            <CardHeader className="border-b border-slate-100">
                                <h3 className="font-semibold text-slate-900">Resumen</h3>
                            </CardHeader>
                            <CardContent className="pt-6">
                                <div className="space-y-3 text-sm">
                                    <div className="flex items-center justify-between py-2 border-b border-slate-100">
                                        <span className="text-slate-500">Nombre:</span>
                                        <span className="font-medium text-slate-900">
                                            {formData.name || '-'}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between py-2 border-b border-slate-100">
                                        <span className="text-slate-500">Tipo:</span>
                                        <span className="font-medium text-slate-900">
                                            {formData.oitType || '-'}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between py-2">
                                        <span className="text-slate-500">Pasos:</span>
                                        <span className="font-medium text-slate-900">
                                            {formData.steps.length}
                                        </span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border-slate-200 shadow-sm bg-white">
                            <CardContent className="pt-6">
                                <div className="space-y-3">
                                    <Button
                                        type="submit"
                                        disabled={isCreating}
                                        className="w-full bg-slate-900 hover:bg-slate-800 text-white"
                                    >
                                        <Save className="mr-2 h-4 w-4" />
                                        {isCreating ? 'Creando...' : 'Crear Plantilla'}
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => navigate('/sampling-templates')}
                                        className="w-full"
                                    >
                                        Cancelar
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </form>
        </div>
    );
}
