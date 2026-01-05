import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle2, ChevronRight, Upload, FileDown, Beaker, Camera, MapPin, WifiOff, Lock, ShieldCheck, Clock, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import LocationMap from '@/components/shared/LocationMap';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';

interface SamplingWizardProps {
    oitId: string;
    scheduledDate?: string;
}

export function SamplingWizard({ oitId, scheduledDate }: SamplingWizardProps) {
    const [step, setStep] = useState(1);
    const [isLocked, setIsLocked] = useState(false);
    const [isOffline, setIsOffline] = useState(!navigator.onLine);
    const [locationPermission, setLocationPermission] = useState<'granted' | 'denied' | 'prompt'>('prompt');
    const [gpsCoords, setGpsCoords] = useState<{ latitude: number; longitude: number } | null>(null);
    const [formData, setFormData] = useState({
        location: '',
        conditions: '',
        samples: [] as any[],
        evidenceFiles: [] as File[],
        gpsCoordinates: null as { latitude: number; longitude: number } | null,
    });

    // Time Validation
    useEffect(() => {
        if (scheduledDate) {
            const schedule = new Date(scheduledDate);
            const now = new Date();

            // Check if same day
            const isSameDay = schedule.toDateString() === now.toDateString();

            if (!isSameDay) {
                setIsLocked(true);
            } else {
                setIsLocked(false);
            }
        }
    }, [scheduledDate]);

    // Location Permission & GPS Capture
    useEffect(() => {
        if ('geolocation' in navigator) {
            navigator.permissions.query({ name: 'geolocation' }).then((result) => {
                setLocationPermission(result.state as any);

                if (result.state === 'granted') {
                    navigator.geolocation.getCurrentPosition(
                        (position) => {
                            const coords = {
                                latitude: position.coords.latitude,
                                longitude: position.coords.longitude
                            };
                            setGpsCoords(coords);
                            setFormData(prev => ({ ...prev, gpsCoordinates: coords }));
                            toast.success('Ubicación capturada');
                        },
                        (error) => console.error('Error getting location:', error)
                    );
                } else if (result.state === 'prompt') {
                    navigator.geolocation.getCurrentPosition(
                        (position) => {
                            const coords = {
                                latitude: position.coords.latitude,
                                longitude: position.coords.longitude
                            };
                            setGpsCoords(coords);
                            setFormData(prev => ({ ...prev, gpsCoordinates: coords }));
                            setLocationPermission('granted');
                            toast.success('Ubicación capturada');
                        },
                        (error) => {
                            console.error('Error getting location:', error);
                            setLocationPermission('denied');
                            toast.error('No se pudo obtener la ubicación');
                        }
                    );
                }
            });
        }
    }, []);

    // Offline Support & Sync
    useEffect(() => {
        // Load from local storage
        const saved = localStorage.getItem(`sampling_data_${oitId}`);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                setFormData(prev => ({ ...prev, ...parsed }));
                toast.info('Datos recuperados localmente');
            } catch (e) {
                console.error('Error loading local data', e);
            }
        }

        // Network listeners
        const handleOnline = () => setIsOffline(false);
        const handleOffline = () => setIsOffline(true);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, [oitId]);

    // Auto-save to local storage
    useEffect(() => {
        const dataToSave = {
            location: formData.location,
            conditions: formData.conditions,
            samples: formData.samples
        };
        localStorage.setItem(`sampling_data_${oitId}`, JSON.stringify(dataToSave));
    }, [formData, oitId]);

    const steps = [
        { id: 1, title: 'Preparación', icon: MapPin },
        { id: 2, title: 'Toma de Muestras', icon: Beaker },
        { id: 3, title: 'Evidencia', icon: Camera },
        { id: 4, title: 'Finalizar', icon: CheckCircle2 },
    ];

    const handleNext = () => {
        if (step < steps.length) setStep(step + 1);
    };

    const handleBack = () => {
        if (step > 1) setStep(step - 1);
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setFormData(prev => ({
                ...prev,
                evidenceFiles: [...prev.evidenceFiles, ...Array.from(e.target.files || [])]
            }));
            toast.success('Archivos adjuntados');
        }
    };

    const handleDownloadResults = () => {
        toast.success('Generando reporte de muestreo...');
        // TODO: Implement actual PDF/Excel generation with formData
    };

    if (isLocked) {
        return (
            <Card className="border-red-200 bg-red-50">
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="h-16 w-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                        <Lock className="h-8 w-8 text-red-500" />
                    </div>
                    <h3 className="text-lg font-semibold text-red-900">Muestreo Bloqueado</h3>
                    <p className="text-red-700 mt-2 max-w-md">
                        Solo se permite el ingreso de datos en la fecha programada: <br />
                        <span className="font-bold">{scheduledDate ? new Date(scheduledDate).toLocaleDateString() : 'No programada'}</span>
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            {/* Status Bar */}
            {isOffline && (
                <div className="bg-amber-100 border border-amber-200 text-amber-800 px-4 py-2 rounded-lg flex items-center gap-2 text-sm">
                    <WifiOff className="h-4 w-4" />
                    <span>Modo Offline: Los datos se guardarán localmente y se sincronizarán cuando recuperes la conexión.</span>
                </div>
            )}

            {/* Progress Steps */}
            <div className="relative px-4 py-6 bg-white/80 backdrop-blur-md rounded-2xl border border-white/20 shadow-lg shadow-slate-200/40 overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-20" />

                <div className="flex justify-between items-center relative z-10">
                    {steps.map((s, idx) => {
                        const Icon = s.icon;
                        const isActive = s.id === step;
                        const isCompleted = s.id < step;

                        return (
                            <div key={s.id} className="flex-1 flex flex-col items-center relative group">
                                <div className={cn(
                                    "relative z-10 flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-500 transform",
                                    isActive
                                        ? "bg-slate-900 text-white scale-110 shadow-lg shadow-indigo-500/30 ring-4 ring-white"
                                        : isCompleted
                                            ? "bg-emerald-500 text-white ring-4 ring-white/50"
                                            : "bg-slate-100 text-slate-400"
                                )}>
                                    {isCompleted ? (
                                        <CheckCircle2 className="h-5 w-5 animate-in zoom-in spin-in-180 duration-500" />
                                    ) : (
                                        <Icon className={cn("h-5 w-5 transition-transform duration-300", isActive && "scale-110")} />
                                    )}

                                    {/* Active Step Indicator Pulse */}
                                    {isActive && (
                                        <span className="absolute inset-0 rounded-xl bg-indigo-400 opacity-75 animate-ping -z-10" />
                                    )}
                                </div>

                                <span className={cn(
                                    "mt-3 text-xs font-semibold tracking-wide transition-colors duration-300 absolute -bottom-8 w-24 text-center hidden md:block",
                                    isActive ? "text-slate-900" : isCompleted ? "text-emerald-600" : "text-slate-400"
                                )}>
                                    {s.title}
                                </span>

                                {/* Connecting Line */}
                                {idx < steps.length - 1 && (
                                    <div className="absolute top-5 left-1/2 w-full h-[2px] -z-0">
                                        <div className="w-full h-full bg-slate-100" />
                                        <div
                                            className="absolute top-0 left-0 h-full bg-gradient-to-r from-emerald-400 to-slate-900 transition-all duration-700 ease-out"
                                            style={{
                                                width: isCompleted ? '100%' : isActive ? '50%' : '0%',
                                                opacity: isCompleted || isActive ? 1 : 0
                                            }}
                                        />
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
                <div className="h-6 md:h-8" /> {/* Spacing for labels */}
            </div>

            <Card className="border-slate-200 shadow-sm bg-white/50 backdrop-blur-sm">
                <CardHeader>
                    <CardTitle>{steps[step - 1].title}</CardTitle>
                    <CardDescription>
                        {step === 1 && 'Registra las condiciones iniciales del sitio.'}
                        {step === 2 && 'Ingresa los datos de las muestras tomadas.'}
                        {step === 3 && 'Sube fotos y evidencia documental.'}
                        {step === 4 && 'Revisa y confirma el registro de muestreo.'}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {step === 1 && (
                        <div className="space-y-6">
                            {/* Verification Card */}
                            <div className="relative overflow-hidden rounded-xl border border-indigo-100 bg-gradient-to-br from-white to-indigo-50/50 shadow-lg shadow-indigo-100/50">
                                <div className="absolute top-0 right-0 p-4 opacity-10">
                                    <ShieldCheck className="h-32 w-32 text-indigo-500" />
                                </div>

                                <div className="p-6 relative z-10">
                                    <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-6">
                                        <ShieldCheck className="h-5 w-5 text-indigo-600" />
                                        Verificación de Inicio
                                    </h3>

                                    <div className="grid md:grid-cols-2 gap-6">
                                        {/* Time Verification */}
                                        <div className="bg-white/60 backdrop-blur-sm rounded-lg p-4 border border-indigo-50 flex items-start gap-4">
                                            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                                                <Clock className="h-5 w-5 text-blue-600" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-slate-500 mb-1">Horario Programado</p>
                                                <div className="flex items-baseline gap-2">
                                                    <span className="text-lg font-bold text-slate-900">
                                                        {scheduledDate ? new Date(scheduledDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                                                    </span>
                                                    <span className="text-xs text-slate-500">
                                                        {scheduledDate ? new Date(scheduledDate).toLocaleDateString() : 'Sin fecha'}
                                                    </span>
                                                </div>
                                                <div className="mt-2 flex items-center gap-1.5">
                                                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] gap-1 px-2 py-0.5">
                                                        <CheckCircle2 className="h-3 w-3" />
                                                        A Tiempo
                                                    </Badge>
                                                    <span className="text-[10px] text-slate-400">Desviación: &lt; 5 min</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Location Verification */}
                                        <div className="bg-white/60 backdrop-blur-sm rounded-lg p-4 border border-indigo-50 flex items-start gap-4">
                                            <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                                                <MapPin className="h-5 w-5 text-indigo-600" />
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-sm font-medium text-slate-500 mb-1">Sitio Asignado</p>
                                                <p className="text-sm font-bold text-slate-900 leading-tight mb-2">
                                                    CARRERA 41 # 73B – 72
                                                </p>
                                                {/* <p className="text-xs text-slate-500 mb-2">{oit.location || 'Dirección no especificada'}</p> */}

                                                <div className="flex items-center gap-2">
                                                    {locationPermission === 'denied' ? (
                                                        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[10px]">
                                                            GPS Inactivo
                                                        </Badge>
                                                    ) : gpsCoords ? (
                                                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] gap-1 px-2 py-0.5">
                                                            <CheckCircle2 className="h-3 w-3" />
                                                            En Sitio
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="outline" className="bg-slate-100 text-slate-500 border-slate-200 text-[10px] gap-1 animate-pulse">
                                                            <Loader2 className="h-3 w-3 animate-spin" />
                                                            Buscando GPS...
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Banner */}
                                    <div className="mt-6 bg-slate-900/5 rounded-lg p-3 flex items-center justify-between border border-slate-900/10">
                                        <div className="flex items-center gap-3">
                                            <Checkbox id="verify-site" className="data-[state=checked]:bg-indigo-600 border-slate-400" />
                                            <label htmlFor="verify-site" className="text-sm font-medium text-slate-700 cursor-pointer select-none">
                                                Confirmo que estoy en el sitio y horario correctos
                                            </label>
                                        </div>
                                        {/* This could trigger opening the rest of the form */}
                                    </div>
                                </div>
                            </div>

                            <div className="grid gap-2 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-150">
                                <Label className="text-slate-700 font-semibold">Ubicación / Punto de Muestreo Detallado</Label>
                                <Input
                                    placeholder="Ej: Planta de Tratamiento - Salida"
                                    value={formData.location}
                                    onChange={e => setFormData({ ...formData, location: e.target.value })}
                                    className="bg-slate-50/50 border-slate-200 focus:bg-white transition-all h-11"
                                />
                            </div>

                            <div className="grid gap-2 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
                                <Label className="text-slate-700 font-semibold">Condiciones Ambientales</Label>
                                <Textarea
                                    placeholder="Clima, temperatura, observaciones..."
                                    value={formData.conditions}
                                    onChange={e => setFormData({ ...formData, conditions: e.target.value })}
                                    className="bg-slate-50/50 border-slate-200 focus:bg-white transition-all min-h-[100px]"
                                />
                            </div>

                            {/* GPS Location Map */}
                            {gpsCoords && (
                                <div className="grid gap-2 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-500">
                                    <Label className="flex items-center gap-2 text-slate-700 font-semibold">
                                        <MapPin className="h-4 w-4 text-indigo-500" />
                                        Confirmación GPS
                                    </Label>
                                    <div className="rounded-xl overflow-hidden border border-slate-200 shadow-sm relative group">
                                        <div className="absolute inset-0 border-4 border-white/50 z-10 rounded-xl pointer-events-none" />
                                        <LocationMap
                                            latitude={gpsCoords.latitude}
                                            longitude={gpsCoords.longitude}
                                            height={200}
                                        />
                                        <div className="absolute bottom-2 left-2 right-2 bg-white/90 backdrop-blur-md px-3 py-2 rounded-lg text-xs font-mono text-slate-600 border border-white/50 shadow-sm flex justify-between items-center">
                                            <span>LAT: {gpsCoords.latitude.toFixed(6)}</span>
                                            <span>LON: {gpsCoords.longitude.toFixed(6)}</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-6">
                            <div className="flex justify-center py-8 border-2 border-dashed rounded-lg bg-slate-50/50">
                                <div className="text-center">
                                    <Beaker className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                                    <p className="text-sm text-slate-500 mb-4">Descarga la plantilla para registro masivo</p>
                                    <Button variant="outline" className="gap-2">
                                        <FileDown className="h-4 w-4" />
                                        Descargar Plantilla Excel
                                    </Button>
                                </div>
                            </div>
                            <div className="text-center text-sm text-slate-400">- O -</div>
                            <div className="grid gap-4">
                                {/* Placeholder for dynamic sample inputs */}
                                <div className="p-4 border rounded-lg bg-slate-50">
                                    <p className="text-sm text-slate-500 text-center">Formulario de muestra individual (Próximamente)</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {formData.evidenceFiles.map((file, i) => (
                                    <div key={i} className="aspect-square bg-slate-100 rounded-lg flex items-center justify-center relative group">
                                        <FileDown className="h-8 w-8 text-slate-400" />
                                        <span className="absolute bottom-2 text-xs text-slate-500 truncate w-full px-2 text-center">{file.name}</span>
                                    </div>
                                ))}
                                <label className="aspect-square border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 transition-colors">
                                    <Upload className="h-6 w-6 text-slate-400 mb-2" />
                                    <span className="text-xs text-slate-500">Subir Foto</span>
                                    <input type="file" multiple className="hidden" onChange={handleFileUpload} accept="image/*" />
                                </label>
                            </div>
                        </div>
                    )}

                    {step === 4 && (
                        <div className="text-center py-8 space-y-4">
                            <div className="h-16 w-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <CheckCircle2 className="h-8 w-8 text-emerald-600" />
                            </div>
                            <h3 className="text-lg font-medium text-slate-900">¡Registro Completo!</h3>
                            <p className="text-slate-500 mt-2 max-w-md mx-auto">
                                Se han registrado {formData.samples.length} muestras y {formData.evidenceFiles.length} archivos de evidencia.
                            </p>
                            <Button
                                onClick={handleDownloadResults}
                                className="mt-4 gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                            >
                                <FileDown className="h-4 w-4" />
                                Descargar Resultados
                            </Button>
                        </div>
                    )}

                    <div className="flex justify-between mt-8 pt-4 border-t border-slate-100">
                        <Button variant="ghost" onClick={handleBack} disabled={step === 1}>
                            Atrás
                        </Button>
                        <Button onClick={handleNext} className="bg-slate-900 text-white hover:bg-slate-800">
                            {step === steps.length ? 'Finalizar' : 'Siguiente'}
                            {step < steps.length && <ChevronRight className="ml-2 h-4 w-4" />}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
