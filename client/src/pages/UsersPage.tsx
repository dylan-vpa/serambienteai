import { useState, useEffect } from 'react';
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Users, Shield, Loader2, UserCog, Plus, UserPlus, Key } from 'lucide-react';
import api from '@/lib/api';
import { useAuthStore } from '@/features/auth/authStore';
import { canManageUsers } from '@/types/auth';
import type { UserRole } from '@/types/auth';

interface UserData {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    createdAt: string;
}

const ROLE_LABELS: Record<UserRole, string> = {
    'SUPER_ADMIN': 'Super Administrador',
    'ADMIN': 'Administrador',
    'ENGINEER': 'Ingeniero de Campo',
    'USER': 'Usuario'
};

const ROLE_COLORS: Record<UserRole, string> = {
    'SUPER_ADMIN': 'bg-purple-100 text-purple-800 border-purple-200',
    'ADMIN': 'bg-blue-100 text-blue-800 border-blue-200',
    'ENGINEER': 'bg-green-100 text-green-800 border-green-200',
    'USER': 'bg-gray-100 text-gray-800 border-gray-200'
};

export default function UsersPage() {
    const [users, setUsers] = useState<UserData[]>([]);
    const [loading, setLoading] = useState(true);
    const [updatingId, setUpdatingId] = useState<string | null>(null);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isCreating, setIsCreating] = useState(false);

    // Password change state
    const [isPasswordOpen, setIsPasswordOpen] = useState(false);
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isChangingPassword, setIsChangingPassword] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        role: 'USER' as UserRole
    });

    const currentUser = useAuthStore((state: any) => state.user);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const response = await api.get('/users');
            setUsers(response.data);
        } catch (error: any) {
            console.error('Error fetching users:', error);
            if (error.response?.status === 403) {
                toast.error('No tienes permisos para ver esta página');
            } else {
                toast.error('Error al cargar usuarios');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleRoleChange = async (userId: string, newRole: UserRole) => {
        if (userId === currentUser?.id) {
            toast.error('No puedes cambiar tu propio rol');
            return;
        }

        setUpdatingId(userId);
        try {
            await api.put(`/users/${userId}/role`, { role: newRole });
            setUsers(users.map((u: UserData) => u.id === userId ? { ...u, role: newRole } : u));
            toast.success('Rol actualizado correctamente');
        } catch (error: any) {
            console.error('Error updating role:', error);
            toast.error(error.response?.data?.error || 'Error al actualizar rol');
        } finally {
            setUpdatingId(null);
        }
    };

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.email || !formData.password || !formData.name) {
            toast.error('Todos los campos son obligatorios');
            return;
        }

        setIsCreating(true);
        try {
            const response = await api.post('/users', formData);
            setUsers([response.data, ...users]);
            setIsCreateOpen(false);
            setFormData({
                name: '',
                email: '',
                password: '',
                role: 'USER'
            });
            toast.success('Usuario creado exitosamente');
        } catch (error: any) {
            console.error('Error creating user:', error);
            toast.error(error.response?.data?.error || 'Error al crear usuario');
        } finally {
            setIsCreating(false);
        }
    };

    const openPasswordModal = (userId: string) => {
        setSelectedUserId(userId);
        setNewPassword('');
        setConfirmPassword('');
        setIsPasswordOpen(true);
    };

    const handlePasswordChange = async () => {
        if (!newPassword || newPassword.length < 6) {
            toast.error('La contraseña debe tener al menos 6 caracteres');
            return;
        }
        if (newPassword !== confirmPassword) {
            toast.error('Las contraseñas no coinciden');
            return;
        }

        setIsChangingPassword(true);
        try {
            await api.put(`/users/${selectedUserId}/password`, { newPassword });
            toast.success('Contraseña actualizada correctamente');
            setIsPasswordOpen(false);
        } catch (error: any) {
            console.error('Error changing password:', error);
            toast.error(error.response?.data?.error || 'Error al cambiar contraseña');
        } finally {
            setIsChangingPassword(false);
        }
    };

    // Check permissions
    if (currentUser && !canManageUsers(currentUser.role)) {
        return (
            <div className="p-6">
                <Card className="border-red-200 bg-red-50">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3 text-red-700">
                            <Shield className="h-5 w-5" />
                            <p>No tienes permisos para acceder a esta página.</p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                        <Users className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">Gestión de Usuarios</h1>
                        <p className="text-sm text-slate-500">Administra los roles y permisos de los usuarios</p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <Badge className="bg-purple-100 text-purple-800 border border-purple-200">
                        {users.length} usuarios
                    </Badge>

                    <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                        <DialogTrigger asChild>
                            <Button className="bg-slate-900 hover:bg-slate-800 text-white">
                                <UserPlus className="mr-2 h-4 w-4" />
                                Crear Usuario
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px]">
                            <DialogHeader>
                                <DialogTitle>Crear Nuevo Usuario</DialogTitle>
                                <DialogDescription>
                                    Crea una cuenta para un nuevo miembro del equipo.
                                </DialogDescription>
                            </DialogHeader>
                            <form onSubmit={handleCreateUser} className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Nombre Completo</Label>
                                    <Input
                                        id="name"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="Juan Pérez"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="email">Correo Electrónico</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        placeholder="juan@ejemplo.com"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="password">Contraseña</Label>
                                    <Input
                                        id="password"
                                        type="password"
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        placeholder="••••••••"
                                        required
                                        minLength={6}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="role">Rol Inicial</Label>
                                    <Select
                                        value={formData.role}
                                        onValueChange={(value) => setFormData({ ...formData, role: value as UserRole })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Selecciona un rol" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="SUPER_ADMIN">Super Administrador</SelectItem>
                                            <SelectItem value="ADMIN">Administrador</SelectItem>
                                            <SelectItem value="ENGINEER">Ingeniero de Campo</SelectItem>
                                            <SelectItem value="USER">Usuario</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <DialogFooter className="pt-4">
                                    <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                                        Cancelar
                                    </Button>
                                    <Button type="submit" disabled={isCreating}>
                                        {isCreating ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Creando...
                                            </>
                                        ) : (
                                            <>
                                                <Plus className="mr-2 h-4 w-4" />
                                                Crear Usuario
                                            </>
                                        )}
                                    </Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            <Card className="border-slate-200 shadow-sm">
                <CardHeader className="border-b border-slate-100 pb-4">
                    <CardTitle className="text-lg font-medium text-slate-900">Usuarios del Sistema</CardTitle>
                    <CardDescription>Cambia los roles de los usuarios para controlar sus permisos</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    <table className="w-full">
                        <thead className="bg-slate-50 border-b border-slate-100">
                            <tr>
                                <th className="text-left p-4 text-xs font-medium text-slate-500 uppercase tracking-wider">Usuario</th>
                                <th className="text-left p-4 text-xs font-medium text-slate-500 uppercase tracking-wider">Email</th>
                                <th className="text-left p-4 text-xs font-medium text-slate-500 uppercase tracking-wider">Rol Actual</th>
                                <th className="text-left p-4 text-xs font-medium text-slate-500 uppercase tracking-wider">Cambiar Rol</th>
                                <th className="text-left p-4 text-xs font-medium text-slate-500 uppercase tracking-wider">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {users.map((user) => (
                                <tr key={user.id} className="hover:bg-slate-50/50">
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            <div className="h-9 w-9 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-medium text-sm">
                                                {user.name?.charAt(0).toUpperCase() || user.email.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-slate-900">{user.name}</p>
                                                {user.id === currentUser?.id && (
                                                    <span className="text-xs text-slate-400">(Tú)</span>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4 text-sm text-slate-600">{user.email}</td>
                                    <td className="p-4">
                                        <Badge className={`${ROLE_COLORS[user.role]} border`}>
                                            {ROLE_LABELS[user.role]}
                                        </Badge>
                                    </td>
                                    <td className="p-4">
                                        {user.id === currentUser?.id ? (
                                            <span className="text-xs text-slate-400 italic">No disponible</span>
                                        ) : (
                                            <Select
                                                value={user.role}
                                                onValueChange={(value) => handleRoleChange(user.id, value as UserRole)}
                                                disabled={updatingId === user.id}
                                            >
                                                <SelectTrigger className="w-[180px] h-8 text-sm">
                                                    {updatingId === user.id ? (
                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                    ) : (
                                                        <SelectValue />
                                                    )}
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="SUPER_ADMIN">Super Administrador</SelectItem>
                                                    <SelectItem value="ADMIN">Administrador</SelectItem>
                                                    <SelectItem value="ENGINEER">Ingeniero de Campo</SelectItem>
                                                    <SelectItem value="USER">Usuario</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        )}
                                    </td>
                                    <td className="p-4">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => openPasswordModal(user.id)}
                                            className="text-slate-500 hover:text-amber-600 hover:bg-amber-50"
                                        >
                                            <Key className="h-4 w-4 mr-1" />
                                            Cambiar Clave
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </CardContent>
            </Card>

            {/* Role Descriptions Card */}
            <Card className="border-slate-200 shadow-sm">
                <CardHeader className="pb-3">
                    <CardTitle className="text-base font-medium text-slate-900 flex items-center gap-2">
                        <UserCog className="h-4 w-4" />
                        Descripción de Roles
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-3 rounded-lg bg-purple-50 border border-purple-100">
                            <h4 className="text-sm font-medium text-purple-900">Super Administrador</h4>
                            <p className="text-xs text-purple-700 mt-1">Acceso completo. Puede gestionar todos los usuarios y cambiar roles.</p>
                        </div>
                        <div className="p-3 rounded-lg bg-blue-50 border border-blue-100">
                            <h4 className="text-sm font-medium text-blue-900">Administrador</h4>
                            <p className="text-xs text-blue-700 mt-1">Gestiona OITs, asigna ingenieros y genera reportes.</p>
                        </div>
                        <div className="p-3 rounded-lg bg-green-50 border border-green-100">
                            <h4 className="text-sm font-medium text-green-900">Ingeniero de Campo</h4>
                            <p className="text-xs text-green-700 mt-1">Ve solo OITs asignadas. Realiza muestreo y captura datos.</p>
                        </div>
                        <div className="p-3 rounded-lg bg-gray-50 border border-gray-100">
                            <h4 className="text-sm font-medium text-gray-900">Usuario</h4>
                            <p className="text-xs text-gray-700 mt-1">Acceso de solo lectura. Ve dashboard y estadísticas básicas.</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Password Change Modal */}
            <Dialog open={isPasswordOpen} onOpenChange={setIsPasswordOpen}>
                <DialogContent className="sm:max-w-[400px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Key className="h-5 w-5 text-amber-600" />
                            Cambiar Contraseña
                        </DialogTitle>
                        <DialogDescription>
                            Ingresa una nueva contraseña para este usuario.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="newPassword">Nueva Contraseña</Label>
                            <Input
                                id="newPassword"
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="••••••••"
                                minLength={6}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="confirmPassword">Confirmar Contraseña</Label>
                            <Input
                                id="confirmPassword"
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="••••••••"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsPasswordOpen(false)}>
                            Cancelar
                        </Button>
                        <Button
                            onClick={handlePasswordChange}
                            disabled={isChangingPassword}
                            className="bg-amber-600 hover:bg-amber-700 text-white"
                        >
                            {isChangingPassword ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Cambiando...
                                </>
                            ) : (
                                <>
                                    <Key className="mr-2 h-4 w-4" />
                                    Cambiar Contraseña
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

