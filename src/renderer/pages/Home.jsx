import React from 'react';
import ContinuarButton from '../components/Button';

const Home = () => {
  return (
    <div className="text-center mt-[15%] font-sans">
      <h1 className="text-4xl text-blue-600">¡Bienvenido a Facto!</h1>
      <p className="text-lg mt-4">Tu aplicación de escritorio con Electron + React + Vite.</p>
      <ContinuarButton />
    </div>

  );
};

export default Home;
