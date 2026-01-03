import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '@/lib/api';
import { toast } from 'sonner';
import { format, parse, startOfWeek, getDay, addHours } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar, dateFnsLocalizer, Views, type View } from 'react-big-calendar';
import 'react-big-calendar/lib/css/react-big-calendar.css';

// Customize the localizer to use Spanish
const locales = {
    'es': es,
};

const localizer = dateFnsLocalizer({
    format,
    parse,
    startOfWeek,
    getDay,
    locales,
});

interface OIT {
    id: string;
    oitNumber: string;
    scheduledDate: string;
    description?: string;
    status: string;
    client?: {
        name: string;
    };
}

interface CalendarEvent {
    id: string;
    title: string;
    start: Date;
    end: Date;
    resource: OIT;
}

export default function CalendarPage() {
    const [oits, setOits] = useState<OIT[]>([]);
    const [filteredOits, setFilteredOits] = useState<OIT[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('ALL');
    const [view, setView] = useState<View>(Views.MONTH);
    const [date, setDate] = useState(new Date());

    const navigate = useNavigate();

    useEffect(() => {
        fetchScheduledOITs();
    }, []);

    useEffect(() => {
        filterOits();
    }, [searchTerm, statusFilter, oits]);

    const fetchScheduledOITs = async () => {
        try {
            const response = await api.get('/oits');

            if (Array.isArray(response.data)) {
                const allOits: OIT[] = response.data;
                const scheduled = allOits
                    .filter(oit => oit.scheduledDate)
                    .sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime());

                setOits(scheduled);
                setFilteredOits(scheduled);
            } else {
                console.error('API response is not an array:', response.data);
                setOits([]);
                setFilteredOits([]);
            }
        } catch (error) {
            console.error('Error fetching scheduled OITs:', error);
            toast.error('Error al cargar muestreos agendados');
            setOits([]);
            setFilteredOits([]);
        } finally {
            setIsLoading(false);
        }
    };

    const filterOits = () => {
        let result = oits;

        if (searchTerm) {
            const lowerTerm = searchTerm.toLowerCase();
            result = result.filter(oit =>
                oit.oitNumber.toLowerCase().includes(lowerTerm) ||
                oit.client?.name.toLowerCase().includes(lowerTerm)
            );
        }

        if (statusFilter !== 'ALL') {
            result = result.filter(oit => oit.status === statusFilter);
        }

        setFilteredOits(result);
    };

    // Transform OITs to Calendar Events
    const events: CalendarEvent[] = filteredOits.map(oit => {
        const startDate = new Date(oit.scheduledDate);
        // Assume 2 hour duration if not specified, or checks logic
        const endDate = addHours(startDate, 2);

        return {
            id: oit.id,
            title: `${oit.oitNumber} - ${oit.client?.name || 'Sin Cliente'}`,
            start: startDate,
            end: endDate,
            resource: oit,
        };
    });

    const getEventStyle = (event: CalendarEvent) => {
        const status = event.resource.status;
        let style = {
            backgroundColor: '#3b82f6', // blue-500 default
            borderColor: '#2563eb', // blue-600
            color: 'white',
            borderRadius: '4px',
            border: 'none',
            display: 'block',
            fontSize: '0.85rem',
            padding: '2px 5px',
        };

        switch (status) {
            case 'SCHEDULED':
                style.backgroundColor = '#10b981'; // emerald-500
                style.borderColor = '#059669';
                break;
            case 'IN_PROGRESS':
                style.backgroundColor = '#f59e0b'; // amber-500
                style.borderColor = '#d97706';
                break;
            case 'COMPLETED':
                style.backgroundColor = '#6366f1'; // indigo-500
                style.borderColor = '#4f46e5';
                break;
            case 'PENDING':
                style.backgroundColor = '#64748b'; // slate-500
                style.borderColor = '#475569';
                break;
            case 'ANALYZING':
                style.backgroundColor = '#3b82f6'; // blue-500
                style.borderColor = '#2563eb';
                break;
            default:
                break;
        }

        return {
            style: style
        };
    };

    const onSelectEvent = (event: CalendarEvent) => {
        navigate(`/oits/${event.id}`);
    };

    // Custom Toolbar
    const CustomToolbar = (toolbar: any) => {
        const goToBack = () => {
            toolbar.onNavigate('PREV');
        };

        const goToNext = () => {
            toolbar.onNavigate('NEXT');
        };

        const goToCurrent = () => {
            toolbar.onNavigate('TODAY');
        };

        const label = () => {
            const date = toolbar.date;
            return (
                <span className="capitalize text-lg font-semibold text-slate-800">
                    {format(date, view === 'month' ? 'MMMM yyyy' : 'MMMM yyyy', { locale: es })}
                </span>
            );
        };

        return (
            <div className="flex flex-col md:flex-row items-center justify-between mb-4 gap-4 p-2">
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" onClick={goToBack} className="h-8 w-8">
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={goToCurrent}>
                        Hoy
                    </Button>
                    <Button variant="outline" size="icon" onClick={goToNext} className="h-8 w-8">
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                    <div className="ml-4">{label()}</div>
                </div>

                <div className="flex items-center bg-slate-100 p-1 rounded-md">
                    <button
                        className={`px-3 py-1 text-sm rounded-sm transition-all ${view === 'month' ? 'bg-white shadow-sm text-slate-900 font-medium' : 'text-slate-500 hover:text-slate-700'}`}
                        onClick={() => toolbar.onView('month')}
                    >
                        Mes
                    </button>
                    <button
                        className={`px-3 py-1 text-sm rounded-sm transition-all ${view === 'week' ? 'bg-white shadow-sm text-slate-900 font-medium' : 'text-slate-500 hover:text-slate-700'}`}
                        onClick={() => toolbar.onView('week')}
                    >
                        Semana
                    </button>
                    <button
                        className={`px-3 py-1 text-sm rounded-sm transition-all ${view === 'day' ? 'bg-white shadow-sm text-slate-900 font-medium' : 'text-slate-500 hover:text-slate-700'}`}
                        onClick={() => toolbar.onView('day')}
                    >
                        Día
                    </button>
                    <button
                        className={`px-3 py-1 text-sm rounded-sm transition-all ${view === 'agenda' ? 'bg-white shadow-sm text-slate-900 font-medium' : 'text-slate-500 hover:text-slate-700'}`}
                        onClick={() => toolbar.onView('agenda')}
                    >
                        Agenda
                    </button>
                </div>
            </div>
        );
    };

    return (
        <div className="h-full flex flex-col gap-4">
            <style>{`
                .rbc-calendar { font-family: inherit; }
                .rbc-header { padding: 12px 4px; font-weight: 600; font-size: 0.875rem; color: #64748b; background-color: #f8fafc; border-bottom: 1px solid #e2e8f0; }
                .rbc-month-view { border: 1px solid #e2e8f0; border-radius: 0.5rem; overflow: hidden; background: white; }
                .rbc-day-bg + .rbc-day-bg { border-left: 1px solid #f1f5f9; }
                .rbc-month-row + .rbc-month-row { border-top: 1px solid #f1f5f9; }
                .rbc-off-range-bg { background-color: #f8fafc; }
                .rbc-today { background-color: #f0f9ff; }
                .rbc-event { box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
                .rbc-time-view { border: 1px solid #e2e8f0; border-radius: 0.5rem; background: white; }
                .rbc-time-header { background-color: #f8fafc; }
                .rbc-time-content { border-top: 1px solid #e2e8f0; }
                .rbc-timeslot-group { border-bottom: 1px solid #f1f5f9; }
                .rbc-day-slot .rbc-time-slot { border-top: 1px solid #f8fafc; }
                .rbc-current-time-indicator { background-color: #ef4444; height: 2px; }
            `}</style>

            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-slate-900">Agenda de Muestreos</h2>
                    <p className="text-slate-500">
                        Gestiona y visualiza los muestreos programados.
                    </p>
                </div>
            </div>

            <Card className="border-slate-200 shadow-sm bg-white flex-1 flex flex-col min-h-0">
                <CardHeader className="border-b border-slate-100 pb-4">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center justify-between">
                        <div className="relative w-72">
                            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <Input
                                placeholder="Buscar por OIT..."
                                className="pl-9 bg-slate-50 border-slate-200 focus:bg-white transition-colors"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <Button
                                variant={statusFilter === 'ALL' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setStatusFilter('ALL')}
                                className={statusFilter === 'ALL' ? "bg-slate-900 text-white hover:bg-slate-800" : "text-slate-600 border-slate-200"}
                            >
                                Todos
                            </Button>
                            <Button
                                variant={statusFilter === 'SCHEDULED' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setStatusFilter('SCHEDULED')}
                                className={statusFilter === 'SCHEDULED' ? "bg-slate-900 text-white hover:bg-slate-800" : "text-slate-600 border-slate-200"}
                            >
                                Agendados
                            </Button>
                            <Button
                                variant={statusFilter === 'IN_PROGRESS' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setStatusFilter('IN_PROGRESS')}
                                className={statusFilter === 'IN_PROGRESS' ? "bg-slate-900 text-white hover:bg-slate-800" : "text-slate-600 border-slate-200"}
                            >
                                En Progreso
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-4 flex-1 flex flex-col min-h-0">
                    <div className="flex-1 min-h-0">
                        {isLoading ? (
                            <div className="h-full flex items-center justify-center">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
                            </div>
                        ) : (
                            <Calendar
                                localizer={localizer}
                                events={events}
                                startAccessor="start"
                                endAccessor="end"
                                style={{ height: '100%' }}
                                views={['month', 'week', 'day', 'agenda']}
                                view={view}
                                onView={setView}
                                date={date}
                                onNavigate={setDate}
                                messages={{
                                    next: "Siguiente",
                                    previous: "Anterior",
                                    today: "Hoy",
                                    month: "Mes",
                                    week: "Semana",
                                    day: "Día",
                                    agenda: "Agenda",
                                    date: "Fecha",
                                    time: "Hora",
                                    event: "Evento",
                                    noEventsInRange: "No hay eventos en este rango",
                                }}
                                culture='es'
                                eventPropGetter={getEventStyle}
                                onSelectEvent={onSelectEvent}
                                components={{
                                    toolbar: CustomToolbar
                                }}
                            />
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
