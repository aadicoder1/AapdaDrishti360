"""
AapdaDrishti — Phase 4 (v3): Immobility Scoring + Disaster-Aware Model Switching +
Explainable Priority + Privacy-Conscious Evidence + Benchmarking
--------------------------------------------------------------------------------
  1. Immobility scoring — tracks centroid displacement over time; a person who
     hasn't moved in N seconds gets a priority boost (possible injury/unconscious).
  2. Disaster-type model switching — only the model(s) relevant to the selected
     disaster type load and run per frame, instead of every model running
     concurrently. Cuts CPU load substantially vs. running everything at once.
  3. Fire/smoke — pretrained YOLO model, run every N frames (cached in between).
     Fire proximity/severity math reworked: fire in-frame with a person is
     treated as a real hazard regardless of exact pixel distance to the
     flame's bounding box edge.
  4. Flood/water — pretrained YOLOv8n water-detection model (local weights).
  5. Thermal — pretrained thermal-person model (HUMAN class) for night/
     low-visibility rescue.
  6. Debris/partial-exposure — self-trained YOLOv8n model (fine-tuned on the
     VictimDet composite dataset) for earthquake/collapsed-structure scenes.
     Validated ONLY on synthetic composite images so far (mAP50 0.995) —
     real rubble footage validation is pending. Do not claim this mode is
     field-ready until real-footage testing confirms it. See README 6a.
  7. Aerial-accuracy note — see NOTE block near model load; yolov8n.pt is COCO-
     trained (ground-level people), so test recall on real aerial footage
     before trusting this on drone-angle video.
  8. Explainable priority — case_log stores the per-component point breakdown.
  9. Privacy-conscious evidence — optional face-blur mode, no face recognition
     of any kind, and a retention-note stub in the case log.
  10. Benchmarking hooks — real FPS is measured and logged.

Usage:
    python detect.py --source path/to/video.mp4 --disaster-type fire
    python detect.py --source path/to/video.mp4 --disaster-type flood
    python detect.py --source path/to/video.mp4 --disaster-type night
    python detect.py --source path/to/video.mp4 --disaster-type accident
    python detect.py --source path/to/video.mp4 --disaster-type earthquake
    python detect.py --source 0 --disaster-type accident   # webcam
"""

import argparse
import json
import os
import time
import math
from datetime import datetime
from collections import defaultdict, deque

import cv2
import numpy as np
from ultralytics import YOLO
from huggingface_hub import hf_hub_download


# ---------- Simulated drone parameters ----------
DRONE_START_LAT = 30.2842
DRONE_START_LON = 78.9820
DRONE_ALTITUDE_M = 30
CAMERA_FOV_DEGREES = 60
DRIFT_PER_FRAME = 0.0000015

# ---------- Evidence capture tuning ----------
STABLE_FRAMES_REQUIRED = 5
FRAME_BUFFER_SIZE = 8
CROP_PADDING_RATIO = 0.4
CLUSTER_DISTANCE_PX = 150
EVIDENCE_IMG_SIZE = 400
MIN_BOX_HEIGHT_RATIO = 0.15

# ---------- Immobility scoring ----------
MOTION_HISTORY_SECONDS = 45
MOTION_HISTORY_MAXLEN = 400
STILLNESS_PX_THRESHOLD = 12
MIN_HISTORY_FOR_STILLNESS_CLAIM = 10
WEIGHT_IMMOBILITY = 20

# ---------- Priority scoring weights ----------
WEIGHT_CONFIDENCE = 15
WEIGHT_GROUP_SIZE = 10
WEIGHT_EXPOSURE = 20
WEIGHT_TIME_UNVERIFIED = 10
WEIGHT_FIRE_SMOKE = 45   # raised — fire near a person is a dominant risk
                          # factor and should be able to push priority into
                          # HIGH/CRITICAL on its own, not just nudge it
WEIGHT_FLOOD = 25         # flood proximity contributes but less dominantly than active fire

PRIORITY_COLOURS = {
    "CRITICAL": (0, 0, 255),
    "HIGH": (0, 128, 255),
    "MEDIUM": (0, 220, 255),
    "LOW": (0, 200, 0),
}

# ---------- Fire/smoke model ----------
FIRE_SMOKE_MODEL_REPO = "SalahALHaismawi/yolov26-fire-detection"
FIRE_SMOKE_MODEL_FILE = "best.pt"
FIRE_SMOKE_CONF = 0.25
HAZARD_INFER_EVERY_N_FRAMES = 5   # frame-skip: hazards don't change fast, saves CPU

# Proximity radii expressed as a ratio of frame diagonal, not fixed pixels —
# so behaviour is consistent regardless of source resolution.
FIRE_PROXIMITY_RATIO = 0.35
FIRE_SEVERITY_FLOOR = 0.6   # any fire match in-frame is treated as at least this severe
SMOKE_PROXIMITY_RATIO = 0.15
FLOOD_PROXIMITY_RATIO = 0.30

# ---------- Flood/water model ----------
# duchieu260503/Flood-detection (GitHub) ships best.pt directly in-repo.
FLOOD_MODEL_LOCAL_PATH = "models/flood.pt"

# ---------- Thermal model ----------
THERMAL_MODEL_REPO = "pitangent-ds/YOLOv8-human-detection-thermal"
THERMAL_MODEL_FILE = "model.pt"

# ---------- Debris/partial-exposure model (self-trained) ----------
# Fine-tuned YOLOv8n on the VictimDet composite dataset via Colab.
# Validation metrics (composite val set): mAP50 0.995, mAP50-95 0.963,
# precision 0.997, recall 0.996 — measured on SYNTHETIC composite images,
# not yet confirmed on real rubble/debris footage. See README Section 6a.
DEBRIS_MODEL_LOCAL_PATH = "models/debris.pt"

# ---------- Disaster-type → model-set mapping ----------
# Only the model(s) listed for the selected disaster type are loaded and run.
# "person_mode" selects which person-detector to use (rgb, thermal, or debris).
# "hazard" selects which secondary hazard model to run (or None to skip
# hazard detection entirely, saving that model's CPU cost outright).
DISASTER_MODEL_SETS = {
    "fire":       {"person_mode": "rgb",     "hazard": "fire_smoke"},
    "flood":      {"person_mode": "rgb",     "hazard": "flood"},
    "night":      {"person_mode": "thermal", "hazard": None},
    "accident":   {"person_mode": "rgb",     "hazard": None},
    "earthquake": {"person_mode": "debris",  "hazard": None},
}

# NOTE ON AERIAL ACCURACY (read before demo):
# yolov8n.pt ships pretrained on COCO, which is almost entirely ground-level,
# front/side-facing people. A drone's top-down/oblique view is a domain shift.
# Recall may be materially lower on real aerial footage than on webcam test
# clips. Verify against real aerial/drone footage before finals; do not claim
# aerial accuracy you haven't verified. Same caveat applies to the thermal
# model (verified on ground-level thermal footage only) and the debris model
# (verified on synthetic composite images only).


def pixel_to_gps_offset(px_x, px_y, frame_w, frame_h, altitude, fov_deg):
    fov_rad = math.radians(fov_deg)
    ground_width_m = 2 * altitude * math.tan(fov_rad / 2)
    meters_per_pixel = ground_width_m / frame_w
    dx_px = px_x - (frame_w / 2)
    dy_px = px_y - (frame_h / 2)
    return dx_px * meters_per_pixel, dy_px * meters_per_pixel


def meters_to_latlon_offset(dx_m, dy_m, base_lat):
    meters_per_deg_lat = 111320
    meters_per_deg_lon = 111320 * math.cos(math.radians(base_lat))
    return dy_m / meters_per_deg_lat, dx_m / meters_per_deg_lon


def estimate_error_radius(px_x, px_y, frame_w, frame_h):
    center_x, center_y = frame_w / 2, frame_h / 2
    max_dist = math.hypot(center_x, center_y)
    dist_from_center = math.hypot(px_x - center_x, px_y - center_y)
    base_error, max_extra_error = 8, 17
    ratio = dist_from_center / max_dist if max_dist > 0 else 0
    return round(base_error + (ratio * max_extra_error), 1)


def sharpness_score(image):
    if image is None or image.size == 0:
        return 0
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    return cv2.Laplacian(gray, cv2.CV_64F).var()


def cluster_people(people):
    clusters = []
    used = set()
    for p1 in people:
        if p1["track_id"] in used:
            continue
        cluster = [p1]
        used.add(p1["track_id"])
        for p2 in people:
            if p2["track_id"] in used:
                continue
            dist = math.hypot(p1["px_x"] - p2["px_x"], p1["px_y"] - p2["px_y"])
            if dist <= CLUSTER_DISTANCE_PX:
                cluster.append(p2)
                used.add(p2["track_id"])
        clusters.append(cluster)
    return clusters


def get_square_crop(frame, x1, y1, x2, y2, padding_ratio, target_size):
    h, w = frame.shape[:2]
    box_w, box_h = x2 - x1, y2 - y1
    cx, cy = (x1 + x2) / 2, (y1 + y2) / 2

    side = max(box_w, box_h) * (1 + padding_ratio)
    half = side / 2

    sx1, sy1 = cx - half, cy - half
    sx2, sy2 = cx + half, cy + half

    if sx1 < 0:
        sx2 -= sx1
        sx1 = 0
    if sy1 < 0:
        sy2 -= sy1
        sy1 = 0
    if sx2 > w:
        sx1 -= (sx2 - w)
        sx2 = w
    if sy2 > h:
        sy1 -= (sy2 - h)
        sy2 = h

    sx1, sy1 = max(0, int(sx1)), max(0, int(sy1))
    sx2, sy2 = min(w, int(sx2)), min(h, int(sy2))

    crop = frame[sy1:sy2, sx1:sx2]
    if crop.size == 0:
        return None

    ch, cw = crop.shape[:2]
    if ch != cw:
        size = max(ch, cw)
        square = np.zeros((size, size, 3), dtype=np.uint8)
        y_off, x_off = (size - ch) // 2, (size - cw) // 2
        square[y_off:y_off + ch, x_off:x_off + cw] = crop
        crop = square

    return cv2.resize(crop, (target_size, target_size))


def is_valid_box(box_w, box_h, frame_h):
    if box_h < frame_h * MIN_BOX_HEIGHT_RATIO:
        return False
    if box_w <= 0 or box_h <= 0:
        return False
    aspect = box_h / box_w
    if aspect > 6 or aspect < 0.3:
        return False
    return True


def visible_body_exposure_score(box_w, box_h, frame_h):
    """
    If the detection box is small relative to frame height (a tight/partial
    crop rather than a full-body read at reasonable scale), we don't have
    enough of the body visible to make an exposure/injury claim either way —
    return a neutral-low score instead of letting aspect-ratio math misread
    "zoomed in" as "obscured."
    """
    if box_w == 0:
        return 0.5

    if box_h < frame_h * 0.25:
        return 0.3  # neutral-low, not an injury signal either way

    ratio = box_h / box_w
    FULL_VISIBILITY_RATIO = 2.4
    if ratio >= FULL_VISIBILITY_RATIO:
        return 0.1
    risk = 1 - (ratio / FULL_VISIBILITY_RATIO)
    return round(min(max(risk, 0), 1), 2)


# ---------- Immobility tracking ----------

def update_motion_history(motion_history, track_id, px_x, px_y, now):
    hist = motion_history[track_id]
    hist.append((now, px_x, px_y))
    cutoff = now - MOTION_HISTORY_SECONDS
    while hist and hist[0][0] < cutoff:
        hist.popleft()


def compute_stillness(motion_history, track_id):
    hist = motion_history[track_id]
    if len(hist) < MIN_HISTORY_FOR_STILLNESS_CLAIM:
        return False, 0.0, "insufficient_history"

    span_seconds = hist[-1][0] - hist[0][0]
    if span_seconds < MOTION_HISTORY_SECONDS * 0.5:
        return False, 0.0, "insufficient_span"

    xs = [p[1] for p in hist]
    ys = [p[2] for p in hist]
    x0, y0 = xs[0], ys[0]
    max_disp = max(math.hypot(x - x0, y - y0) for x, y in zip(xs, ys))

    if max_disp <= STILLNESS_PX_THRESHOLD:
        return True, round(span_seconds, 1), "stable"
    return False, 0.0, "moved"


# ---------- Hazard detection (fire/smoke, flood) ----------

def load_fire_smoke_model():
    print(f"Loading fire/smoke detection model ({FIRE_SMOKE_MODEL_REPO})...")
    model_path = hf_hub_download(repo_id=FIRE_SMOKE_MODEL_REPO, filename=FIRE_SMOKE_MODEL_FILE)
    model = YOLO(model_path)
    print(f"Fire/smoke model classes: {model.names}")
    return model


def load_flood_model():
    if not os.path.exists(FLOOD_MODEL_LOCAL_PATH):
        print(f"WARNING: flood model not found at {FLOOD_MODEL_LOCAL_PATH}.")
        print("Download best.pt from https://github.com/duchieu260503/Flood-detection")
        print(f"and place it at {FLOOD_MODEL_LOCAL_PATH}. Flood detection will be disabled.")
        return None
    print(f"Loading flood/water detection model ({FLOOD_MODEL_LOCAL_PATH})...")
    model = YOLO(FLOOD_MODEL_LOCAL_PATH)
    print(f"Flood model classes: {model.names}")
    return model


def detect_hazard_regions(frame, hazard_model, hazard_type):
    """
    Runs the active hazard model (fire/smoke or flood) on a frame and returns
    regions in a uniform (label, box, note) shape regardless of which model
    produced them, so downstream code (person_near_hazard, drawing, scoring)
    doesn't need to know which hazard type is active.
    """
    if hazard_model is None:
        return []

    flagged_regions = []
    results = hazard_model(frame, conf=FIRE_SMOKE_CONF, verbose=False)[0]

    for box in results.boxes:
        cls_id = int(box.cls[0])
        conf = float(box.conf[0])
        x1, y1, x2, y2 = map(int, box.xyxy[0])
        class_name = hazard_model.names.get(cls_id, "").lower()

        if hazard_type == "fire_smoke":
            if "fire" in class_name:
                label = "possible_fire"
            elif "smoke" in class_name:
                label = "possible_smoke"
            else:
                continue
        elif hazard_type == "flood":
            label = "flood_water"
        else:
            continue

        flagged_regions.append((label, (x1, y1, x2, y2), f"conf={conf:.2f}"))

    return flagged_regions


def person_near_hazard(person_box, hazard_regions, frame_w, frame_h):
    """
    Proximity is relative to frame diagonal, not a fixed pixel count — so
    behaviour is consistent regardless of source resolution.

    Fire gets a wide, forgiving proximity radius and a severity FLOOR on any
    match: being in the same frame as active fire is itself dangerous, and
    precise pixel-distance-to-flame-edge is not a reliable proxy for real
    safety margin. Smoke and flood remain distance-scaled since they're more
    diffuse/ambiguous hazards.
    """
    frame_diag = math.hypot(frame_w, frame_h)
    fire_proximity_px = frame_diag * FIRE_PROXIMITY_RATIO
    smoke_proximity_px = frame_diag * SMOKE_PROXIMITY_RATIO
    flood_proximity_px = frame_diag * FLOOD_PROXIMITY_RATIO

    px1, py1, px2, py2 = person_box
    p_cx, p_cy = (px1 + px2) / 2, (py1 + py2) / 2
    matches = []

    for label, (hx1, hy1, hx2, hy2), note in hazard_regions:
        nearest_x = max(hx1, min(p_cx, hx2))
        nearest_y = max(hy1, min(p_cy, hy2))
        dist = math.hypot(p_cx - nearest_x, p_cy - nearest_y)

        if label == "possible_fire":
            if dist <= fire_proximity_px:
                severity = max(FIRE_SEVERITY_FLOOR, 1 - (dist / fire_proximity_px))
                matches.append((label, severity))
        elif label == "possible_smoke":
            if dist <= smoke_proximity_px:
                severity = 1 - (dist / smoke_proximity_px)
                matches.append((label, severity))
        elif label == "flood_water":
            if dist <= flood_proximity_px:
                severity = 1 - (dist / flood_proximity_px)
                matches.append((label, severity))

    return matches


# ---------- Priority scoring (explainable) ----------

def compute_priority(avg_confidence, group_size, avg_exposure_risk, seconds_unverified,
                      near_hazard_labels, is_still):
    """
    near_hazard_labels is a list of (label, severity) tuples, severity 0..1
    based on proximity. Fire is weighted heaviest and floored, since active
    fire near a person is a dominant, immediate life-safety risk that should
    be able to push a case into HIGH/CRITICAL on its own.
    """
    breakdown = {}
    breakdown["confidence_pts"] = round(avg_confidence * WEIGHT_CONFIDENCE, 1)
    breakdown["group_pts"] = round(min(group_size - 1, 4) * WEIGHT_GROUP_SIZE, 1)
    breakdown["exposure_pts"] = round(avg_exposure_risk * WEIGHT_EXPOSURE, 1)
    breakdown["time_pts"] = round(min(seconds_unverified / 30, 1) * WEIGHT_TIME_UNVERIFIED, 1)

    hazard_pts = 0
    if near_hazard_labels:
        has_fire = any(label == "possible_fire" for label, _ in near_hazard_labels)
        has_flood = any(label == "flood_water" for label, _ in near_hazard_labels)
        max_severity = max(severity for _, severity in near_hazard_labels)

        if has_fire:
            hazard_pts = round(max_severity * WEIGHT_FIRE_SMOKE, 1)
        elif has_flood:
            hazard_pts = round(max_severity * WEIGHT_FLOOD, 1)
        else:  # smoke only
            hazard_pts = round(max_severity * (WEIGHT_FIRE_SMOKE * 0.5), 1)

    breakdown["hazard_pts"] = hazard_pts
    breakdown["immobility_pts"] = WEIGHT_IMMOBILITY if is_still else 0

    score = round(min(sum(breakdown.values()), 100), 1)

    if score >= 75:
        label = "CRITICAL"
    elif score >= 50:
        label = "HIGH"
    elif score >= 25:
        label = "MEDIUM"
    else:
        label = "LOW"
    return score, label, breakdown


def stamp_priority_banner(image, priority_label, priority_score, people_count, is_still, stillness_seconds):
    img = image.copy()
    h, w = img.shape[:2]
    colour = PRIORITY_COLOURS.get(priority_label, (200, 200, 200))
    banner_h = max(int(h * 0.14), 30)

    overlay = img.copy()
    cv2.rectangle(overlay, (0, 0), (w, banner_h), colour, -1)
    img = cv2.addWeighted(overlay, 0.85, img, 0.15, 0)

    text = f"{priority_label}  {priority_score}/100  |  {people_count} person(s)"
    font_scale = max(w / 700, 0.5)
    cv2.putText(img, text, (8, int(banner_h * 0.7)),
                cv2.FONT_HERSHEY_SIMPLEX, font_scale, (255, 255, 255), 2)

    if is_still:
        still_text = f"NOT MOVING - {int(stillness_seconds)}s"
        cv2.putText(img, still_text, (8, int(banner_h * 0.7) + int(20 * font_scale)),
                    cv2.FONT_HERSHEY_SIMPLEX, font_scale * 0.7, (255, 255, 255), 1)
        banner_h = int(banner_h * 1.35)
        overlay2 = img.copy()
        cv2.rectangle(overlay2, (0, 0), (w, banner_h), colour, -1)
        img = cv2.addWeighted(overlay2, 0.85, img, 0.15, 0)
        cv2.putText(img, text, (8, int(h * 0.14 * 0.7)),
                    cv2.FONT_HERSHEY_SIMPLEX, font_scale, (255, 255, 255), 2)
        cv2.putText(img, still_text, (8, int(h * 0.14 * 0.7) + int(22 * font_scale)),
                    cv2.FONT_HERSHEY_SIMPLEX, font_scale * 0.7, (255, 255, 255), 1)

    cv2.rectangle(img, (0, 0), (w - 1, h - 1), colour, 4)
    return img


def blur_faces_in_crop(crop_bgr, face_cascade):
    if face_cascade is None:
        return crop_bgr
    gray = cv2.cvtColor(crop_bgr, cv2.COLOR_BGR2GRAY)
    faces = face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(20, 20))
    out = crop_bgr.copy()
    for (fx, fy, fw, fh) in faces:
        roi = out[fy:fy+fh, fx:fx+fw]
        if roi.size == 0:
            continue
        blurred = cv2.GaussianBlur(roi, (0, 0), sigmaX=15)
        out[fy:fy+fh, fx:fx+fw] = blurred
    return out


# ---------- Person model loading ----------

def load_debris_model():
    """
    Loads the self-trained debris/partial-exposure model (fine-tuned YOLOv8n
    on the VictimDet composite dataset). Single-class model — no class
    filtering needed. See README Section 6a for validation status/caveats.
    """
    if not os.path.exists(DEBRIS_MODEL_LOCAL_PATH):
        print(f"WARNING: debris model not found at {DEBRIS_MODEL_LOCAL_PATH}.")
        print("Earthquake/debris detection will be disabled.")
        return None
    print(f"Loading debris/partial-exposure detection model ({DEBRIS_MODEL_LOCAL_PATH})...")
    print("NOTE: this model is validated on synthetic composite images only "
          "(mAP50 0.995) — real rubble footage performance is unverified.")
    model = YOLO(DEBRIS_MODEL_LOCAL_PATH)
    print(f"Debris model classes: {model.names}")
    return model


def load_detection_model(person_mode):
    """
    Loads the RGB (COCO person), thermal (HUMAN), or debris (self-trained,
    partial-exposure) model depending on person_mode. Returns
    (model, class_filter). class_filter is auto-detected from the thermal
    model's own class list instead of assumed, so a wrong hardcoded index
    can't silently filter out every detection. The debris model is
    single-class, so no filter is needed there.
    """
    if person_mode == "thermal":
        print(f"Loading thermal detection model ({THERMAL_MODEL_REPO})...")
        model_path = hf_hub_download(repo_id=THERMAL_MODEL_REPO, filename=THERMAL_MODEL_FILE)
        model = YOLO(model_path)

        class_names = model.names  # e.g. {0: "HUMAN"}
        human_class_ids = [k for k, v in class_names.items() if "human" in v.lower()]
        class_filter = human_class_ids if human_class_ids else None
        print(f"Thermal model classes: {class_names} | using class filter: {class_filter}")
        return model, class_filter

    elif person_mode == "debris":
        model = load_debris_model()
        if model is None:
            print("ERROR: earthquake mode selected but debris model failed to load. Exiting.")
            raise SystemExit(1)
        return model, None  # single-class model, no filtering needed

    else:
        print("Loading RGB detection model (yolov8n.pt)...")
        # NOTE: yolov8n.pt is COCO-trained (ground-level people) — see aerial-accuracy note near top of file
        model = YOLO("models/yolov8n.pt")
        return model, [0]  # COCO person class


def load_hazard_model(hazard_type):
    """
    Loads only the hazard model relevant to the selected disaster type, or
    returns None if the disaster type has no hazard model (e.g. 'accident',
    'night', 'earthquake') — meaning that model's CPU cost is never paid at
    all, not just skipped-per-frame.
    """
    if hazard_type == "fire_smoke":
        return load_fire_smoke_model()
    elif hazard_type == "flood":
        return load_flood_model()
    else:
        return None


def save_case_log(case_log, output_path="rescue_cases.json"):
    """Writes case_log to structured JSON so it can be consumed by the
    relocation-planning dashboard as a separate panel. GPS coordinates here
    are DRONE-SIMULATION coordinates (see DRONE_START_LAT/LON), not real
    telemetry - flagged explicitly so this is never mistaken for live data."""
    serializable = []
    for case in case_log:
        c = dict(case)
        c["track_ids"] = list(c["track_ids"])  # tuple -> list for JSON
        c["location_source"] = "simulated_drone_coordinates_anchored_near_Rudraprayag"
        serializable.append(c)

    with open(output_path, "w") as f:
        json.dump(serializable, f, indent=2)
    print(f"\nSaved {len(serializable)} cases to {output_path}")


def run_detection(source, output_path="output_annotated.mp4", conf_threshold=0.4,
                   evidence_dir="evidence", blur_faces=False, disaster_type="accident"):
    model_set = DISASTER_MODEL_SETS[disaster_type]
    person_mode = model_set["person_mode"]
    hazard_type = model_set["hazard"]

    model, class_filter = load_detection_model(person_mode)
    hazard_model = load_hazard_model(hazard_type)

    face_cascade = None
    if blur_faces:
        cascade_path = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
        face_cascade = cv2.CascadeClassifier(cascade_path)
        if face_cascade.empty():
            print("WARNING: could not load face cascade, --blur-faces will be a no-op")
            face_cascade = None

    cap = cv2.VideoCapture(source)
    if not cap.isOpened():
        print(f"ERROR: Could not open video source: {source}")
        return

    is_webcam = isinstance(source, int)
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    fourcc = cv2.VideoWriter_fourcc(*"mp4v")
    writer = None

    os.makedirs(evidence_dir, exist_ok=True)

    track_streak = defaultdict(int)
    track_first_seen = {}
    track_group_map = {}
    motion_history = defaultdict(lambda: deque(maxlen=MOTION_HISTORY_MAXLEN))

    cluster_buffers = defaultdict(lambda: deque(maxlen=FRAME_BUFFER_SIZE))

    last_hazard_regions = []  # cache for frame-skipped hazard inference

    case_log = []
    frame_count = 0
    processed_frame_times = deque(maxlen=60)
    start_time = time.time()
    drone_lat, drone_lon = DRONE_START_LAT, DRONE_START_LON

    source_fps = cap.get(cv2.CAP_PROP_FPS)
    target_frame_time = (1.0 / source_fps) if (not is_webcam and source_fps and source_fps > 0) else None

    print(f"Starting detection on: {source} | disaster type: {disaster_type} "
          f"(person: {person_mode}, hazard: {hazard_type or 'none'})")
    if blur_faces:
        print("Face-blur mode: ON (evidence images will have faces blurred, no identification performed)")
    print("-" * 50)

    while True:
        frame_start = time.time()
        ret, frame = cap.read()
        if not ret:
            print("-" * 50)
            print(f"Footage ended (or could not be read) after {frame_count} frames.")
            break

        frame_count += 1
        now = time.time()
        drone_lat += DRIFT_PER_FRAME
        drone_lon += DRIFT_PER_FRAME * 0.6

        # Hazard inference (if this disaster type has one) is frame-skipped
        # to keep CPU load down — hazards don't change fast enough
        # frame-to-frame to need every-frame inference.
        if hazard_model is not None and frame_count % HAZARD_INFER_EVERY_N_FRAMES == 0:
            last_hazard_regions = detect_hazard_regions(frame, hazard_model, hazard_type)
        hazard_regions = last_hazard_regions if hazard_model is not None else []

        for label, (hx1, hy1, hx2, hy2), note in hazard_regions:
            if label == "possible_fire":
                colour = (0, 100, 255)
            elif label == "possible_smoke":
                colour = (150, 150, 150)
            else:  # flood_water
                colour = (255, 140, 0)
            cv2.rectangle(frame, (hx1, hy1), (hx2, hy2), colour, 2)
            cv2.putText(frame, f"{label}? ({note})", (hx1, max(hy1 - 8, 15)),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, colour, 1)

        results = model.track(
            frame, classes=class_filter, conf=conf_threshold,
            persist=True, verbose=False, tracker="bytetrack.yaml"
        )

        boxes = results[0].boxes
        people = []

        if boxes is not None:
            for box in boxes:
                x1, y1, x2, y2 = map(int, box.xyxy[0])
                confidence = float(box.conf[0])
                track_id = int(box.id[0]) if box.id is not None else -1
                if track_id == -1:
                    continue

                track_streak[track_id] += 1
                if track_id not in track_first_seen:
                    track_first_seen[track_id] = now

                exposure_risk = visible_body_exposure_score(x2 - x1, y2 - y1, height)
                hazard_matches = person_near_hazard((x1, y1, x2, y2), hazard_regions, width, height)
                valid = is_valid_box(x2 - x1, y2 - y1, height)

                px_x, px_y = (x1 + x2) / 2, y2
                update_motion_history(motion_history, track_id, px_x, px_y, now)

                people.append({
                    "track_id": track_id, "box": (x1, y1, x2, y2),
                    "px_x": px_x, "px_y": px_y, "confidence": confidence,
                    "exposure_risk": exposure_risk, "hazard_matches": hazard_matches,
                    "valid": valid
                })

        clusters = cluster_people(people)

        for cluster in clusters:
            cluster_ids = tuple(sorted(p["track_id"] for p in cluster))
            already_saved = any(tid in track_group_map for tid in cluster_ids)
            min_streak = min(track_streak[p["track_id"]] for p in cluster)
            is_stabilizing = not already_saved and min_streak < STABLE_FRAMES_REQUIRED
            colour = (0, 255, 255) if not already_saved else (0, 255, 0)

            for p in cluster:
                x1, y1, x2, y2 = p["box"]
                cv2.rectangle(frame, (x1, y1), (x2, y2), colour, 2)

            gx1 = min(p["box"][0] for p in cluster)
            gy1 = min(p["box"][1] for p in cluster)
            gx2 = max(p["box"][2] for p in cluster)
            gy2 = max(p["box"][3] for p in cluster)
            status = "STABILIZING" if is_stabilizing else ("SAVED" if already_saved else "CAPTURING")
            cv2.rectangle(frame, (gx1 - 10, gy1 - 10), (gx2 + 10, gy2 + 10), colour, 1)
            cv2.putText(frame, f"Group of {len(cluster)} | {status}", (gx1, max(gy1 - 25, 20)),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.6, colour, 2)

            all_valid = all(p["valid"] for p in cluster)
            if all_valid:
                sharp = sharpness_score(frame[max(gy1,0):gy2, max(gx1,0):gx2])
                cluster_buffers[cluster_ids].append({
                    "frame": frame.copy(), "gx1": gx1, "gy1": gy1, "gx2": gx2, "gy2": gy2,
                    "sharpness": sharp, "people_snapshot": cluster
                })

            if not already_saved and min_streak >= STABLE_FRAMES_REQUIRED and cluster_buffers[cluster_ids]:
                for tid in cluster_ids:
                    track_group_map[tid] = cluster_ids

                best = max(cluster_buffers[cluster_ids], key=lambda s: s["sharpness"])
                best_cluster = best["people_snapshot"]

                square_crop = get_square_crop(
                    best["frame"], best["gx1"], best["gy1"], best["gx2"], best["gy2"],
                    CROP_PADDING_RATIO, EVIDENCE_IMG_SIZE
                )
                if square_crop is None:
                    continue

                if blur_faces:
                    square_crop = blur_faces_in_crop(square_crop, face_cascade)

                center_px_x = (best["gx1"] + best["gx2"]) / 2
                center_px_y = best["gy2"]
                avg_confidence = sum(p["confidence"] for p in best_cluster) / len(best_cluster)
                avg_exposure = sum(p["exposure_risk"] for p in best_cluster) / len(best_cluster)
                all_hazard_matches = [h for p in best_cluster for h in p["hazard_matches"]]

                earliest_seen = min(track_first_seen[tid] for tid in cluster_ids)
                seconds_unverified = now - earliest_seen

                stillness_results = [compute_stillness(motion_history, tid) for tid in cluster_ids]
                group_is_still = all(r[0] for r in stillness_results) and len(stillness_results) > 0
                group_stillness_seconds = min((r[1] for r in stillness_results), default=0.0) if group_is_still else 0.0

                priority_score, priority_label, breakdown = compute_priority(
                    avg_confidence, len(best_cluster), avg_exposure,
                    seconds_unverified, all_hazard_matches, group_is_still
                )

                final_image = stamp_priority_banner(
                    square_crop, priority_label, priority_score, len(best_cluster),
                    group_is_still, group_stillness_seconds
                )

                dx_m, dy_m = pixel_to_gps_offset(center_px_x, center_px_y, width, height,
                                                  DRONE_ALTITUDE_M, CAMERA_FOV_DEGREES)
                d_lat, d_lon = meters_to_latlon_offset(dx_m, dy_m, drone_lat)
                est_lat, est_lon = drone_lat + d_lat, drone_lon + d_lon
                error_radius_m = estimate_error_radius(center_px_x, center_px_y, width, height)

                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                filename = f"{evidence_dir}/case_group{'_'.join(map(str, cluster_ids))}_{timestamp}.jpg"
                cv2.imwrite(filename, final_image)

                hazard_labels_only = [h for h, _ in all_hazard_matches]

                case_log.append({
                    "people_count": len(best_cluster), "track_ids": cluster_ids,
                    "confidence": round(avg_confidence, 2), "exposure_risk": round(avg_exposure, 2),
                    "hazard_flags": list(set(hazard_labels_only)),
                    "priority_score": priority_score, "priority_label": priority_label,
                    "priority_breakdown": breakdown,
                    "is_still": group_is_still,
                    "stillness_seconds": round(group_stillness_seconds, 1),
                    "evidence_file": filename, "estimated_lat": round(est_lat, 6),
                    "estimated_lon": round(est_lon, 6), "error_radius_m": error_radius_m,
                    "faces_blurred": bool(blur_faces),
                    "disaster_type": disaster_type,
                    "retention_note": "human_verification_required_before_dispatch",
                })

                hazard_note = f" | HAZARD FLAG: {set(hazard_labels_only)}" if hazard_labels_only else ""
                still_note = f" | STILL for {group_stillness_seconds:.0f}s" if group_is_still else ""
                print(f"[NEW CASE] Group of {len(best_cluster)} | conf {avg_confidence:.2f} | "
                      f"PRIORITY: {priority_label} ({priority_score}) [{breakdown}] | "
                      f"location ({est_lat:.6f}, {est_lon:.6f}) ± {error_radius_m}m"
                      f"{hazard_note}{still_note} -> {filename}")

        cv2.putText(frame, f"Frame: {frame_count} | People: {len(people)} | Cases: {len(case_log)} | Type: {disaster_type}",
                    (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)

        if writer is None:
            elapsed = time.time() - start_time
            measured_fps = frame_count / elapsed if elapsed > 0 else 15
            real_fps = max(5, min(measured_fps, 30)) if is_webcam else (cap.get(cv2.CAP_PROP_FPS) or 20)
            writer = cv2.VideoWriter(output_path, fourcc, real_fps, (width, height))

        writer.write(frame)
        cv2.imshow("AapdaDrishti - Square Evidence (press q to quit)", frame)

        processed_frame_times.append(time.time() - frame_start)
        if frame_count % 60 == 0 and processed_frame_times:
            avg_frame_time = sum(processed_frame_times) / len(processed_frame_times)
            live_fps = 1.0 / avg_frame_time if avg_frame_time > 0 else 0
            print(f"  [benchmark] frame {frame_count}: {live_fps:.1f} FPS (avg over last {len(processed_frame_times)} frames), "
                  f"{len(people)} people this frame")

        # Pace playback to match source video's real FPS (skip for webcam)
        if target_frame_time is not None:
            elapsed_this_frame = time.time() - frame_start
            sleep_time = target_frame_time - elapsed_this_frame
            if sleep_time > 0:
                time.sleep(sleep_time)

        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    cap.release()
    if writer:
        writer.release()
    cv2.destroyAllWindows()

    total_elapsed = time.time() - start_time
    overall_fps = frame_count / total_elapsed if total_elapsed > 0 else 0

    print("-" * 50)
    print(f"Done. Total cases: {len(case_log)}")
    print(f"Overall throughput: {overall_fps:.1f} FPS over {frame_count} frames in {total_elapsed:.1f}s")
    print("\nCase summary (sorted by priority):")
    for case in sorted(case_log, key=lambda c: -c["priority_score"]):
        
        hazard_note = f" | hazard: {case['hazard_flags']}" if case["hazard_flags"] else ""
        still_note = f" | still: {case['stillness_seconds']}s" if case["is_still"] else ""
        print(f"  - [{case['priority_label']} {case['priority_score']}] "
              f"{case['people_count']} people, ({case['estimated_lat']}, {case['estimated_lon']}) "
              f"± {case['error_radius_m']}m{hazard_note}{still_note}")
        print(f"      breakdown: {case['priority_breakdown']}")
    save_case_log(case_log, output_path=os.path.join(evidence_dir, "rescue_cases.json"))

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="AapdaDrishti Phase 4 v3 - Disaster-Aware Model Switching + Explainable Priority")
    parser.add_argument("--source", type=str, required=True)
    parser.add_argument("--output", type=str, default="output_annotated.mp4")
    parser.add_argument("--conf", type=float, default=0.4)
    parser.add_argument("--evidence-dir", type=str, default="evidence")
    parser.add_argument("--blur-faces", action="store_true",
                         help="Blur detected faces in saved evidence images (privacy mode)")
    parser.add_argument("--disaster-type", type=str, default="accident",
                         choices=list(DISASTER_MODEL_SETS.keys()),
                         help="Selects which model set to load: fire, flood, night, accident, or earthquake. "
                              "Only relevant models load and run, reducing CPU load vs. running everything.")
    args = parser.parse_args()

    source = 0 if args.source == "0" else args.source
    run_detection(source, args.output, args.conf, args.evidence_dir, args.blur_faces, args.disaster_type)