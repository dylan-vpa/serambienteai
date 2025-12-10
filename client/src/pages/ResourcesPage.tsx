import { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, Filter, MoreHorizontal, FileSpreadsheet, CheckCircle2 } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useResources } from '@/hooks/useResources';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import api from '@/lib/api';

export default function ResourcesPage() {
    const [searchQuery, setSearchQuery] = useState('');
    const { resources, isLoading, error } = useResources(searchQuery);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [uploadMode, setUploadMode] = useState<'manual' | 'csv'>('manual');
    const [csvFile, setCsvFile] = useState<File | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        type: '',
        quantity: 0,
        status: 'AVAILABLE'
    });

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'AVAILABLE':
                return 'bg-emerald-50 text-emerald-700 border-emerald-200';
            case 'IN_USE':
                return 'bg-amber-50 text-amber-700 border-amber-200';
            case 'MAINTENANCE':
                return 'bg-red-50 text-red-700 border-red-200';
            default:
                return 'bg-slate-50 text-slate-700 border-slate-200';
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'AVAILABLE':
                return 'Disponible';
            case 'IN_USE':
                return 'En uso';
            case 'MAINTENANCE':
                return 'Mantenimiento';
            default:
                return status;
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-slate-900">Recursos</h2>
                    <p className="text-slate-500">Gestiona tu equipo e inventario.</p>
                </div>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-slate-900 hover:bg-slate-800 text-white">
                            <Plus className="mr-2 h-4 w-4" />
                            Agregar Recurso
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[600px]">
                        <DialogHeader>
                            <DialogTitle>Agregar Recursos</DialogTitle>
                            <DialogDescription>
                                Agrega recursos individualmente o importa múltiples desde un archivo CSV.
                            </DialogDescription>
                        </DialogHeader>

                        {/* Mode Tabs */}
                        <div className="flex gap-2 p-1 bg-slate-100 rounded-lg">
                            <button
                                onClick={() => setUploadMode('manual')}
                                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${uploadMode === 'manual'
                                    ? 'bg-white text-slate-900 shadow-sm'
                                    : 'text-slate-600 hover:text-slate-900'
                                    }`}
                            >
                                Manual
                            </button>
                            <button
                                onClick={() => setUploadMode('csv')}
                                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${uploadMode === 'csv'
                                    ? 'bg-white text-slate-900 shadow-sm'
                                    : 'text-slate-600 hover:text-slate-900'
                                    }`}
                            >
                                Importar CSV
                            </button>
                        </div>

                        {uploadMode === 'manual' ? (
                            <div className="grid gap-4 py-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="name">Nombre</Label>
                                    <Input
                                        id="name"
                                        placeholder="Ej: Casco de Seguridad"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="type">Tipo</Label>
                                    <Input
                                        id="type"
                                        placeholder="Ej: Equipo de Protección"
                                        value={formData.type}
                                        onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="quantity">Cantidad</Label>
                                    <Input
                                        id="quantity"
                                        type="number"
                                        placeholder="0"
                                        value={formData.quantity}
                                        onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="status">Estado</Label>
                                    <Select
                                        value={formData.status}
                                        onValueChange={(value) => setFormData({ ...formData, status: value })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Selecciona un estado" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="AVAILABLE">Disponible</SelectItem>
                                            <SelectItem value="IN_USE">En Uso</SelectItem>
                                            <SelectItem value="MAINTENANCE">Mantenimiento</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        ) : (
                            <div className="grid gap-6 py-6">
                                {/* CSV Upload Card */}
                                <div className={`relative border-2 border-dashed rounded-lg p-8 transition-all ${csvFile
                                    ? 'border-emerald-300 bg-emerald-50'
                                    : 'border-slate-300 bg-slate-50 hover:border-slate-400 hover:bg-white'
                                    }`}>
                                    <input
                                        id="csvFile"
                                        type="file"
                                        accept=".csv"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file && file.name.endsWith('.csv')) {
                                                setCsvFile(file);
                                            } else {
                                                alert('Por favor selecciona un archivo CSV válido');
                                            }
                                        }}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                    />
                                    <div className="flex flex-col items-center text-center pointer-events-none">
                                        {csvFile ? (
                                            <>
                                                <CheckCircle2 className="h-16 w-16 text-emerald-600 mb-4" />
                                                <p className="font-semibold text-emerald-900 text-lg mb-2">
                                                    Archivo CSV Cargado
                                                </p>
                                                <p className="text-sm text-emerald-700 break-all px-4">
                                                    {csvFile.name}
                                                </p>
                                                <p className="text-xs text-emerald-600 mt-2">
                                                    {(csvFile.size / 1024).toFixed(2)} KB
                                                </p>
                                            </>
                                        ) : (
                                            <>
                                                <FileSpreadsheet className="h-16 w-16 text-slate-400 mb-4" />
                                                <p className="font-semibold text-slate-700 text-lg mb-2">
                                                    Subir Archivo CSV
                                                </p>
                                                <p className="text-sm text-slate-500 mb-4">
                                                    Click para seleccionar o arrastra aquí
                                                </p>
                                                <p className="text-xs text-slate-400">
                                                    Formato: nombre,tipo,cantidad,estado
                                                </p>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* CSV Template Download */}
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                    <div className="flex items-start gap-3">
                                        <FileSpreadsheet className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                                        <div className="flex-1">
                                            <p className="text-sm font-semibold text-blue-900 mb-1">
                                                Formato del CSV
                                            </p>
                                            <p className="text-sm text-blue-800 mb-2">
                                                El archivo debe contener las columnas: <code className="bg-blue-100 px-1 rounded">nombre</code>, <code className="bg-blue-100 px-1 rounded">tipo</code>, <code className="bg-blue-100 px-1 rounded">cantidad</code>, <code className="bg-blue-100 px-1 rounded">estado</code>
                                            </p>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="text-blue-700 border-blue-300 hover:bg-blue-100"
                                                onClick={() => {
                                                    const csvContent = "nombre,tipo,cantidad,estado\nCasco de Seguridad,Equipo de Protección,50,AVAILABLE\nGuantes,Equipo de Protección,100,AVAILABLE";
                                                    const blob = new Blob([csvContent], { type: 'text/csv' });
                                                    const url = window.URL.createObjectURL(blob);
                                                    const a = document.createElement('a');
                                                    a.href = url;
                                                    a.download = 'plantilla_recursos.csv';
                                                    a.click();
                                                }}
                                            >
                                                Descargar Plantilla
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                    setIsDialogOpen(false);
                                    setCsvFile(null);
                                    setUploadMode('manual');
                                }}
                            >
                                Cancelar
                            </Button>
                            {uploadMode === 'manual' ? (
                                <Button
                                    type="submit"
                                    onClick={async () => {
                                        try {
                                            setIsCreating(true);
                                            await api.post('/resources', formData);
                                            setIsDialogOpen(false);
                                            setFormData({ name: '', type: '', quantity: 0, status: 'AVAILABLE' });
                                            window.location.reload();
                                        } catch (error) {
                                            console.error('Error creating resource:', error);
                                            alert('Error al crear recurso');
                                        } finally {
                                            setIsCreating(false);
                                        }
                                    }}
                                    disabled={isCreating || !formData.name || !formData.type}
                                    className="bg-slate-900 hover:bg-slate-800"
                                >
                                    {isCreating ? 'Creando...' : 'Crear Recurso'}
                                </Button>
                            ) : (
                                <Button
                                    onClick={async () => {
                                        if (!csvFile) {
                                            alert('Por favor selecciona un archivo CSV');
                                            return;
                                        }
                                        try {
                                            setIsCreating(true);
                                            const uploadFormData = new FormData();
                                            uploadFormData.append('csvFile', csvFile);
                                            await api.post('/resources/bulk-upload', uploadFormData, {
                                                headers: { 'Content-Type': 'multipart/form-data' }
                                            });
                                            setIsDialogOpen(false);
                                            setCsvFile(null);
                                            window.location.reload();
                                        } catch (error) {
                                            console.error('Error uploading CSV:', error);
                                            alert('Error al importar recursos desde CSV');
                                        } finally {
                                            setIsCreating(false);
                                        }
                                    }}
                                    disabled={isCreating || !csvFile}
                                    className="bg-slate-900 hover:bg-slate-800"
                                >
                                    {isCreating ? 'Importando...' : 'Importar Recursos'}
                                </Button>
                            )}
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <Card className="border-slate-200 shadow-sm bg-white">
                <CardHeader className="border-b border-slate-100 pb-4">
                    <div className="flex items-center justify-between">
                        <div className="relative w-72">
                            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <Input
                                placeholder="Buscar recursos..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 bg-slate-50 border-slate-200 focus:bg-white transition-colors"
                            />
                        </div>
                        <Button variant="outline" size="sm" className="text-slate-600 border-slate-200">
                            <Filter className="mr-2 h-3.5 w-3.5" />
                            Filtrar
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50/50 text-slate-500 font-medium">
                                <tr>
                                    <th className="py-3 px-4">Nombre</th>
                                    <th className="py-3 px-4">Tipo</th>
                                    <th className="py-3 px-4">Cantidad</th>
                                    <th className="py-3 px-4">Estado</th>
                                    <th className="py-3 px-4 text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {isLoading ? (
                                    [...Array(3)].map((_, i) => (
                                        <tr key={i}>
                                            <td className="py-3 px-4"><Skeleton className="h-4 w-[150px]" /></td>
                                            <td className="py-3 px-4"><Skeleton className="h-4 w-[100px]" /></td>
                                            <td className="py-3 px-4"><Skeleton className="h-4 w-[50px]" /></td>
                                            <td className="py-3 px-4"><Skeleton className="h-6 w-[80px]" /></td>
                                            <td className="py-3 px-4 text-right"><Skeleton className="h-8 w-8 ml-auto" /></td>
                                        </tr>
                                    ))
                                ) : error ? (
                                    <tr>
                                        <td colSpan={5} className="text-center py-12 text-red-600">
                                            {error}
                                        </td>
                                    </tr>
                                ) : resources.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="text-center py-12 text-slate-500">
                                            No se encontraron recursos
                                        </td>
                                    </tr>
                                ) : (
                                    resources.map((resource) => (
                                        <tr key={resource.id} className="hover:bg-slate-50/50 transition-colors group">
                                            <td className="py-3 px-4 font-medium text-slate-900">{resource.name}</td>
                                            <td className="py-3 px-4 text-slate-500">{resource.type}</td>
                                            <td className="py-3 px-4 text-slate-500 font-mono">{resource.quantity}</td>
                                            <td className="py-3 px-4">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${getStatusColor(resource.status)}`}>
                                                    {getStatusLabel(resource.status)}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" className="h-8 w-8 p-0 text-slate-400 hover:text-slate-900">
                                                            <span className="sr-only">Abrir menú</span>
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                                                        <DropdownMenuItem>Editar recurso</DropdownMenuItem>
                                                        <DropdownMenuItem>Ver detalles</DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem className="text-red-600">Eliminar recurso</DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div >
    );
}
