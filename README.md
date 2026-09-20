# 🌍 AapdaDrishti 360

**AI + GIS Powered Disaster Risk, Relocation & Rescue Decision Support System**

AapdaDrishti 360 is an integrated disaster-management platform designed to identify vulnerable habitations, classify hazard-based red zones, evaluate relocation sites, assess evacuation routes, and support post-disaster rescue operations.

The system combines **GIS analysis, demographic data, hazard intelligence, route feasibility, and AI-assisted drone analysis** into a unified decision-support workflow.

> **Core principle:** Planning reduces disaster exposure. Rescue handles the residual risk that remains.

---

## 🎯 Problem Statement

Disaster-prone habitations require more than simply identifying hazardous areas.

Authorities need to answer:

- Which villages are most vulnerable?
- Which areas should be classified as red zones?
- Where can affected populations be safely relocated?
- Can proposed relocation sites support the required population?
- Which evacuation routes are currently feasible?
- What happens if the primary route becomes blocked?
- How can survivors be identified and prioritized after a disaster?

AapdaDrishti 360 connects these problems into one decision-support platform.

---

## 🧩 System Architecture

```text
                    DATA SOURCES
                         │
        ┌────────────────┼────────────────┐
        │                │                │
       DEM              OSM            Census
        │                │                │
        └────────────────┼────────────────┘
                         │
                  Hazard Layers
                         │
                         ▼
              ┌────────────────────┐
              │   Geospatial DB    │
              │ PostgreSQL/PostGIS │
              └─────────┬──────────┘
                        │
          ┌─────────────┼─────────────┐
          ▼             ▼             ▼
     Red-Zone      Vulnerability   Relocation
   Classification     Scoring      Suitability
          │             │             │
          └─────────────┼─────────────┘
                        ▼
               Carrying Capacity
                        │
                        ▼
                Route Feasibility
                        │
                        ▼
              React + Leaflet Map

        Independent Rescue Pipeline
                    │
              Drone Footage
                    │
                  YOLOv8
                    │
                 ByteTrack
                    │
             Human Verification
                    │
                    ▼
             Rescue Dashboard
```

---

# 🔥 Core Modules

## 1. Hazard-Based Red Zones

Habitations are classified according to factors such as:

- Hazard intensity
- Terrain/elevation
- Disaster history
- Population exposure
- Accessibility

The architecture is **hazard-agnostic**.

```text
hazard_type =
landslide |
flood |
cloudburst |
coastal_erosion
```

Hazard logic is parameterized rather than hardcoded for one disaster type.

The current demonstration focuses deeply on **landslide and cloudburst risk**, while the same architecture can be extended to additional hazards and regions.

---

## 2. Vulnerability Scoring

Each habitation receives a vulnerability score using factors such as:

```text
Hazard Exposure
      +
Population Vulnerability
      +
Terrain Risk
      +
Accessibility
      +
Historical Disaster Risk
```

This allows villages to be ranked according to relocation urgency.

---

## 3. Relocation Site Suitability

Potential relocation locations are evaluated using:

- Hazard safety
- Elevation
- Available space
- Accessibility
- Distance from vulnerable habitations
- Road connectivity

The system then ranks suitable relocation sites.

---

## 4. Carrying Capacity Assessment

A relocation site is not considered useful simply because it is safe.

AapdaDrishti also estimates whether the site can accommodate the population requiring relocation.

```text
Safe Site
    +
Usable Area
    +
Population Requirement
    ↓
Estimated Carrying Capacity
```

Estimated or simulated capacity values are explicitly labeled.

---

## 5. Route Feasibility

The system evaluates routes between vulnerable habitations and proposed relocation sites.

Routes can be scored using factors such as:

- Hazard exposure
- Road availability
- Terrain
- Distance
- Known obstruction
- Drone/field verification

If a route becomes unsafe, the architecture supports **alternate-route planning**.

---

# 🚁 AI-Assisted Rescue Module

The rescue system is an **independent module** and is not presented as an output of the relocation algorithm.

It reuses the existing computer-vision detection pipeline.

### Pipeline

```text
RGB / Thermal Drone Footage
            │
            ▼
          YOLOv8
            │
      Person Detection
            │
            ▼
         ByteTrack
            │
      Survivor Tracking
            │
            ▼
    Duplicate Prevention
            │
            ▼
      Priority Assessment
            │
            ▼
     Human Verification
            │
            ▼
       Rescue Dispatch
```

Every rescue case includes an explicit association note:

> **"Nearest-village proximity match, NOT a claim of red-zone linkage."**

This prevents survivor detections from being incorrectly presented as outputs of the red-zone or relocation models.

---

## 🧠 AI / Computer Vision Models

| Model | Purpose |
|---|---|
| YOLOv8 | Person / object detection |
| ByteTrack | Multi-frame survivor tracking |
| Thermal detection models | Detection support in thermal footage |
| Fire / smoke models | Disaster-scene analysis |

The rescue system supports **RGB and thermal footage** where compatible data is available.

---

# 🗺️ Data Sources

| Source | Usage |
|---|---|
| SRTM / Copernicus DEM | Elevation and terrain |
| OpenStreetMap | Roads and buildings |
| Census of India 2011 | Population |
| GSI | Hazard information |
| Bhuvan | Geospatial / satellite information |
| Drone footage | Route and rescue verification |

Real, estimated, simulated, and manually digitized data are explicitly distinguished in the system.

---

# ⚠️ Important System Separation

The project contains two connected but conceptually separate workflows.

### Proactive Risk & Relocation

```text
Hazard
   ↓
Red Zone
   ↓
Vulnerability
   ↓
Relocation Site
   ↓
Capacity
   ↓
Safe Route
```

### Disaster Rescue

```text
Drone Feed
    ↓
Detection
    ↓
Tracking
    ↓
Human Verification
    ↓
Rescue Support
```

The rescue panel is **not claimed to be generated by the relocation algorithm**.

This separation keeps the system technically and scientifically honest.

---

# 🌊 Multi-Hazard Architecture

The system does not hardcode the scoring engine exclusively for landslides.

Core processing functions accept:

```python
hazard_type
```

Possible values include:

```text
landslide
flood
cloudburst
coastal_erosion
```

The current prototype goes deeper on selected hazards within one demonstration region to prove the complete pipeline using available data.

Additional hazards and regions are deployment extensions rather than separate architectures.

---

# 🛠️ Tech Stack

### Geospatial Processing

- Python
- GeoPandas
- Shapely
- OSMnx
- Rasterio

### AI / Computer Vision

- YOLOv8
- ByteTrack
- Hugging Face Model Hub
- Thermal detection models
- Fire / smoke detection models

### Backend

- FastAPI
- PostgreSQL
- PostGIS

### Frontend

- React
- Vite
- Leaflet

### Deployment

- Docker
- Docker Compose

---

# 📁 Suggested Project Structure

```text
AapdaDrishti360/
│
├── backend/
│   ├── api/
│   ├── models/
│   ├── services/
│   ├── database/
│   └── main.py
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── maps/
│   │   ├── services/
│   │   └── App.jsx
│   │
│   ├── public/
│   └── package.json
│
├── data/
│   ├── dem/
│   ├── osm/
│   ├── census/
│   ├── hazards/
│   └── processed/
│
├── rescue/
│   ├── detection/
│   ├── tracking/
│   └── models/
│
├── scripts/
├── docker-compose.yml
└── README.md
```

---

# 🔮 Future Scope

The following features are intentionally outside the current prototype scope:

### Community Participation
Resident feedback could improve relocation planning, but requires moderation and validation mechanisms.

### Livelihood-Aware Relocation

Future versions could consider:

- Employment
- Agriculture
- Schools
- Healthcare
- Local economic dependencies

Reliable datasets are currently a limitation.

### What-If Simulation

Future versions could simulate scenarios such as:

```text
What if rainfall increases?

What if a road becomes blocked?

What if village population increases?

What if the safest relocation site reaches capacity?
```

### Live Sensor & Weather Integration

Real-time:

- Rainfall
- River level
- Weather
- Landslide warnings
- IoT sensors

can be integrated when reliable APIs/data feeds are available.

### Additional Hazard Types

The same architecture can be extended to:

- Flood
- Coastal erosion
- Cyclones
- Storm surge
- Additional regional hazards

---

# 🎤 Judge Q&A

### Is this live data?

It depends on the module.

DEM, road, and population datasets use real sources. Some hazard geometries and site-capacity values may be estimated or demonstration-scoped and are explicitly labeled.

### Why have a rescue module if the system predicts risk beforehand?

Risk prediction reduces exposure but cannot eliminate all disaster risk.

The relocation workflow handles **preparedness**, while the rescue module supports **response when people remain affected**.

### Is the drone autonomous?

No.

The prototype uses **recorded or simulated drone footage**. Real deployment would use operator-controlled drones with appropriate permissions.

### Why demonstrate only selected hazards?

The architecture is hazard-agnostic.

```python
hazard_type = "landslide"
```

can conceptually be replaced with other supported hazard types without redesigning the complete platform.

The prototype prioritizes depth by demonstrating the complete pipeline for selected hazards in a specific region.

---

# ⚙️ Frontend Setup

The frontend uses **React + Vite**.

### Install Dependencies

```bash
cd frontend
npm install
```

### Start Development Server

```bash
npm run dev
```

Vite will display the local development URL in the terminal.

---

# ⚙️ Backend Setup

Navigate to the backend:

```bash
cd backend
```

Create a Python virtual environment:

```bash
python -m venv venv
```

Activate it on Windows:

```bash
venv\Scripts\activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Run FastAPI:

```bash
uvicorn main:app --reload
```

API documentation will be available through FastAPI's Swagger interface once the backend is running.

---

# 🐳 Docker Deployment

The final system is planned to support Docker Compose:

```bash
docker compose up --build
```

This will eventually orchestrate:

```text
Frontend
   │
FastAPI
   │
PostgreSQL + PostGIS
   │
GIS / AI Services
```

---


## 🌍 AapdaDrishti 360

**From identifying risk → planning relocation → finding safe routes → supporting rescue.**

Built as an integrated decision-support system for disaster preparedness, relocation, and emergency response.
