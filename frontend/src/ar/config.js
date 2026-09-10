/**
 * AR Studio - Configuración de Marcadores y Reglas de Interacción
 * Estructura extensible para proyectos educativos y multi-marcador
 */

export const demoMarkers = [
  {
    id: 0,
    name: "Motor",
    targetIndex: 0,
    modelUrl: "/models/motor.glb",
    previewImage: "/markers/card-motor.png",
    scale: [0.75, 0.75, 0.75],
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    info: {
      title: "Motor Eléctrico de Inducción",
      category: "Electromagnetismo",
      description: "Dispositivo que transforma energía eléctrica en movimiento mecánico rotatorio mediante campos magnéticos alternos.",
      details: [
        "Componentes: Estator fijo y Rotor giratorio.",
        "Principio: Ley de inducción de Faraday y Fuerza de Lorentz.",
        "Aplicación: Vehículos eléctricos, turbinas y robótica industrial."
      ]
    }
  },
  {
    id: 1,
    name: "Energía",
    targetIndex: 1,
    modelUrl: "/models/energy.glb",
    previewImage: "/markers/card-energy.png",
    scale: [0.75, 0.75, 0.75],
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    info: {
      title: "Módulo de Energía y Batería",
      category: "Fuentes de Poder",
      description: "Acumulador químico capaz de suministrar voltaje y corriente continua para alimentar circuitos y actuadores.",
      details: [
        "Voltaje nominal: 12V / 24V DC.",
        "Función: Provee el flujo de electrones requerido por el bobinado del motor.",
        "Interacción: Al alinearse con el Motor, cierra el circuito y activa el giro."
      ]
    }
  }
];

export const interactionRules = [
  {
    id: "motor_circuit_activation",
    name: "Activación de Motor por Circuito",
    requiredMarkers: ["Motor", "Energía"],
    action: "startMotor",
    title: "⚡ ¡Circuito Cerrado!",
    message: "La fuente de energía ha suministrado corriente al motor. ¡Motor encendido a 3000 RPM!",
    soundEffect: "/audio/motor-hum.mp3"
  }
];
