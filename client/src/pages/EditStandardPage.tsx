import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save, FileText, ArrowLeft } from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';

export default function EditStandardPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        type: 'OIT'
    });

    useEffect(() => {
        fetchStandard();
    }, [id]);

    const fetchStandard = async () => {
        try {
            const response = await api.get(`/standards/${id}`);
            const standard = response.data;
            setFormData({
                title: standard.title,
                description: standard.description,
                type: standard.type
            });
        } catch (error) {
            console.error('Error fetching standard:', error);
            toast.error('Error al cargar la norma');
            navigate('/standards');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.title || !formData.description) {
            toast.error('Por favor completa todos los campos requeridos');
            return;
        }

        try {
            setIsSaving(true);
            const data = new FormData();
            data.append('title', formData.title);
            data.append('description', formData.description);
            data.append('type', formData.type);
            if (selectedFile) {
                data.append('file', selectedFile);
            }

            await api.put(`/standards/${id}`, data, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            toast.success('Norma actualizada exitosamente');
            navigate('/standards');
        } catch (error) {
            console.error('Error updating standard:', error);
            toast.error('Error al actualizar norma');
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-12 w-[300px]" />
                <Skeleton className="h-[500px] w-full" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" onClick={() => navigate('/standards')}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight text-slate-900">Editar Norma</h2>
                        <p className="text-slate-500">Modifica el criterio de revisión</p>
                    </div>
                </div>
            </div>

            <form onSubmit={handleSubmit}>
                <div className="grid md:grid-cols-3 gap-6">
                    <Card className="md:col-span-2 border-slate-200 shadow-sm bg-white">
                        <CardHeader className="border-b border-slate-100">
                            <h3 className="font-semibold text-slate-900">Información de la Norma</h3>
                        </CardHeader>
                        <CardContent className="space-y-6 pt-6">
                            <div className="grid gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="title">Título *</Label>
                                    <Input
                                        id="title"
                                        placeholder="Ej: Verificación de Muestras de Agua"
                                        value={formData.title}
                                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                        required
                                    />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="type">Tipo de Documento *</Label>
                                    <Select
                                        value={formData.type}
                                        onValueChange={(value) => setFormData({ ...formData, type: value })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Selecciona el tipo" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="OIT">OIT</SelectItem>
                                            <SelectItem value="QUOTATION">Cotización</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="description">Descripción / Criterios *</Label>
                                    <Textarea
                                        id="description"
                                        placeholder="Describe los criterios que debe cumplir el documento..."
                                        className="h-40 resize-none"
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        required
                                    />
                                    <p className="text-xs text-slate-500">
                                        Especifica los requisitos, condiciones y criterios que deben cumplirse según esta norma.
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="space-y-6">
                        <Card className="border-slate-200 shadow-sm bg-white">
                            <CardHeader className="border-b border-slate-100">
                                <h3 className="font-semibold text-slate-900">Documento de Referencia</h3>
                            </CardHeader>
                            <CardContent className="pt-6">
                                <div className="space-y-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="file">Archivo PDF (Opcional)</Label>
                                        <div className="border-2 border-dashed border-slate-200 rounded-lg p-6 text-center hover:border-slate-300 transition-colors">
                                            <FileText className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                                            <Input
                                                id="file"
                                                type="file"
                                                accept=".pdf"
                                                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                                                className="cursor-pointer"
                                            />
                                            {selectedFile && (
                                                <p className="text-sm text-slate-600 mt-2">
                                                    {selectedFile.name}
                                                </p>
                                            )}
                                        </div>
                                        <p className="text-xs text-slate-500">
                                            Subir un nuevo archivo reemplazará el anterior
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border-slate-200 shadow-sm bg-white">
                            <CardContent className="pt-6">
                                <div className="space-y-3">
                                    <Button
                                        type="submit"
                                        disabled={isSaving}
                                        className="w-full bg-slate-900 hover:bg-slate-800 text-white"
                                    >
                                        <Save className="mr-2 h-4 w-4" />
                                        {isSaving ? 'Guardando...' : 'Guardar Cambios'}
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => navigate('/standards')}
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
