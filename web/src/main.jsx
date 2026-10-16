import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { SocketProvider } from './context/SocketContext.jsx';
import { NotificacoesProvider } from './context/NotificacoesContext.jsx';
import { CarrinhoProvider } from './context/CarrinhoContext.jsx';
import 'bootstrap/dist/js/bootstrap.bundle.min.js'; // menu colapsável, dropdowns, etc.
import './styles/main.scss';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <SocketProvider>
        <NotificacoesProvider>
          <CarrinhoProvider>
            <BrowserRouter>
              <App />
            </BrowserRouter>
          </CarrinhoProvider>
        </NotificacoesProvider>
      </SocketProvider>
    </AuthProvider>
  </React.StrictMode>
);
