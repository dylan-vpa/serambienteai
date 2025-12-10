import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Bot, User, Sparkles } from 'lucide-react';
import api from '@/lib/api';

interface Message {
    role: 'user' | 'assistant';
    content: string;
}

export default function AIAssistantPage() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const sendMessage = async () => {
        if (!input.trim() || isLoading) return;

        const userMessage: Message = { role: 'user', content: input };
        setMessages((prev) => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            const response = await api.post('/ai/chat', { message: input });
            const assistantMessage: Message = {
                role: 'assistant',
                content: response.data.response,
            };
            setMessages((prev) => [...prev, assistantMessage]);
        } catch (error) {
            const errorMessage: Message = {
                role: 'assistant',
                content: 'Lo siento, el servicio de IA no está disponible. Asegúrate de que Ollama esté corriendo.',
            };
            setMessages((prev) => [...prev, errorMessage]);
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
        <div className="flex flex-col h-full">
            {/* Chat Area - Scrollable Above */}
            <div className="flex-1 overflow-y-auto bg-slate-50/30 p-6">
                <div className="max-w-4xl mx-auto w-full space-y-6 pb-4">
                    {messages.length === 0 && (
                        <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-400 space-y-4">
                            <div className="h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center">
                                <Sparkles className="h-8 w-8 text-slate-300" />
                            </div>
                            <p className="text-lg font-medium text-slate-500">¿En qué puedo ayudarte hoy?</p>
                            <p className="text-sm">Pregunta sobre tus OITs, estados de muestras o recursos.</p>
                        </div>
                    )}

                    {messages.map((msg, idx) => (
                        <div
                            key={idx}
                            className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 duration-300`}
                        >
                            {msg.role === 'assistant' && (
                                <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0 mt-1">
                                    <Bot className="h-4 w-4 text-slate-600" />
                                </div>
                            )}
                            <div
                                className={`max-w-[80%] rounded-2xl px-6 py-4 text-base leading-relaxed shadow-sm ${msg.role === 'user'
                                    ? 'bg-slate-900 text-white'
                                    : 'bg-white border border-slate-100 text-slate-800'
                                    }`}
                            >
                                {msg.content}
                            </div>
                            {msg.role === 'user' && (
                                <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0 mt-1">
                                    <User className="h-4 w-4 text-slate-600" />
                                </div>
                            )}
                        </div>
                    ))}

                    {isLoading && (
                        <div className="flex gap-4">
                            <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center mt-1">
                                <Bot className="h-4 w-4 text-slate-600" />
                            </div>
                            <div className="bg-white border border-slate-100 rounded-2xl px-6 py-4 shadow-sm">
                                <div className="flex gap-1.5">
                                    <div className="h-2 w-2 rounded-full bg-slate-400 animate-bounce" />
                                    <div className="h-2 w-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0.1s' }} />
                                    <div className="h-2 w-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0.2s' }} />
                                </div>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>
            </div>

            {/* Fixed Input at Bottom */}
            <div className="p-4">
                <div className="max-w-4xl mx-auto w-full">
                    <div className="relative">
                        <Input
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyPress={handleKeyPress}
                            placeholder="Pregúntale al asistente IA..."
                            disabled={isLoading}
                            className="pr-12 h-12 rounded-full border-slate-200 shadow-sm focus-visible:ring-slate-900 text-base px-6 bg-slate-50 w-full"
                        />
                        <Button
                            onClick={sendMessage}
                            disabled={isLoading || !input.trim()}
                            size="icon"
                            className="absolute right-1 top-1 h-10 w-10 rounded-full bg-slate-900 hover:bg-slate-800 text-white"
                        >
                            <Send className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
