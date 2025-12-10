import React, { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, FileText, Type, Image, FileUp, CheckSquare, PenTool } from 'lucide-react';
import type { TemplateStep, StepType } from '@/types/sampling';

interface StepBuilderProps {
    onAddStep: (step: TemplateStep) => void;
}

export const StepTypeBuilder: React.FC<StepBuilderProps> = ({ onAddStep }) => {
    const [stepType, setStepType] = useState<StepType>('TEXT');
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [required, setRequired] = useState(true);

    // Type-specific fields
    const [content, setContent] = useState('');  // TEXT
    const [inputType, setInputType] = useState<'text' | 'number' | 'date' | 'time' | 'email'>('text');  // INPUT
    const [placeholder, setPlaceholder] = useState('');
    const [unit, setUnit] = useState('');
    const [allowMultiple, setAllowMultiple] = useState(false);  // IMAGE, DOCUMENT
    const [requireGPS, setRequireGPS] = useState(false);  // IMAGE
    const [acceptedFormats, setAcceptedFormats] = useState<string[]>(['.pdf']);  // DOCUMENT
    const [checkboxLabel, setCheckboxLabel] = useState('');  // CHECKBOX
    const [requiresComment, setRequiresComment] = useState(false);  // CHECKBOX
    const [signerName, setSignerName] = useState('');  // SIGNATURE

    const resetForm = () => {
        setTitle('');
        setDescription('');
        setContent('');
        setPlaceholder('');
        setUnit('');
        setAllowMultiple(false);
        setRequireGPS(false);
        setCheckboxLabel('');
        setRequiresComment(false);
        setSignerName('');
    };

    const handleAddStep = () => {
        if (!title.trim()) {
            return;
        }

        const baseStep = {
            id: Date.now().toString(),
            title,
            description,
            required,
            order: 0
        };

        let step: TemplateStep;

        switch (stepType) {
            case 'TEXT':
                step = { ...baseStep, type: 'TEXT', content };
                break;
            case 'INPUT':
                step = {
                    ...baseStep,
                    type: 'INPUT',
                    inputType,
                    placeholder,
                    unit,
                    validation: {}
                };
                break;
            case 'IMAGE':
                step = {
                    ...baseStep,
                    type: 'IMAGE',
                    allowMultiple,
                    requireGPS
                };
                break;
            case 'DOCUMENT':
                step = {
                    ...baseStep,
                    type: 'DOCUMENT',
                    acceptedFormats,
                    allowMultiple
                };
                break;
            case 'CHECKBOX':
                step = {
                    ...baseStep,
                    type: 'CHECKBOX',
                    label: checkboxLabel,
                    requiresComment
                };
                break;
            case 'SIGNATURE':
                step = {
                    ...baseStep,
                    type: 'SIGNATURE',
                    signerName
                };
                break;
        }

        onAddStep(step);
        resetForm();
    };

    const getStepIcon = (type: StepType) => {
        switch (type) {
            case 'TEXT': return <FileText className="h-4 w-4" />;
            case 'INPUT': return <Type className="h-4 w-4" />;
            case 'IMAGE': return <Image className="h-4 w-4" />;
            case 'DOCUMENT': return <FileUp className="h-4 w-4" />;
            case 'CHECKBOX': return <CheckSquare className="h-4 w-4" />;
            case 'SIGNATURE': return <PenTool className="h-4 w-4" />;
        }
    };

    return (
        <Card className="border-2 border-dashed border-slate-300">
            <CardHeader className="pb-4">
                <h4 className="font-semibold flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Agregar Paso
                </h4>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Step Type Selection */}
                <div className="grid grid-cols-3 gap-2">
                    {(['TEXT', 'INPUT', 'IMAGE', 'DOCUMENT', 'CHECKBOX', 'SIGNATURE'] as StepType[]).map(type => (
                        <Button
                            key={type}
                            variant={stepType === type ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setStepType(type)}
                            className="justify-start"
                        >
                            {getStepIcon(type)}
                            <span className="ml-2 text-xs">{type}</span>
                        </Button>
                    ))}
                </div>

                {/* Common Fields */}
                <div className="space-y-3">
                    <div>
                        <Label>Título del Paso *</Label>
                        <Input
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Ej: Medición de temperatura"
                        />
                    </div>

                    <div>
                        <Label>Descripción</Label>
                        <Textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Instrucciones adicionales..."
                            className="h-20"
                        />
                    </div>

                    <div className="flex items-center space-x-2">
                        <Checkbox
                            checked={required}
                            onCheckedChange={(checked: boolean) => setRequired(!!checked)}
                        />
                        <Label>Campo requerido</Label>
                    </div>
                </div>

                {/* Type-Specific Fields */}
                {stepType === 'TEXT' && (
                    <div>
                        <Label>Contenido</Label>
                        <Textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder="Instrucciones detalladas..."
                            className="h-32"
                        />
                    </div>
                )}

                {stepType === 'INPUT' && (
                    <div className="space-y-3">
                        <div>
                            <Label>Tipo de Input</Label>
                            <Select value={inputType} onValueChange={(val: any) => setInputType(val)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="text">Texto</SelectItem>
                                    <SelectItem value="number">Número</SelectItem>
                                    <SelectItem value="date">Fecha</SelectItem>
                                    <SelectItem value="time">Hora</SelectItem>
                                    <SelectItem value="email">Email</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label>Placeholder</Label>
                                <Input
                                    value={placeholder}
                                    onChange={(e) => setPlaceholder(e.target.value)}
                                    placeholder="Ej: Ingrese valor"
                                />
                            </div>
                            <div>
                                <Label>Unidad</Label>
                                <Input
                                    value={unit}
                                    onChange={(e) => setUnit(e.target.value)}
                                    placeholder="Ej: °C, mg/L"
                                />
                            </div>
                        </div>
                    </div>
                )}

                {stepType === 'IMAGE' && (
                    <div className="space-y-3">
                        <div className="flex items-center space-x-2">
                            <Checkbox
                                checked={allowMultiple}
                                onCheckedChange={(checked: boolean) => setAllowMultiple(!!checked)}
                            />
                            <Label>Permitir múltiples imágenes</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Checkbox
                                checked={requireGPS}
                                onCheckedChange={(checked: boolean) => setRequireGPS(!!checked)}
                            />
                            <Label>Requerir ubicación GPS</Label>
                        </div>
                    </div>
                )}

                {stepType === 'DOCUMENT' && (
                    <div className="space-y-3">
                        <div>
                            <Label>Formatos Aceptados</Label>
                            <Input
                                value={acceptedFormats.join(', ')}
                                onChange={(e) => setAcceptedFormats(e.target.value.split(',').map(f => f.trim()))}
                                placeholder=".pdf, .doc, .xlsx"
                            />
                        </div>
                        <div className="flex items-center space-x-2">
                            <Checkbox
                                checked={allowMultiple}
                                onCheckedChange={(checked: boolean) => setAllowMultiple(!!checked)}
                            />
                            <Label>Permitir múltiples archivos</Label>
                        </div>
                    </div>
                )}

                {stepType === 'CHECKBOX' && (
                    <div className="space-y-3">
                        <div>
                            <Label>Etiqueta del Checkbox</Label>
                            <Input
                                value={checkboxLabel}
                                onChange={(e) => setCheckboxLabel(e.target.value)}
                                placeholder="Ej: ¿Se completó la verificación?"
                            />
                        </div>
                        <div className="flex items-center space-x-2">
                            <Checkbox
                                checked={requiresComment}
                                onCheckedChange={(checked: boolean) => setRequiresComment(!!checked)}
                            />
                            <Label>Requiere comentario</Label>
                        </div>
                    </div>
                )}

                {stepType === 'SIGNATURE' && (
                    <div>
                        <Label>Nombre del Firmante</Label>
                        <Input
                            value={signerName}
                            onChange={(e) => setSignerName(e.target.value)}
                            placeholder="Ej: Técnico de Campo"
                        />
                    </div>
                )}

                <Button
                    onClick={handleAddStep}
                    className="w-full"
                    disabled={!title.trim()}
                >
                    <Plus className="h-4 w-4 mr-2" />
                    Agregar Paso
                </Button>
            </CardContent>
        </Card>
    );
};
