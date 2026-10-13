import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';
import { AuthProvider } from './contexts/AuthContext';
import { StoreProvider } from './contexts/StoreContext';
import { fetchStores } from './utils/storeConfig';

/* ⭐ 启动时预加载门店配置（失败也不阻塞渲染） */
fetchStores()
  .catch((e) => console.warn('[storeConfig] 预加载失败', e))
  .finally(() => {
    ReactDOM.createRoot(document.getElementById('root')!).render(
      <React.StrictMode>
        <BrowserRouter>
          <AuthProvider>
            <StoreProvider>
              <App />
            </StoreProvider>
          </AuthProvider>
        </BrowserRouter>
      </React.StrictMode>
    );
  });