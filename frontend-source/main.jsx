import './shell.css';
import React from 'react';
import {createRoot} from 'react-dom/client';
import {Workspace} from './ui.jsx';
import {DashboardContent} from './dashboard/DashboardContent.jsx';
createRoot(document.getElementById('app')).render(<Workspace><DashboardContent/></Workspace>);
