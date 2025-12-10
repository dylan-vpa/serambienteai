import { useState, useEffect } from 'react';

export function HeaderAuth() {
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString('es-ES', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });
    };

    return (
        <header className="fixed top-0 left-0 right-0 z-50 px-4 py-2">
            <div className="flex justify-between items-center">
                <div className="text-xl font-bold text-gray-900">
                    ALS
                </div>
                <div className="text-sm font-medium text-gray-600 tabular-nums">
                    {formatTime(currentTime)}
                </div>
            </div>
        </header>
    );
}