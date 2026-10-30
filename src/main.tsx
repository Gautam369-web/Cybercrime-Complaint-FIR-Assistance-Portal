import React from 'react';
import {createRoot} from 'react-dom/client';
import './i18n';
import App from './App';
import './styles.css';
import './liquid-glass.css';
import './lens-world.css';
import LensEffects from './LensEffects';
createRoot(document.getElementById('root')!).render(<React.StrictMode><LensEffects/><App/></React.StrictMode>);
