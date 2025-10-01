import React from 'react';

const Header: React.FC = () => {
  return (
    <header className="text-center py-8 md:py-12">
      <h1 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-cyan-300">
        Верификатор технических требований
      </h1>
      <p className="mt-4 text-lg text-slate-400 max-w-3xl mx-auto">
        Шаг 1: Загрузите документ с требованиями для извлечения данных. Шаг 2: Загрузите техническую документацию для проверки соответствия.
      </p>
    </header>
  );
};

export default Header;
