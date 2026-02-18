import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { NuqsAdapter } from 'nuqs/adapters/react';
import { App } from './App';
import { store } from './store';
import './styles/global.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <NuqsAdapter>
      <Provider store={store}>
        <App />
      </Provider>
    </NuqsAdapter>
  </React.StrictMode>
);
