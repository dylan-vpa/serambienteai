import { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuCheckboxItem,
    DropdownMenuTrigger,
    DropdownMenuLabel
} from '@/components/ui/dropdown-menu';
import { Calendar, Clock, Users, Pencil, Check, X, ChevronDown } from 'lucide-react';

interface ServiceSchedule {
    name: string;
    date: string;
    time: string;
    engineerIds: string[];
    confirmed: boolean;
}

interface Engineer {
    id: string;
    name: string;
}

interface ServiceScheduleCardProps {
    serviceId: string;
    schedule: ServiceSchedule;
    engineers: Engineer[];
    onUpdate: (serviceId: string, schedule: ServiceSchedule) => void;
}

export function ServiceScheduleCard({ serviceId, schedule, engineers, onUpdate }: ServiceScheduleCardProps) {
    const [isEditing, setIsEditing] = useState(!schedule.confirmed);
    const [localSchedule, setLocalSchedule] = useState<ServiceSchedule>(schedule);

    const handleConfirm = () => {
        onUpdate(serviceId, { ...localSchedule, confirmed: true });
        setIsEditing(false);
    };

    const handleEdit = () => {
        setIsEditing(true);
    };

    const handleCancel = () => {
        setLocalSchedule(schedule);
        setIsEditing(false);
    };

    const toggleEngineer = (engineerId: string) => {
        const newEngineers = localSchedule.engineerIds.includes(engineerId)
            ? localSchedule.engineerIds.filter(id => id !== engineerId)
            : [...localSchedule.engineerIds, engineerId];

        setLocalSchedule({ ...localSchedule, engineerIds: newEngineers });
    };

    const selectedEngineers = engineers.filter(e => localSchedule.engineerIds.includes(e.id));
    const isConfirmed = schedule.confirmed && !isEditing;

    return (
        <Card className={`transition-all ${isConfirmed
            ? 'border-green-300 bg-gradient-to-r from-green-50 to-emerald-50'
            : 'border-slate-200 hover:border-indigo-300'
            }`}>
            <CardHeader>
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                            <span className="text-indigo-700 font-bold text-sm">
                                {schedule.name.substring(0, 2).toUpperCase()}
                            </span>
                        </div>
                        <div>
                            <h4 className="font-semibold text-slate-900">{schedule.name}</h4>
                            {isConfirmed && (
                                <Badge variant="secondary" className="mt-1 bg-green-100 text-green-700">
                                    <Check className="h-3 w-3 mr-1" />
                                    Confirmado
                                </Badge>
                            )}
                        </div>
                    </div>
                    {isConfirmed && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleEdit}
                            className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                        >
                            <Pencil className="h-4 w-4 mr-1" />
                            Editar
                        </Button>
                    )}
                </div>
            </CardHeader>
            <CardContent>
                {isEditing || !isConfirmed ? (
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                                <Label className="text-sm font-medium flex items-center gap-1">
                                    <Calendar className="h-3.5 w-3.5" />
                                    Fecha
                                </Label>
                                <Input
                                    type="date"
                                    value={localSchedule.date}
                                    onChange={(e) => setLocalSchedule({ ...localSchedule, date: e.target.value })}
                                    className="h-9"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-sm font-medium flex items-center gap-1">
                                    <Clock className="h-3.5 w-3.5" />
                                    Hora
                                </Label>
                                <Input
                                    type="time"
                                    value={localSchedule.time}
                                    onChange={(e) => setLocalSchedule({ ...localSchedule, time: e.target.value })}
                                    className="h-9"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-sm font-medium flex items-center gap-1">
                                <Users className="h-3.5 w-3.5" />
                                Ingenieros Asignados
                            </Label>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" className="w-full justify-between h-9">
                                        <span className="text-sm">
                                            {selectedEngineers.length > 0
                                                ? `${selectedEngineers.length} seleccionado${selectedEngineers.length > 1 ? 's' : ''}`
                                                : 'Seleccionar ingenieros'}
                                        </span>
                                        <ChevronDown className="h-4 w-4 opacity-50" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className="w-full">
                                    <DropdownMenuLabel>Seleccionar personal</DropdownMenuLabel>
                                    {engineers.map(eng => (
                                        <DropdownMenuCheckboxItem
                                            key={eng.id}
                                            checked={localSchedule.engineerIds.includes(eng.id)}
                                            onCheckedChange={() => toggleEngineer(eng.id)}
                                        >
                                            {eng.name}
                                        </DropdownMenuCheckboxItem>
                                    ))}
                                </DropdownMenuContent>
                            </DropdownMenu>

                            {selectedEngineers.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 mt-2">
                                    {selectedEngineers.map(eng => (
                                        <Badge key={eng.id} variant="secondary" className="text-xs">
                                            {eng.name}
                                            <button
                                                onClick={() => toggleEngineer(eng.id)}
                                                className="ml-1 hover:bg-slate-300 rounded-full p-0.5"
                                            >
                                                <X className="h-3 w-3" />
                                            </button>
                                        </Badge>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="flex gap-2 pt-2">
                            <Button
                                onClick={handleConfirm}
                                disabled={!localSchedule.date || !localSchedule.time || localSchedule.engineerIds.length === 0}
                                className="flex-1 bg-indigo-600 hover:bg-indigo-700"
                            >
                                <Check className="h-4 w-4 mr-1" />
                                {schedule.confirmed ? 'Guardar Cambios' : 'Confirmar Programación'}
                            </Button>
                            {isEditing && schedule.confirmed && (
                                <Button variant="outline" onClick={handleCancel}>
                                    <X className="h-4 w-4 mr-1" />
                                    Cancelar
                                </Button>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 text-sm text-slate-700">
                            <Calendar className="h-4 w-4 text-green-600" />
                            <span className="font-medium">
                                {new Date(localSchedule.date).toLocaleDateString('es-ES', {
                                    weekday: 'long',
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                })}
                            </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-700">
                            <Clock className="h-4 w-4 text-green-600" />
                            <span className="font-medium">{localSchedule.time}</span>
                        </div>
                        <div>
                            <div className="flex items-center gap-2 text-sm text-slate-700 mb-2">
                                <Users className="h-4 w-4 text-green-600" />
                                <span className="font-medium">Personal asignado:</span>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                                {selectedEngineers.map(eng => (
                                    <Badge
                                        key={eng.id}
                                        variant="secondary"
                                        className="bg-green-100 text-green-700"
                                    >
                                        {eng.name}
                                    </Badge>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
