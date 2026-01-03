import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Clock } from 'lucide-react';
import api from '@/lib/api';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

interface OIT {
    id: string;
    oitNumber: string;
    scheduledDate: string;
    description?: string;
    status: string;
}

export function TodaySchedule() {
    const [todayOITs, setTodayOITs] = useState<OIT[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        fetchTodayOITs();
    }, []);

    const fetchTodayOITs = async () => {
        try {
            const response = await api.get('/oits');
            const oits = response.data;

            // Filter OITs scheduled for today
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);

            const filtered = oits.filter((oit: OIT) => {
                if (!oit.scheduledDate) return false;
                const scheduledDate = new Date(oit.scheduledDate);
                scheduledDate.setHours(0, 0, 0, 0);
                return scheduledDate >= today && scheduledDate < tomorrow;
            });

            setTodayOITs(filtered);
        } catch (error) {
            console.error('Error fetching today OITs:', error);
        } finally {
            setIsLoading(false);
        }
    };




    return (
        <Card className="border-slate-200 shadow-sm bg-white">
            <CardHeader>
                <CardTitle className="text-slate-900 flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-slate-600" />
                    Agenda de Hoy
                </CardTitle>
                <p className="text-xs text-slate-500 mt-1">
                    {format(new Date(), "d 'de' MMMM", { locale: es })}
                </p>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="space-y-3">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="h-16 bg-slate-100 rounded-lg animate-pulse" />
                        ))}
                    </div>
                ) : todayOITs.length === 0 ? (
                    <div className="text-center py-8">
                        <Calendar className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                        <p className="text-sm text-slate-500">No hay OITs agendadas para hoy</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {todayOITs.map((oit) => (
                            <div
                                key={oit.id}
                                onClick={() => navigate(`/oits/${oit.id}`)}
                                className="flex items-center justify-between border-b border-slate-100 pb-4 last:border-0 last:pb-0 hover:bg-slate-50 cursor-pointer transition-colors p-2 rounded"
                            >
                                <div className="flex items-center gap-3 min-w-0">
                                    <Clock className="h-4 w-4 text-slate-400 flex-shrink-0" />
                                    <div className="space-y-1 min-w-0">
                                        <p className="text-sm font-medium leading-none text-slate-900 truncate">
                                            {oit.oitNumber}
                                        </p>
                                        {oit.description && (
                                            <p className="text-xs text-slate-500 truncate">
                                                {oit.description}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <div className={`px-2.5 py-0.5 rounded-full text-xs font-medium flex-shrink-0
                                    ${oit.status === 'SCHEDULED' ? 'bg-blue-100 text-blue-700' :
                                        oit.status === 'IN_PROGRESS' ? 'bg-amber-100 text-amber-700' :
                                            oit.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' :
                                                'bg-slate-100 text-slate-700'}`}>
                                    {oit.status}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
