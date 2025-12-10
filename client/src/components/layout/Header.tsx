import { useState } from 'react';
import { Bell, Search, Slash, Menu, PanelLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLocation, useNavigate } from 'react-router-dom';
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { useGlobalSearch } from '@/hooks/useGlobalSearch';

interface HeaderProps {
    onMenuClick: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
    const location = useLocation();
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    const [showResults, setShowResults] = useState(false);
    const { results, isLoading } = useGlobalSearch(searchQuery);

    const getBreadcrumbs = () => {
        const path = location.pathname;
        if (path === '/') return ['Plataforma', 'Panel de Control'];
        if (path.startsWith('/oits')) return ['Plataforma', 'OITs'];
        if (path.startsWith('/resources')) return ['Plataforma', 'Recursos'];
        if (path.startsWith('/settings')) return ['Plataforma', 'Configuración'];
        return ['Plataforma', 'Página'];
    };

    const breadcrumbs = getBreadcrumbs();
    const totalResults = results.oits.length + results.resources.length;

    const handleResultClick = (type: 'oit' | 'resource', id: string) => {
        setShowResults(false);
        setSearchQuery('');
        navigate(type === 'oit' ? `/oits/${id}` : `/resources/${id}`);
    };

    return (
        <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 md:px-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" className="md:hidden" onClick={onMenuClick}>
                    <Menu className="h-5 w-5 text-slate-500" />
                </Button>

                {/* Desktop sidebar toggle */}
                <Button variant="ghost" size="icon" className="hidden md:flex" onClick={onMenuClick}>
                    <PanelLeft className="h-5 w-5 text-slate-500" />
                </Button>

                <Breadcrumb className="hidden md:flex">
                    <BreadcrumbList>
                        <BreadcrumbItem>
                            <BreadcrumbLink href="/" className="font-medium text-slate-500 hover:text-slate-900">ALS</BreadcrumbLink>
                        </BreadcrumbItem>
                        <BreadcrumbSeparator>
                            <Slash className="h-4 w-4 text-slate-300" />
                        </BreadcrumbSeparator>
                        <BreadcrumbItem>
                            <BreadcrumbLink className="font-medium text-slate-500 hover:text-slate-900">{breadcrumbs[0]}</BreadcrumbLink>
                        </BreadcrumbItem>
                        <BreadcrumbSeparator>
                            <Slash className="h-4 w-4 text-slate-300" />
                        </BreadcrumbSeparator>
                        <BreadcrumbItem>
                            <BreadcrumbPage className="font-medium text-slate-900">{breadcrumbs[1]}</BreadcrumbPage>
                        </BreadcrumbItem>
                    </BreadcrumbList>
                </Breadcrumb>
            </div>

            <div className="flex items-center gap-4">
                <div className="relative w-full max-w-[200px] md:max-w-xs">
                    <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                        type="search"
                        placeholder="Buscar en todo el sitio..."
                        value={searchQuery}
                        onChange={(e) => {
                            setSearchQuery(e.target.value);
                            setShowResults(e.target.value.length > 0);
                        }}
                        onFocus={() => searchQuery.length > 0 && setShowResults(true)}
                        onBlur={() => setTimeout(() => setShowResults(false), 200)}
                        className="h-9 w-full rounded-md border border-slate-200 bg-slate-50 pl-9 pr-4 text-sm outline-none focus:border-slate-400 focus:ring-0 transition-colors placeholder:text-slate-400"
                    />
                    <div className="absolute right-2.5 top-1/2 -translate-y-1/2 hidden md:flex items-center gap-1">
                        <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-slate-100 px-1.5 font-mono text-[10px] font-medium text-slate-500 opacity-100">
                            <span className="text-xs">⌘</span>K
                        </kbd>
                    </div>

                    {/* Search Results Dropdown */}
                    {showResults && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-md shadow-lg z-50 max-h-[400px] overflow-y-auto">
                            {isLoading ? (
                                <div className="p-4 text-center text-sm text-slate-500">
                                    Buscando...
                                </div>
                            ) : totalResults === 0 ? (
                                <div className="p-4 text-center text-sm text-slate-500">
                                    No se encontraron resultados
                                </div>
                            ) : (
                                <div className="py-2">
                                    {results.oits.length > 0 && (
                                        <div>
                                            <div className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase">
                                                OITs ({results.oits.length})
                                            </div>
                                            {results.oits.map((oit) => (
                                                <button
                                                    key={oit.id}
                                                    onClick={() => handleResultClick('oit', oit.id)}
                                                    className="w-full px-3 py-2 text-left hover:bg-slate-50 transition-colors"
                                                >
                                                    <div className="text-sm font-medium text-slate-900">
                                                        {oit.oitNumber || `OIT-${oit.id}`}
                                                    </div>
                                                    <div className="text-xs text-slate-500">
                                                        {oit.description || 'Sin descripción'}
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                    {results.resources.length > 0 && (
                                        <div>
                                            <div className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase">
                                                Recursos ({results.resources.length})
                                            </div>
                                            {results.resources.map((resource) => (
                                                <button
                                                    key={resource.id}
                                                    onClick={() => handleResultClick('resource', resource.id)}
                                                    className="w-full px-3 py-2 text-left hover:bg-slate-50 transition-colors"
                                                >
                                                    <div className="text-sm font-medium text-slate-900">
                                                        {resource.name}
                                                    </div>
                                                    <div className="text-xs text-slate-500">
                                                        {resource.type} • Cantidad: {resource.quantity}
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
                <Button variant="ghost" size="icon" className="text-slate-500 hover:text-slate-900">
                    <Bell className="h-4 w-4" />
                </Button>
            </div>
        </header>
    );
}
