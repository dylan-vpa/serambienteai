import { useState, useRef, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Send, Loader2, Bot, User, Sparkles, Database, FileText, Beaker, AlertTriangle } from 'lucide-react';
import api from '@/lib/api';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
}

interface SystemContext {
    oitsCount: number;
    resourcesCount: number;
    standardsCount: number;
    pendingOits: number;
}

export default function AIAssistantPage() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [context, setContext] = useState<SystemContext | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Load system context on mount
    useEffect(() => {
        loadSystemContext();
    }, []);

    // Auto-scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const loadSystemContext = async () => {
        try {
            const [oitsRes, resourcesRes, standardsRes] = await Promise.all([
                api.get('/oits'),
                api.get('/resources'),
                api.get('/standards')
            ]);

            const oits = oitsRes.data;
            setContext({
                oitsCount: oits.length,
                resourcesCount: resourcesRes.data.length,
                standardsCount: standardsRes.data.length,
                pendingOits: oits.filter((o: any) => ['PENDING', 'ANALYZING', 'REVIEW_REQUIRED'].includes(o.status)).length
            });
        } catch (error) {
            console.error('Error loading context:', error);
        }
    };

    const sendMessage = async () => {
        if (!input.trim() || isLoading) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: input,
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            const response = await api.post('/ai/chat', {
                message: input,
                history: messages.slice(-10).map(m => ({ role: m.role, content: m.content }))
            });

            const assistantMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: response.data.response || 'No pude generar una respuesta. Intenta de nuevo.',
                timestamp: new Date()
            };

            setMessages(prev => [...prev, assistantMessage]);
        } catch (error: any) {
            console.error('Error sending message:', error);
            toast.error('Error al enviar mensaje');

            const errorMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: 'Lo siento, hubo un error al procesar tu mensaje. Por favor intenta de nuevo.',
                timestamp: new Date()
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    return (
        <div className="p-4 h-[calc(100vh-100px)] flex flex-col overflow-hidden">
            {/* Compact Header */}
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                        <Bot className="h-4 w-4 text-white" />
                    </div>
                    <div>
                        <h1 className="text-lg font-bold text-slate-900">Asistente IA</h1>
                    </div>
                </div>

                {/* Compact Context Badges */}
                {context && (
                    <div className="flex items-center gap-1.5">
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs px-2 py-0.5">
                            <Database className="h-3 w-3 mr-1" />
                            {context.oitsCount}
                        </Badge>
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs px-2 py-0.5">
                            <Beaker className="h-3 w-3 mr-1" />
                            {context.resourcesCount}
                        </Badge>
                        <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 text-xs px-2 py-0.5">
                            <FileText className="h-3 w-3 mr-1" />
                            {context.standardsCount}
                        </Badge>
                        {context.pendingOits > 0 && (
                            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-xs px-2 py-0.5">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                {context.pendingOits}
                            </Badge>
                        )}
                    </div>
                )}
            </div>

            {/* Chat Container */}
            <Card className="flex-1 flex flex-col border-slate-200 shadow-sm overflow-hidden min-h-0">
                {/* Messages Area */}
                <CardContent className="flex-1 overflow-y-auto p-3 space-y-3">
                    {messages.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center">
                            <div className="h-16 w-16 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center mb-4">
                                <Sparkles className="h-8 w-8 text-indigo-600" />
                            </div>
                            <h3 className="text-lg font-semibold text-slate-900 mb-2">¡Hola! Soy tu asistente IA</h3>
                            <p className="text-sm text-slate-500 max-w-md mb-6">
                                Tengo acceso completo a la información del sistema. Puedo ayudarte con:
                            </p>
                            <div className="grid grid-cols-2 gap-3 w-full max-w-md">
                                <button
                                    onClick={() => setInput('¿Cuántas OITs hay pendientes?')}
                                    className="p-3 rounded-lg border border-slate-200 text-left hover:bg-slate-50 transition-colors"
                                >
                                    <p className="text-sm font-medium text-slate-900">Estado de OITs</p>
                                    <p className="text-xs text-slate-500">Consultar pendientes, progreso</p>
                                </button>
                                <button
                                    onClick={() => setInput('¿Qué equipos tenemos para monitoreo de ruido?')}
                                    className="p-3 rounded-lg border border-slate-200 text-left hover:bg-slate-50 transition-colors"
                                >
                                    <p className="text-sm font-medium text-slate-900">Consultar recursos</p>
                                    <p className="text-xs text-slate-500">Equipos, disponibilidad</p>
                                </button>
                                <button
                                    onClick={() => setInput('¿Cuáles son los límites de ruido según la norma?')}
                                    className="p-3 rounded-lg border border-slate-200 text-left hover:bg-slate-50 transition-colors"
                                >
                                    <p className="text-sm font-medium text-slate-900">Normativas</p>
                                    <p className="text-xs text-slate-500">Límites, requerimientos</p>
                                </button>
                                <button
                                    onClick={() => setInput('¿Cómo va el muestreo de la OIT más reciente?')}
                                    className="p-3 rounded-lg border border-slate-200 text-left hover:bg-slate-50 transition-colors"
                                >
                                    <p className="text-sm font-medium text-slate-900">Seguimiento</p>
                                    <p className="text-xs text-slate-500">Progreso de muestreos</p>
                                </button>
                            </div>
                        </div>
                    ) : (
                        <>
                            {messages.map((message) => (
                                <div
                                    key={message.id}
                                    className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                >
                                    {message.role === 'assistant' && (
                                        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                                            <Bot className="h-4 w-4 text-white" />
                                        </div>
                                    )}
                                    <div
                                        className={`max-w-[70%] rounded-2xl px-4 py-3 ${message.role === 'user'
                                            ? 'bg-slate-900 text-white'
                                            : 'bg-slate-100 text-slate-900'
                                            }`}
                                    >
                                        {message.role === 'assistant' ? (
                                            <div className="prose prose-sm max-w-none prose-slate">
                                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                    {message.content}
                                                </ReactMarkdown>
                                            </div>
                                        ) : (
                                            <p className="text-sm">{message.content}</p>
                                        )}
                                    </div>
                                    {message.role === 'user' && (
                                        <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0">
                                            <User className="h-4 w-4 text-slate-600" />
                                        </div>
                                    )}
                                </div>
                            ))}
                            {isLoading && (
                                <div className="flex gap-3">
                                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                                        <Bot className="h-4 w-4 text-white" />
                                    </div>
                                    <div className="bg-slate-100 rounded-2xl px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
                                            <span className="text-sm text-slate-500">Pensando...</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </>
                    )}
                </CardContent>

                {/* Input Area */}
                <div className="border-t border-slate-200 p-4 bg-slate-50">
                    <div className="flex items-center gap-3">
                        <Input
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyPress={handleKeyPress}
                            placeholder="Escribe tu pregunta..."
                            className="flex-1 bg-white border-slate-200 focus:ring-indigo-500"
                            disabled={isLoading}
                        />
                        <Button
                            onClick={sendMessage}
                            disabled={!input.trim() || isLoading}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6"
                        >
                            {isLoading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Send className="h-4 w-4" />
                            )}
                        </Button>
                    </div>
                </div>
            </Card>
        </div>
    );
}
