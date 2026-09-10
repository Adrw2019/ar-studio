import fs from 'fs';
import path from 'path';

const svgMotor = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 800" width="600" height="800">
  <rect width="600" height="800" fill="#ffffff" stroke="#0f172a" stroke-width="16" />
  
  <!-- Header -->
  <text x="40" y="70" font-family="Arial, sans-serif" font-weight="900" font-size="28" fill="#0f172a">AR STUDIO</text>
  <text x="560" y="70" font-family="Arial, sans-serif" font-weight="700" font-size="22" fill="#0284c7" text-anchor="end">TARJETA 1</text>
  <line x1="40" y1="95" x2="560" y2="95" stroke="#e2e8f0" stroke-width="4" />

  <!-- Center Graphic: Motor Target -->
  <g transform="translate(100, 150)">
    <rect width="400" height="450" rx="20" fill="#f8fafc" stroke="#cbd5e1" stroke-width="4" />
    
    <!-- Outer concentric tracking rings -->
    <circle cx="200" cy="225" r="160" fill="#0f172a" />
    <circle cx="200" cy="225" r="130" fill="#ffffff" />
    <circle cx="200" cy="225" r="95" fill="#0284c7" />
    
    <!-- Asymmetrical high-contrast tracking patterns -->
    <rect x="180" y="75" width="40" height="300" fill="#0f172a" rx="10" />
    <rect x="50" y="205" width="300" height="40" fill="#0f172a" rx="10" />
    
    <circle cx="200" cy="225" r="45" fill="#f59e0b" />
    <circle cx="200" cy="225" r="18" fill="#ffffff" />

    <!-- Corner Fiducials -->
    <rect x="25" y="25" width="40" height="40" fill="#0f172a" />
    <polygon points="375,25 335,65 375,65" fill="#0f172a" />
    <circle cx="355" cy="415" r="22" fill="#0f172a" />
    <rect x="25" y="385" width="40" height="40" rx="12" fill="#0f172a" />
  </g>

  <!-- Title & Description -->
  <text x="300" y="660" font-family="Arial, sans-serif" font-weight="900" font-size="34" fill="#0f172a" text-anchor="middle">MOTOR ELÉCTRICO</text>
  <text x="300" y="700" font-family="Arial, sans-serif" font-weight="500" font-size="18" fill="#64748b" text-anchor="middle">Alinea con la tarjeta de Energía para activar</text>

  <!-- Footer -->
  <line x1="40" y1="740" x2="560" y2="740" stroke="#e2e8f0" stroke-width="4" />
  <text x="300" y="775" font-family="Arial, sans-serif" font-weight="700" font-size="14" fill="#94a3b8" text-anchor="middle" letter-spacing="2">CIENCIAS FÍSICAS • EXPERIMENTO AR</text>
</svg>`;

const svgEnergy = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 800" width="600" height="800">
  <rect width="600" height="800" fill="#ffffff" stroke="#0f172a" stroke-width="16" />
  
  <!-- Header -->
  <text x="40" y="70" font-family="Arial, sans-serif" font-weight="900" font-size="28" fill="#0f172a">AR STUDIO</text>
  <text x="560" y="70" font-family="Arial, sans-serif" font-weight="700" font-size="22" fill="#10b981" text-anchor="end">TARJETA 2</text>
  <line x1="40" y1="95" x2="560" y2="95" stroke="#e2e8f0" stroke-width="4" />

  <!-- Center Graphic: Energy Target -->
  <g transform="translate(100, 150)">
    <rect width="400" height="450" rx="20" fill="#f8fafc" stroke="#cbd5e1" stroke-width="4" />
    
    <!-- Diamonds & Asymmetrical polygons -->
    <polygon points="200,30 370,225 200,420 30,225" fill="#0f172a" />
    <polygon points="200,70 330,225 200,380 70,225" fill="#10b981" />
    <polygon points="200,110 290,225 200,340 110,225" fill="#ffffff" />
    
    <!-- Lightning bolt symbol -->
    <path d="M215 130 L165 230 L210 230 L185 320 L250 210 L205 210 Z" fill="#f59e0b" stroke="#0f172a" stroke-width="6" />

    <!-- Corner Fiducials -->
    <circle cx="45" cy="45" r="22" fill="#0f172a" />
    <rect x="335" y="25" width="40" height="40" fill="#0f172a" />
    <polygon points="45,425 25,385 65,385" fill="#0f172a" />
    <rect x="335" y="385" width="40" height="40" rx="20" fill="#0f172a" />
  </g>

  <!-- Title & Description -->
  <text x="300" y="660" font-family="Arial, sans-serif" font-weight="900" font-size="34" fill="#0f172a" text-anchor="middle">FUENTE DE ENERGÍA</text>
  <text x="300" y="700" font-family="Arial, sans-serif" font-weight="500" font-size="18" fill="#64748b" text-anchor="middle">Suministro de 24V DC para el circuito</text>

  <!-- Footer -->
  <line x1="40" y1="740" x2="560" y2="740" stroke="#e2e8f0" stroke-width="4" />
  <text x="300" y="775" font-family="Arial, sans-serif" font-weight="700" font-size="14" fill="#94a3b8" text-anchor="middle" letter-spacing="2">CIENCIAS FÍSICAS • EXPERIMENTO AR</text>
</svg>`;

const markersDir = path.resolve('public/markers');
fs.mkdirSync(markersDir, { recursive: true });

fs.writeFileSync(path.join(markersDir, 'card-motor.svg'), svgMotor);
fs.writeFileSync(path.join(markersDir, 'card-energy.svg'), svgEnergy);

console.log('✅ Tarjetas vectoriales generadas en public/markers/ (card-motor.svg y card-energy.svg)');
