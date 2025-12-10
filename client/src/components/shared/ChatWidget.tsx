import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MessageCircle, X, Send, Bot, User, Sparkles } from 'lucide-react';
import api from '@/lib/api';

interface Message {
    role: 'user' | 'assistant';
    content: string;
}

export function ChatWidget() {
    const [isOpen, setIsOpen] = useState(false);
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
        <>
            {/* Floating Button with Gradient */}
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="fixed bottom-6 right-6 h-16 w-16 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 text-white shadow-2xl hover:shadow-indigo-300 hover:scale-110 transition-all flex items-center justify-center z-50 group"
                >
                    <MessageCircle className="h-7 w-7 group-hover:scale-110 transition-transform" />
                    <div className="absolute -top-1 -right-1 h-4 w-4 bg-emerald-500 rounded-full animate-pulse" />
                </button>
            )}

            {/* Chat Window with Glassmorphism */}
            {isOpen && (
                <Card className="fixed bottom-6 right-6 w-[420px] h-[600px] shadow-2xl z-50 flex flex-col border-slate-200 overflow-hidden bg-white/95 backdrop-blur-xl">
                    <CardHeader className="flex flex-row items-center justify-between pb-4 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 text-white border-b-0">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                                <Sparkles className="h-5 w-5" />
                            </div>
                            <div>
                                <CardTitle className="text-lg font-semibold">AI Assistant</CardTitle>
                                <p className="text-xs text-indigo-100">Asistente Virtual ALS</p>
                            </div>
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setIsOpen(false)}
                            className="text-white hover:bg-white/20 rounded-full h-8 w-8 p-0"
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </CardHeader>
                    <CardContent className="flex-1 flex flex-col p-6 overflow-hidden bg-gradient-to-b from-slate-50/50 to-white">
                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2 custom-scrollbar">
                            {messages.length === 0 && (
                                <div className="text-center text-slate-500 mt-16">
                                    <div className="h-20 w-20 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center mx-auto mb-4">
                                        <Bot className="h-10 w-10 text-indigo-600" />
                                    </div>
                                    <p className="text-sm font-medium text-slate-700">¡Hola! Soy tu asistente IA</p>
                                    <p className="text-xs text-slate-500 mt-1">Pregúntame sobre OITs o recursos</p>
                                </div>
                            )}
                            {messages.map((msg, idx) => (
                                <div
                                    key={idx}
                                    className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 duration-300`}
                                >
                                    {msg.role === 'assistant' && (
                                        <div className="h-9 w-9 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center flex-shrink-0 shadow-sm">
                                            <Bot className="h-5 w-5 text-indigo-600" />
                                        </div>
                                    )}
                                    <div
                                        className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm shadow-sm ${msg.role === 'user'
                                            ? 'bg-gradient-to-br from-indigo-600 to-purple-600 text-white'
                                            : 'bg-white text-slate-800 border border-slate-100'
                                            }`}
                                    >
                                        {msg.content}
                                    </div>
                                    {msg.role === 'user' && (
                                        <div className="h-9 w-9 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center flex-shrink-0 shadow-sm">
                                            <User className="h-5 w-5 text-slate-600" />
                                        </div>
                                    )}
                                </div>
                            ))}
                            {isLoading && (
                                <div className="flex gap-3 animate-in slide-in-from-bottom-2 duration-300">
                                    <div className="h-9 w-9 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center shadow-sm">
                                        <Bot className="h-5 w-5 text-indigo-600" />
                                    </div>
                                    <div className="bg-white border border-slate-100 rounded-2xl px-4 py-3 shadow-sm">
                                        <div className="flex gap-1.5">
                                            <div className="h-2.5 w-2.5 rounded-full bg-indigo-400 animate-bounce" />
                                            <div className="h-2.5 w-2.5 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '0.1s' }} />
                                            <div className="h-2.5 w-2.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '0.2s' }} />
                                        </div>
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input with Enhanced Styling */}
                        <div className="flex gap-2 p-3 bg-white rounded-2xl border border-slate-200 shadow-sm">
                            <Input
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyPress={handleKeyPress}
                                placeholder="Escribe tu mensaje..."
                                disabled={isLoading}
                                className="flex-1 border-0 focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent"
                            />
                            <Button
                                onClick={sendMessage}
                                disabled={isLoading || !input.trim()}
                                size="icon"
                                className="bg-gradient-to-br from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 rounded-full h-10 w-10 flex-shrink-0 shadow-md"
                            >
                                <Send className="h-4 w-4" />
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            <style>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #cbd5e1;
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #94a3b8;
                }
            `}</style>
        </>
    );
}
