# AapdaDrishti
### AI-Powered Disaster Victim Detection & Rescue Alert System
*Smart India Hackathon 2026 — Software Track*

---

## 1. What This Project Is

AapdaDrishti is a **software-only** system that takes video (from a webcam, a video file, or in future a real drone RTSP feed) and turns it into structured, prioritized rescue alerts.

**It is NOT:**
- A drone-building or drone-control project
- A system that flies, navigates, or gives commands to a drone
- A hardware project

**It IS:**
- A detection + tracking + geolocation + dashboard pipeline
- Disaster-aware: operator selects the disaster type (fire, flood, night/low-visibility, accident), and only the relevant detection model(s) load and run — not every model running concurrently
- Drone-agnostic by design: works on any video input, live or recorded
- A web application (backend API + React dashboard) with an AI detection engine feeding it

**One-line description:**
A web dashboard where disaster video is analyzed in real time — every detected person is boxed, tracked, geolocated (with honest uncertainty), evidence-logged, priority-ranked, and shown as a live rescue alert on a map.

---

## 2. Why This Exists / Problem Statement

During floods, landslides, earthquakes, and mass-accidents, drones are already used for aerial search — but a human operator has to watch the video feed manually to spot survivors. This causes:
- Missed detections due to fatigue, night, smoke, fog
- Slow, imprecise conversion of "I saw someone" into an actual rescue coordinate
- Duplicate searching of the same area by multiple teams
- No structured record of what's been detected/verified

AapdaDrishti removes the "tired human watching a screen" bottleneck.

---

## 3. Explicit Scope Decisions (read this before suggesting features)

- **No real drone available or required.** All video input is either a webcam feed (for live demo) or recorded/public SAR video/image datasets. The architecture is designed so a real drone's RTSP+GPS feed could be swapped in later with no redesign — but we are not building that integration now.
- **GPS/location is simulated**, using assumed altitude + assumed camera GPS + pixel-position trigonometry (adapted conceptually from open-source UAV geolocation approaches) to produce an estimated lat/lon **with an explicit error radius**. We never claim false precision.
- **We do NOT claim to detect people through walls, rubble, or concrete.** RGB and thermal cameras only detect visible or partially-exposed people/heat signatures. For fully buried victims, the system's role is limited to flagging probable search zones for radar/acoustic/canine ground teams — this is stated explicitly in all materials. See Section 6a for our self-trained partial-exposure model, which is still bound by this same limitation.
- **Human verification is mandatory before any dispatch action.** The AI flags "possible survivor," never a confirmed/autonomous decision.
- Do not suggest MAVLink, PX4, Gazebo, ArduPilot, or any flight-control integration — those were considered in earlier planning and explicitly dropped from scope.
- **ESP32-class microcontrollers cannot run this system.** No modern object-detection model runs on ESP32-class hardware — insufficient RAM and no GPU. Do not propose this as a deployment target.

---

## 4. Tech Stack (locked — do not suggest alternatives without strong reason)

| Layer | Choice | Notes |
|---|---|---|
| Detection (person) | YOLOv8n (Ultralytics) | Pretrained COCO "person" class for RGB; pretrained thermal model for night/low-vis; self-trained model for debris/partial-exposure scenarios |
| Detection (hazard) | Pretrained YOLO models, disaster-type dependent | Fire+smoke model for fire scenarios; flood/water model for flood scenarios; no hazard model for accident/night |
| Tracking | Ultralytics built-in tracker (ByteTrack) | `model.track()` — gives persistent ID per person automatically |
| CV utils | OpenCV | Frame handling, drawing boxes |
| Backend | FastAPI | REST endpoints + WebSocket for live push |
| Database | SQLite | No setup overhead; sufficient for hackathon demo scale |
| Frontend | React + Leaflet | Live map with pins, case list sidebar |
| AI text feature (stretch) | Free-tier LLM API (Gemini or Groq) | Generates scene description / first-responder checklist per case |
| Deployment (demo) | Local machine / single laptop | No cloud dependency required for demo |
| Deployment (target, unverified) | Drone-attached edge compute (e.g. Jetson-class hardware) | Architecturally ready since the pipeline is source-agnostic — not yet tested on real edge hardware |

---

## 5. Build Phases

- **Phase 1 — Detection core:** YOLOv8 on video/webcam, draw boxes, print confidence. ✅ DONE
- **Phase 2 — Tracking + evidence capture:** Enable tracker, persistent ID per person, save screenshot + timestamp on new ID only. ✅ DONE
- **Phase 3 — Simulated geolocation:** Pixel position + assumed altitude/GPS + trigonometry → estimated lat/lon + error radius per case. ✅ DONE
- **Phase 4 — Priority scoring + disaster-aware detection:** ✅ DONE
  - Weighted priority formula (confidence + group size + exposure risk + time-unverified + hazard proximity + immobility) → CRITICAL/HIGH/MEDIUM/LOW
  - Immobility scoring — flags sustained stillness as a possible injury/unconsciousness signal
  - Disaster-type model switching — `--disaster-type` flag (fire / flood / night / accident) loads only the relevant model set, keeping CPU load down
  - Fire/smoke detection upgraded from an HSV color heuristic to a pretrained model, with severity scoring reworked so in-frame fire near a person reliably scores HIGH/CRITICAL
  - Self-trained debris/partial-exposure detection model (see Section 6a) — **validation on real (non-composite) footage in progress, not yet confirmed demo-ready**
- **Phase 5 — Backend:** FastAPI + SQLite storing cases, `/cases` endpoint, WebSocket push. **NOT STARTED**
- **Phase 6 — Dashboard:** React + Leaflet map, case list, evidence thumbnails, verify button, live updates. **NOT STARTED**
- **Phase 7 — AI checklist (stretch):** LLM call per detection generating scene description + responder checklist. **NOT STARTED**
- **Phase 8 — Offline-sync + polish:** Simulate network drop → local queue → sync on reconnect. Rehearse demo clips. **NOT STARTED**

**Do not skip ahead of the current phase or introduce phase 6+ concerns while working on phase 5, unless explicitly asked.**

---

## 6. Standout / Differentiating Features (the "why we win" features)

1. **Uncertainty-aware geolocation** — never a false-precision pin, always shown with error radius
2. **Priority scoring** — ranks who to reach first, not just a flat list of detections
3. **Duplicate-free case tracking** — one persistent ID per person, not repeated alerts
4. **Offline-first sync** — works when disaster-zone networks fail, syncs later (planned, Phase 8)
5. **Evidence-backed alerts** — every case has image + timestamp + confidence + location, auditable
6. **AI-generated scene description + rescue checklist** (stretch) — turns a detection into an actionable report
7. **Source-agnostic ingestion** — same pipeline for webcam, video file, or (future) real drone feed
8. **Disaster-aware model switching** — the system loads only the model(s) relevant to the selected disaster type instead of running every model concurrently, keeping it usable on ordinary hardware
9. **Self-trained partial-exposure detection model** (see 6a) — a genuine research + engineering effort where no adequate public model existed

### 6a. Self-Trained Model — Debris/Partial-Exposure Detection

Standard COCO-trained person detectors (including our own RGB model) perform poorly on people partially buried or obscured by rubble — this is a documented, known gap, not a guess. We researched public pretrained options extensively (VictimDet, Post-Disaster-Dataset, RescueNet, multiple Roboflow-hosted models) and found no production-ready, freely-downloadable model that reliably addressed this.

Rather than leave this gap unaddressed or overclaim an unsuitable general-purpose model, we fine-tuned our own YOLOv8n model using the VictimDet dataset (harmonious composite victim-in-rubble images; Zhang et al., *Remote Sensing* 2022) via Google Colab's free GPU tier:
- 2,558 training images, 451 held-out validation images (self-split, since the original dataset's validation folder was empty)
- 50 training epochs, single class (`person`)
- **Measured validation metrics: mAP50 0.995, mAP50-95 0.963, precision 0.997, recall 0.996**

**Important honesty note, stated here deliberately:** these metrics are measured on the composite validation set, which shares the same synthetic generation method as the training data. They demonstrate the model learned the training distribution well — they are **not yet evidence of real-world performance** on genuine rubble/debris footage. Real-footage validation is in progress. This model and its real-world results should only be presented to judges once that validation is complete and the actual (likely different, possibly lower) real-footage numbers are in hand. Do not quote the 0.995 figure as a general-purpose accuracy claim.

The model detects a single class (`person`/partial-exposure) — it does not sub-classify into categories like "exposed hand" vs. "full body." Any such distinction was not part of the training setup and should not be claimed.

---

## 7. Explicitly Descoped / Not Building

- Live environmental/damage mapping (roads, structural collapse mapping) — noted as future work only
- Any drone flight control, autonomous routing, or multi-drone coordination
- Claims of detecting people fully buried behind walls/concrete/rubble — only visible or partially-exposed people/heat signatures, ever
- ESP32 or other microcontroller-class deployment — insufficient compute for any modern object-detection model
- Mobile app deployment — technically possible via model export (ONNX/TFLite) but is a separate engineering track not undertaken in this build

---

## 8. Business Model / Market Fit

A purely social-good framing is hard to monetize directly, so the business case rests on three tiers, ordered by how directly they connect to what's actually built:

**a) Industrial and high-risk-site rescue readiness (primary, most concrete)**
Tunnel construction, coal mining, and similar high-risk industrial sites face exactly the "partially-buried/obscured victim" scenario our self-trained model targets — most visibly demonstrated by real incidents like the 2023 Silkyara tunnel collapse (Uttarakhand), where 41 workers were trapped for 17 days. These sites are a plausible, recurring B2B customer base: mining companies, construction/infrastructure firms, and industrial safety contractors could deploy this as part of on-site emergency response readiness, independent of any large-scale natural disaster.

**b) Subscription/licensing to disaster-management bodies (scaling story)**
A subscription or licensing model offered to bodies such as India's National Disaster Management Authority (NDMA) or state disaster management authorities, positioned around measurable gaps in current response time and search coverage. This is a standard B2G (business-to-government) SaaS pattern. **Honesty note:** AapdaDrishti does not currently ingest or analyze historical national disaster-loss statistics — any such data used in a pitch deck for market context should be sourced from public NDMA data and clearly presented as market research, not as a live feature of the software.

**c) Community/volunteer coordination platform (long-term vision, not a current build target)**
A future community page enabling volunteering, donations of food/rations, and crowd-coordination during active response. This is a substantial separate build (payment handling, verification, trust/fraud safeguards) with little technical overlap with the detection pipeline itself. Mentioned as long-term vision only — not part of the current architecture, roadmap, or demo.

---

## 9. Context for AI Assistant

When helping with this project going forward:
- Assume this README has already been read — don't re-ask about scope, stack, or whether we have a drone (we don't, by design).
- Default to the tech stack in Section 4 unless the user explicitly asks to change it.
- Follow the phase order in Section 5; if the user asks for phase N work, don't introduce phase N+1 complexity unprompted.
- Keep all claims technically honest per Section 3 and 6a — this project's credibility with judges depends on not overclaiming capability, especially regarding the self-trained model's unvalidated real-world performance.
- The user is a solo/small student team preparing for SIH 2026 finals, with real time constraints — prioritize working code over exhaustive feature coverage.
- Do not present the self-trained debris model's composite-validation metrics (mAP50 0.995 etc.) as general accuracy claims — always pair with the real-footage-validation caveat until that validation is actually complete.