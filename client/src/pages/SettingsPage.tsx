import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/features/auth/authStore';

export default function SettingsPage() {
    const user = useAuthStore((state) => state.user);

    if (!user) {
        return (
            <div className="flex items-center justify-center h-full">
                <p className="text-slate-500">Cargando información del usuario...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold tracking-tight text-slate-900">Configuración</h2>
                <p className="text-slate-500">Gestiona tu perfil y preferencias.</p>
            </div>

            <Card className="border-slate-200 shadow-sm bg-white">
                <CardHeader>
                    <CardTitle>Perfil</CardTitle>
                    <CardDescription>Información de tu cuenta</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-2">
                        <Label htmlFor="name">Nombre</Label>
                        <Input
                            id="name"
                            value={user.name || 'Sin nombre'}
                            disabled
                            className="bg-slate-50"
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="email">Correo Electrónico</Label>
                        <Input
                            id="email"
                            value={user.email}
                            disabled
                            className="bg-slate-50"
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="role">Rol</Label>
                        <Input
                            id="role"
                            value={user.role || 'Usuario'}
                            disabled
                            className="bg-slate-50"
                        />
                    </div>
                </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm bg-white">
                <CardHeader>
                    <CardTitle>Notificaciones</CardTitle>
                    <CardDescription>Configura cómo deseas recibir notificaciones</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-medium">Notificaciones por correo</p>
                            <p className="text-sm text-slate-500">Recibe actualizaciones por email</p>
                        </div>
                        <Button variant="outline" size="sm">Configurar</Button>
                    </div>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-medium">Notificaciones push</p>
                            <p className="text-sm text-slate-500">Recibe notificaciones en el navegador</p>
                        </div>
                        <Button variant="outline" size="sm">Configurar</Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
