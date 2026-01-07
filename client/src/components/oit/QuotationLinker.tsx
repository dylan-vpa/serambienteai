import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import api from '@/lib/api';

export function QuotationLinker({ oitId, onLinked }: { oitId: string, onLinked: () => void }) {
    const [quotations, setQuotations] = useState<any[]>([]);
    const [selectedId, setSelectedId] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isLinking, setIsLinking] = useState(false);

    useEffect(() => {
        setIsLoading(true);
        api.get('/quotations')
            .then(res => setQuotations(res.data))
            .catch(() => toast.error('Error cargando cotizaciones'))
            .finally(() => setIsLoading(false));
    }, []);

    const handleLink = async () => {
        if (!selectedId) return;
        setIsLinking(true);
        try {
            await api.put(`/oits/${oitId}`, { quotationId: selectedId });
            toast.success('Cotización vinculada');
            onLinked();
        } catch (error) {
            toast.error('Error al vincular cotización');
        } finally {
            setIsLinking(false);
        }
    };

    return (
        <div className="space-y-4 pt-4">
            {isLoading ? (
                <div className="flex justify-center p-4">
                    <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                </div>
            ) : (
                <div className="space-y-2">
                    <label className="text-sm font-medium">Seleccionar Cotización</label>
                    <select
                        className="w-full p-2 border rounded-md"
                        value={selectedId}
                        onChange={(e) => setSelectedId(e.target.value)}
                    >
                        <option value="">Seleccione una opción...</option>
                        {quotations.map(q => (
                            <option key={q.id} value={q.id}>
                                {q.quotationNumber} - {q.clientName || 'Sin cliente'}
                            </option>
                        ))}
                    </select>
                </div>
            )}
            <div className="flex justify-end pt-2">
                <Button onClick={handleLink} disabled={!selectedId || isLinking}>
                    {isLinking && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Vincular
                </Button>
            </div>
        </div>
    );
}
