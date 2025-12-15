import React from 'react';
import ReactDOM from 'react-dom/client';
import AppWrapper from './App.jsx';

// Aquí se asume que App.jsx exporta el AppWrapper con el AuthProvider
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AppWrapper />
  </React.StrictMode>,
);