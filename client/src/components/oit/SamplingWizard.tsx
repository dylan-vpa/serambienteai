import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle2, ChevronRight, Upload, FileDown, Beaker, Camera, MapPin, WifiOff, RefreshCw, Lock } from 'lucide-react';
import { toast } from 'sonner';
import LocationMap from '@/components/shared/LocationMap';

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
            <div className="flex justify-between items-center px-4 py-4 bg-slate-50/50 rounded-xl border border-slate-100">
                {steps.map((s, idx) => {
                    const Icon = s.icon;
                    const isActive = s.id === step;
                    const isCompleted = s.id < step;

                    return (
                        <div key={s.id} className="flex items-center">
                            <div className={`flex items-center gap-2 ${isActive ? 'text-slate-900' : isCompleted ? 'text-emerald-600' : 'text-slate-400'}`}>
                                <div className={`h-8 w-8 rounded-full flex items-center justify-center border-2 transition-all
                                    ${isActive ? 'border-slate-900 bg-white' : isCompleted ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 bg-slate-50'}
                                `}>
                                    {isCompleted ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                                </div>
                                <span className="text-sm font-medium hidden md:block">{s.title}</span>
                            </div>
                            {idx < steps.length - 1 && (
                                <div className={`h-[2px] w-12 mx-4 ${isCompleted ? 'bg-emerald-200' : 'bg-slate-100'}`} />
                            )}
                        </div>
                    );
                })}
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
                        <div className="space-y-4">
                            <div className="grid gap-2">
                                <Label>Ubicación / Punto de Muestreo</Label>
                                <Input
                                    placeholder="Ej: Planta de Tratamiento - Salida"
                                    value={formData.location}
                                    onChange={e => setFormData({ ...formData, location: e.target.value })}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label>Condiciones Ambientales</Label>
                                <Textarea
                                    placeholder="Clima, temperatura, observaciones..."
                                    value={formData.conditions}
                                    onChange={e => setFormData({ ...formData, conditions: e.target.value })}
                                />
                            </div>

                            {/* GPS Location Map */}
                            {gpsCoords && (
                                <div className="grid gap-2">
                                    <Label className="flex items-center gap-2">
                                        <MapPin className="h-4 w-4" />
                                        Ubicación GPS
                                    </Label>
                                    <div className="rounded-lg overflow-hidden border border-slate-200">
                                        <LocationMap
                                            latitude={gpsCoords.latitude}
                                            longitude={gpsCoords.longitude}
                                            height={250}
                                        />
                                    </div>
                                    <p className="text-xs text-slate-500">
                                        Coordenadas: {gpsCoords.latitude.toFixed(6)}, {gpsCoords.longitude.toFixed(6)}
                                    </p>
                                </div>
                            )}

                            {locationPermission === 'denied' && (
                                <div className="bg-amber-50 border border-amber-200 text-amber-800 px-3 py-2 rounded-lg text-sm">
                                    ⚠️ Permisos de ubicación denegados. Las coordenadas GPS no se registrarán.
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
