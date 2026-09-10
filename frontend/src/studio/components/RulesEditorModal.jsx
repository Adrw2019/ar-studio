import React, { useState } from 'react';
import { X, Zap, Plus, Trash2, CheckCircle2 } from 'lucide-react';

export default function RulesEditorModal({
  isOpen,
  onClose,
  markers = [],
  interactions = [],
  onSaveInteractions
}) {
  if (!isOpen) return null;

  const [localRules, setLocalRules] = useState(() => JSON.parse(JSON.stringify(interactions || [])));

  const handleAddRule = () => {
    const newRule = {
      id: `interaction-${Date.now()}`,
      name: 'Nueva Regla Multi-Tarjeta',
      trigger_type: 'multi_marker',
      trigger_config: {
        required_markers: markers.slice(0, 2).map(m => m.name)
      },
      action_type: 'start_motor',
      action_config: {
        title: '⚡ ¡Interacción Activada!',
        message: 'Las tarjetas interactuaron correctamente.',
        sound_effect: '/audio/motor-hum.mp3'
      }
    };
    setLocalRules([...localRules, newRule]);
  };

  const handleRemoveRule = (index) => {
    const updated = [...localRules];
    updated.splice(index, 1);
    setLocalRules(updated);
  };

  const handleRuleChange = (index, field, value) => {
    const updated = [...localRules];
    updated[index][field] = value;
    setLocalRules(updated);
  };

  const handleActionConfigChange = (index, configKey, value) => {
    const updated = [...localRules];
    updated[index].action_config = {
      ...(updated[index].action_config || {}),
      [configKey]: value
    };
    setLocalRules(updated);
  };

  const handleToggleMarkerRequirement = (ruleIndex, markerName) => {
    const updated = [...localRules];
    const currentList = updated[ruleIndex].trigger_config?.required_markers || [];
    let newList;
    if (currentList.includes(markerName)) {
      newList = currentList.filter(m => m !== markerName);
    } else {
      newList = [...currentList, markerName];
    }
    updated[ruleIndex].trigger_config = {
      ...updated[ruleIndex].trigger_config,
      required_markers: newList
    };
    setLocalRules(updated);
  };

  const handleSave = () => {
    onSaveInteractions(localRules);
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '560px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Zap size={22} color="var(--accent-amber)" />
            <h2>Reglas Multi-Tarjeta</h2>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose} aria-label="Cerrar">
            <X size={20} />
          </button>
        </div>

        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
          Configura qué ocurre cuando la cámara detecta dos o más tarjetas físicas simultáneamente sobre la mesa.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '55vh', overflowY: 'auto' }}>
          {localRules.map((rule, idx) => {
            const reqMarkers = rule.trigger_config?.required_markers || [];

            return (
              <div
                key={rule.id || idx}
                style={{
                  background: 'rgba(0, 0, 0, 0.4)',
                  border: '1px solid var(--border-glass)',
                  borderRadius: '16px',
                  padding: '1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <input
                    type="text"
                    value={rule.name}
                    onChange={(e) => handleRuleChange(idx, 'name', e.target.value)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-primary)',
                      fontFamily: 'var(--font-display)',
                      fontWeight: 700,
                      fontSize: '0.95rem',
                      outline: 'none'
                    }}
                  />
                  <button
                    type="button"
                    style={{ background: 'transparent', border: 'none', color: 'var(--accent-rose)', cursor: 'pointer' }}
                    onClick={() => handleRemoveRule(idx)}
                    title="Eliminar regla"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                {/* Selección de marcadores requeridos */}
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>
                    Tarjetas Requeridas (deben verse a la vez):
                  </label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {markers.map((m) => {
                      const isChecked = reqMarkers.includes(m.name);
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => handleToggleMarkerRequirement(idx, m.name)}
                          style={{
                            background: isChecked ? 'rgba(0, 242, 254, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                            border: `1px solid ${isChecked ? 'var(--accent-cyan)' : 'var(--border-glass)'}`,
                            color: isChecked ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                            borderRadius: '8px',
                            padding: '0.35rem 0.65rem',
                            fontSize: '0.8rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.3rem'
                          }}
                        >
                          {isChecked && <CheckCircle2 size={13} />}
                          <span>{m.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Mensaje al activarse */}
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>
                    Mensaje en pantalla al completar interacción:
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    value={rule.action_config?.message || ''}
                    onChange={(e) => handleActionConfigChange(idx, 'message', e.target.value)}
                    placeholder="Ej: ⚡ ¡Circuito completado! Motor encendido"
                  />
                </div>
              </div>
            );
          })}

          <button
            type="button"
            className="btn btn-secondary"
            style={{ borderStyle: 'dashed' }}
            onClick={handleAddRule}
          >
            <Plus size={16} />
            <span>Agregar Nueva Regla de Interacción</span>
          </button>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
          <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={onClose}>
            Cancelar
          </button>
          <button type="button" className="btn btn-primary" style={{ flex: 1 }} onClick={handleSave}>
            Guardar Reglas
          </button>
        </div>
      </div>
    </div>
  );
}
