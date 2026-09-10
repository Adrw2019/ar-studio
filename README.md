# 🚀 AR Studio - Plataforma Web de Realidad Aumentada (Editor 3D + Player Móvil)

Plataforma web integral para **Crear, Editar, Guardar, Publicar y Ejecutar** proyectos educativos de **Realidad Aumentada** sobre tarjetas físicas impresas. Funciona en PC, laptops, tablets y celulares sin necesidad de instalar archivos APK.

---

## 🏗️ Arquitectura de los Módulos

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                                 AR STUDIO                                   │
├──────────────────────────────────────┬──────────────────────────────────────┤
│          AR STUDIO EDITOR            │              AR PLAYER               │
│   (PC / Laptop / Tablet / Celular)   │          (Tablet / Celular)          │
├──────────────────────────────────────┼──────────────────────────────────────┤
│ • Rutas:                             │ • Rutas:                             │
│   /studio                            │   /ar/:slug                          │
│   /studio/projects                   │   /ar/demo                           │
│   /studio/project/:id                │                                      │
│ • Interfaz PC (3 Áreas):             │ • Visión por Computadora (MindAR)    │
│   - Izquierda: Elementos y Tarjetas  │ • Anclaje 3D Estable (Three.js)      │
│   - Centro: Previsualización 3D      │ • Detección Multi-Marcador           │
│     (OrbitControls, Grid, sin cámara)│ • Interacción Táctil y Reglas        │
│   - Derecha: Inspector (X/Y/Z)       │ • Carga Dinámica desde Backend       │
│ • Interfaz Móvil/Tablet:             │                                      │
│   - Pestañas fluidas & Bottom Sheet  │                                      │
│ • Publicación y Generador QR en vivo │                                      │
│ • Auto-guardado en Backend           │                                      │
└──────────────────────────────────────┴──────────────────────────────────────┘
```

---

## 📱 Tecnologías

- **Frontend**: React 18, Vite 5, Three.js (r160+), OrbitControls, MindAR (`mind-ar`), QRCode.react, Lucide Icons, CSS responsive mobile-first.
- **Backend**: Node.js, Express, Helmet, CORS, Rate Limit, Multer.
- **Base de Datos**: PostgreSQL (`backend/database/schema.sql` con UUIDs y JSONB).

---

## ⚡ Rutas Principales de la Aplicación

| Ruta | Módulo | Descripción |
| :--- | :--- | :--- |
| `/` | **Landing Page** | Página de inicio con accesos rápidos a Studio y Player. |
| `/studio` | **Dashboard de Proyectos** | Crear, duplicar, eliminar, filtrar y publicar proyectos. |
| `/studio/project/:id` | **AR Studio Editor** | Editor 3D con 3 paneles en PC y pestañas en tablet/móvil. |
| `/ar/:slug` | **AR Player Dinámico** | Ejecuta la experiencia AR leyendo la configuración guardada. |
| `/ar/demo` | **AR Player Demo** | Experiencia de prueba con el motor y módulo de energía. |
| `/tools/compiler` | **Compilador .mind** | Compilador integrado en el navegador para generar archivos `.mind`. |

---

## 🛠️ Instalación y Ejecución

### 1. Instalar dependencias
```bash
npm run install:all
```

### 2. Ejecutar Servidor Backend
```bash
npm run dev:backend
```
- API en: `http://localhost:5000` (Health check: `http://localhost:5000/api/health`)

### 3. Ejecutar Frontend
```bash
npm run dev:frontend
```
- Aplicación disponible en: `http://localhost:5173`

*(O ambos a la vez desde la raíz con `npm run dev`).*

---

## 🔒 Acceso desde Celular o Tablet (Cámara y HTTPS)

Los navegadores móviles requieren **HTTPS** para habilitar la cámara trasera:
1. En tu computadora, inicia un túnel seguro con **localtunnel** o **ngrok**:
   ```bash
   npx localtunnel --port 5173
   ```
2. Abre la URL HTTPS generada en el navegador de tu celular (ej. `https://xxxx.loca.lt/ar/motor-electrico`).
3. Concede el permiso de cámara y enfoca la tarjeta impresa.

---

## 🗄️ Base de Datos PostgreSQL

Ejecuta el script SQL DDL para crear las tablas y datos semilla iniciales:
```bash
createdb -U postgres ar_studio
psql -U postgres -d ar_studio -f backend/database/schema.sql
```
*(Si PostgreSQL no está iniciado, el backend operará de forma transparente en modo memoria/fallback sin interrumpir el desarrollo).*

---

## 📂 Organización de Archivos

- **Modelos 3D (.glb, .gltf)**: `frontend/public/models/` o subidos mediante el modal del Editor (`backend/uploads/`).
- **Tarjetas / Marcadores (.png, .svg)**: `frontend/public/markers/` o generados con el visor imprimible.
- **Archivo Binario MindAR (.mind)**: `frontend/public/markers/targets.mind` (o generado con `/tools/compiler`).
