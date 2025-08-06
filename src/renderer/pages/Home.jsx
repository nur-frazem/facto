import React from 'react';

const Home = () => {
  return (
    <div style={styles.container}>
      <h1 style={styles.title}>¡Bienvenido a Facto!</h1>
      <p style={styles.description}>Tu aplicación de escritorio con Electron + React + Vite.</p>
    </div>
  );
};

const styles = {
  container: {
    textAlign: 'center',
    marginTop: '15%',
    fontFamily: 'sans-serif'
  },
  title: {
    fontSize: '2.5rem',
    color: '#007acc',
  },
  description: {
    fontSize: '1.2rem',
    marginTop: '1rem',
  },
};

export default Home;
