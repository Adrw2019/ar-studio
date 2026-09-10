import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import ARExperience from './pages/ARExperience';
import Projects from './pages/Projects';
import MarkerCompiler from './pages/MarkerCompiler';
import StudioDashboard from './studio/pages/StudioDashboard';
import StudioEditor from './studio/pages/StudioEditor';

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Routes>
        {/* Landing Page */}
        <Route path="/" element={<Home />} />

        {/* AR Studio Editor */}
        <Route path="/studio" element={<StudioDashboard />} />
        <Route path="/studio/projects" element={<StudioDashboard />} />
        <Route path="/studio/project/:id" element={<StudioEditor />} />

        {/* AR Player (Ejecución Móvil de Realidad Aumentada) */}
        <Route path="/ar/demo" element={<ARExperience />} />
        <Route path="/ar/:slug" element={<ARExperience />} />

        {/* Proyectos y Herramientas */}
        <Route path="/projects" element={<Projects />} />
        <Route path="/tools/compiler" element={<MarkerCompiler />} />

        {/* Redirección por defecto */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
