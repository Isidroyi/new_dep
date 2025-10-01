import React, { useState, useEffect } from 'react';

const extractionMessages = [
    "Инициализация анализа...",
    "Анализ структуры документа...",
    "Извлечение сущностей и связей...",
    "Построение модели данных...",
    "ИИ анализирует документ...",
    "Завершение обработки..."
];

const verificationMessages = [
    "Подготовка к верификации...",
    "Анализ технической документации...",
    "Сопоставление требований со значениями...",
    "Оценка соответствия...",
    "Формулирование пояснений...",
    "Генерация итогового отчета..."
];

interface SpinnerProps {
    mode?: 'extraction' | 'verification';
    timer: number; // <-- НОВЫЙ PROP
}

const Spinner: React.FC<SpinnerProps> = ({ mode = 'extraction', timer }) => {
    const [messageIndex, setMessageIndex] = useState(0);
    const messages = mode === 'verification' ? verificationMessages : extractionMessages;

    useEffect(() => {
        const interval = setInterval(() => {
            setMessageIndex((prevIndex) => (prevIndex + 1) % messages.length);
        }, 3000);
        return () => clearInterval(interval);
    }, [messages]);
    
    // Функция для форматирования времени
    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
        const secs = (seconds % 60).toString().padStart(2, '0');
        return `${mins}:${secs}`;
    }

    return (
        <div className="flex flex-col items-center justify-center space-y-4 py-12">
            <div className="w-16 h-16 border-4 border-dashed rounded-full animate-spin border-sky-400"></div>
            <p className="text-slate-300 text-lg">{messages[messageIndex]}</p>
            {/* --- НОВОЕ: Отображение таймера --- */}
            <p className="text-slate-400 text-sm font-mono">Прошло времени: {formatTime(timer)}</p>
        </div>
    );
};

export default Spinner;