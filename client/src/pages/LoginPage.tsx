import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '@/features/auth/authStore';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import type { AuthResponse } from '@/types/auth';
import { Sparkles, ArrowRight, Loader2 } from 'lucide-react';

const formSchema = z.object({
    email: z.string().email({
        message: 'Por favor ingresa un correo electrónico válido.',
    }),
    password: z.string().min(6, {
        message: 'La contraseña debe tener al menos 6 caracteres.',
    }),
});

export default function LoginPage() {
    const navigate = useNavigate();
    const login = useAuthStore((state) => state.login);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            email: '',
            password: '',
        },
    });

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setIsLoading(true);
        setError(null);
        try {
            const response = await api.post<AuthResponse>('/auth/login', values);
            login(response.data.token, response.data.user);
            navigate('/');
        } catch (err: any) {
            setError(err.response?.data?.message || 'Error al iniciar sesión');
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className="flex min-h-screen items-center justify-center p-4 bg-slate-50">
            <Card className="w-full max-w-[400px] shadow-none border-slate-200">
                <CardHeader className="space-y-1 text-center pb-8">
                    <div className="flex justify-center mb-4">
                        <div className="h-10 w-10 rounded-lg bg-slate-900 flex items-center justify-center">
                            <Sparkles className="h-5 w-5 text-white" />
                        </div>
                    </div>
                    <CardTitle className="text-xl font-semibold text-slate-900">
                        Bienvenido de nuevo
                    </CardTitle>
                    <CardDescription className="text-slate-500">
                        Ingresa tus credenciales para acceder a tu cuenta
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            <FormField
                                control={form.control}
                                name="email"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-slate-700">Correo Electrónico</FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="nombre@ejemplo.com"
                                                {...field}
                                                className="bg-white border-slate-200 focus:border-slate-400 focus:ring-0"
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="password"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-slate-700">Contraseña</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="password"
                                                placeholder="••••••••"
                                                {...field}
                                                className="bg-white border-slate-200 focus:border-slate-400 focus:ring-0"
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            {error && (
                                <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">
                                    {error}
                                </div>
                            )}
                            <Button
                                type="submit"
                                className="w-full bg-slate-900 hover:bg-slate-800 text-white"
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <span className="flex items-center justify-center gap-2">
                                        Iniciar Sesión
                                        <ArrowRight className="h-4 w-4" />
                                    </span>
                                )}
                            </Button>
                        </form>
                    </Form>
                </CardContent>
                <CardFooter className="justify-center border-t border-slate-100 pt-6">
                    <p className="text-sm text-slate-500">
                        ¿No tienes una cuenta?{' '}
                        <Link to="/register" className="text-slate-900 hover:underline font-medium">
                            Regístrate
                        </Link>
                    </p>
                </CardFooter>
            </Card>
        </div>
    );
}
