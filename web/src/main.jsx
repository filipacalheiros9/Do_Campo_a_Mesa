import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { SocketProvider } from './context/SocketContext.jsx';
import { CarrinhoProvider } from './context/CarrinhoContext.jsx';
import 'bootstrap/dist/js/bootstrap.bundle.min.js'; // menu colapsável, dropdowns, etc.
import './styles/main.scss';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <SocketProvider>
        <CarrinhoProvider>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </CarrinhoProvider>
      </SocketProvider>
    </AuthProvider>
  </React.StrictMode>
);
