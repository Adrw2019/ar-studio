import React from 'react';
import { Scan, CheckCircle2, AlertCircle, Zap } from 'lucide-react';

export default function MarkerStatus({ status, activeMarkerName, interactionMessage }) {
  // Estados posibles: 'searching', 'detected', 'lost', 'interaction'

  if (status === 'interaction' && interactionMessage) {
    return (
      <div className="ar-status-container">
        <div className="marker-status-badge status-interaction">
          <Zap size={18} className="animate-spin-slow" />
          <span>{interactionMessage}</span>
        </div>
      </div>
    );
  }

  if (status === 'detected') {
    return (
      <div className="ar-status-container">
        <div className="marker-status-badge status-detected">
          <div className="status-dot" />
          <CheckCircle2 size={16} />
          <span>Tarjeta detectada{activeMarkerName ? `: ${activeMarkerName}` : ''}</span>
        </div>
      </div>
    );
  }

  if (status === 'lost') {
    return (
      <div className="ar-status-container">
        <div className="marker-status-badge status-lost">
          <div className="status-dot" />
          <AlertCircle size={16} />
          <span>Tarjeta no visible</span>
        </div>
      </div>
    );
  }

  // Default: searching
  return (
    <div className="ar-status-container">
      <div className="marker-status-badge status-searching">
        <div className="status-dot" />
        <Scan size={16} />
        <span>Buscando tarjeta...</span>
      </div>
    </div>
  );
}
