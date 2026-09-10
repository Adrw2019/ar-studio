import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Play, Sparkles, Box, Atom, Zap, Globe } from 'lucide-react';
import { apiService } from '../services/api';

export default function Projects() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const data = await apiService.getProjects();
      if (data && data.length > 0) {
        setProjects(data);
      } else {
        // Proyectos predeterminados
        setProjects([
          {
            id: '1',
            name: 'Experimento: Motor Eléctrico y Energía',
            description: 'Proyecto educativo de electromagnetismo con tarjetas interactivas de inducción y batería.',
            slug: 'motor-energia-demo',
            category: 'Electromagnetismo',
            cardsCount: 2,
            icon: Zap
          },
          {
            id: '2',
            name: 'Biología: Estructura Celular',
            description: 'Visualización 3D interactiva de células eucariotas y organelos.',
            slug: 'biologia-celular',
            category: 'Ciencias Naturales',
            cardsCount: 3,
            icon: Atom
          },
          {
            id: '3',
            name: 'Astronomía: Sistema Solar a Escala',
            description: 'Exploración de planetas y órbitas en realidad aumentada sobre la mesa.',
            slug: 'sistema-solar',
            category: 'Astronomía',
            cardsCount: 8,
            icon: Globe
          }
        ]);
      }
      setLoading(false);
    }
    load();
  }, []);

  return (
    <div className="home-container">
      {/* Header */}
      <header className="home-header">
        <button
          type="button"
          className="btn btn-secondary btn-icon"
          onClick={() => navigate('/')}
          aria-label="Volver al inicio"
        >
          <ArrowLeft size={20} />
        </button>
        <h2 style={{ fontSize: '1.25rem', margin: 0 }}>Proyectos Educativos</h2>
        <div style={{ width: '48px' }} />
      </header>

      <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
        Explora las experiencias interactivas disponibles para escanear con tus tarjetas de Realidad Aumentada:
      </p>

      {/* Lista de Proyectos */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
        {projects.map((project) => {
          const Icon = project.icon || Box;
          return (
            <div
              key={project.id}
              className="glass-panel"
              style={{
                padding: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.85rem'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div className="feature-icon-box">
                    <Icon size={22} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.1rem', marginBottom: '0.2rem' }}>{project.name}</h3>
                    <span className="badge-pill" style={{ fontSize: '0.7rem' }}>
                      {project.cardsCount ? `${project.cardsCount} Tarjetas` : '2 Tarjetas'}
                    </span>
                  </div>
                </div>
              </div>

              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: 0 }}>
                {project.description}
              </p>

              <button
                type="button"
                className="btn btn-primary"
                style={{ width: '100%', marginTop: '0.25rem' }}
                onClick={() => navigate('/ar/demo')}
              >
                <Play size={18} fill="#050b14" />
                <span>Iniciar experiencia</span>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
