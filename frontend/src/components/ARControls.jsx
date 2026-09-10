import React from 'react';
import { Info, RotateCcw, Image, Volume2, VolumeX } from 'lucide-react';

export default function ARControls({
  onToggleInfo,
  onReset,
  onToggleCardPreview,
  soundEnabled,
  onToggleSound,
  isInfoOpen,
  canShowInfo = true
}) {
  return (
    <div className="ar-bottom-controls">
      {/* Botón Información */}
      <button
        type="button"
        className={`ar-control-btn ${isInfoOpen ? 'active' : ''}`}
        onClick={onToggleInfo}
        aria-label="Información didáctica"
        title="Ver información del objeto"
      >
        <Info size={20} />
        <span>Información</span>
      </button>

      {/* Botón Reiniciar */}
      <button
        type="button"
        className="ar-control-btn"
        onClick={onReset}
        aria-label="Reiniciar experiencia"
        title="Reiniciar experiencia AR"
      >
        <RotateCcw size={20} />
        <span>Reiniciar</span>
      </button>

      {/* Botón Ver Marcadores */}
      <button
        type="button"
        className="ar-control-btn icon-only"
        onClick={onToggleCardPreview}
        aria-label="Ver tarjetas de prueba"
        title="Ver tarjetas imprimibles"
      >
        <Image size={20} />
      </button>

      {/* Botón Sonido */}
      <button
        type="button"
        className="ar-control-btn icon-only"
        onClick={onToggleSound}
        aria-label={soundEnabled ? 'Silenciar sonido' : 'Activar sonido'}
        title={soundEnabled ? 'Silenciar sonido' : 'Activar sonido'}
      >
        {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
      </button>
    </div>
  );
}
