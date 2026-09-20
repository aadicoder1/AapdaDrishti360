"""
drone_verify.py
Shared across regions - takes a drone video, samples frames, asks Gemini
per frame whether the road/bridge shows an obstruction. If blocked, calls
the same block-point reroute logic as manual verification, so drone
detection and manual clicks produce identical downstream behavior.

If every frame check fails (e.g. API error), this raises loudly instead
of silently reporting "clear" - a failed check is not the same as a
verified-safe road, and treating it that way would be actively dangerous
for a disaster-response tool.

Usage:
    python regions/drone_verify.py --region odisha --village Astaranga --site Bhubaneswar --lat 20.06 --lon 86.02 --video path/to/clip.mp4

Setup:
    pip install google-genai opencv-python --break-system-packages
    Set GEMINI_API_KEY as an environment variable (get a free key at https://aistudio.google.com/apikey)
"""

import argparse
import json
import os
import cv2
import requests
from google import genai
from google.genai import types

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
FRAME_SAMPLE_RATE = 1  # 1 frame per second
API_BASE = "http://127.0.0.1:8000"

PROMPT = """Does this road or bridge image show any obstruction that would block vehicle passage -
fallen tree, debris, flooding, collapsed/broken structure, landslide material, or similar?
Answer strictly as JSON with no other text: {"blocked": true/false, "reason": "short description", "confidence": "high/medium/low"}"""


def sample_frames(video_path, rate=FRAME_SAMPLE_RATE):
    """Extracts one frame per `rate` seconds from the video, returns list of JPEG bytes."""
    cap = cv2.VideoCapture(video_path)
    fps = cap.get(cv2.CAP_PROP_FPS) or 25
    frame_interval = max(1, int(fps * rate))

    frames = []
    idx = 0
    while True:
        ret, frame = cap.read()
        if not ret:
            break
        if idx % frame_interval == 0:
            ok, buf = cv2.imencode(".jpg", frame)
            if ok:
                frames.append(buf.tobytes())
        idx += 1
    cap.release()
    print(f"Sampled {len(frames)} frames from {video_path}")
    return frames


def check_frame(client, frame_bytes, frame_index):
    """Sends one frame to Gemini, returns parsed result dict.
    check_failed=True means the API call itself failed - NOT the same as
    'no obstruction found', and must never be treated as a safe result."""
    try:
        response = client.models.generate_content(
            model="gemini-3.6-flash",
            contents=[
                types.Part.from_bytes(data=frame_bytes, mime_type="image/jpeg"),
                PROMPT,
            ],
        )
        text = response.text.strip().replace("```json", "").replace("```", "").strip()
        result = json.loads(text)
        result["frame_index"] = frame_index
        result["check_failed"] = False
        return result
    except Exception as e:
        print(f"  Frame {frame_index}: check failed ({e})")
        return {"blocked": None, "reason": f"check_failed: {e}", "confidence": "low",
                "frame_index": frame_index, "check_failed": True}


def analyze_video(video_path):
    if not GEMINI_API_KEY:
        raise RuntimeError("GEMINI_API_KEY environment variable not set. Get a free key at https://aistudio.google.com/apikey")

    client = genai.Client(api_key=GEMINI_API_KEY)

    frames = sample_frames(video_path)
    if not frames:
        raise RuntimeError(f"No frames extracted from {video_path} - check the file is a valid video.")

    results = []
    all_failed = True
    for i, frame_bytes in enumerate(frames):
        print(f"  Checking frame {i+1}/{len(frames)}...")
        result = check_frame(client, frame_bytes, i)
        results.append(result)
        if not result["check_failed"]:
            all_failed = False
        if result.get("blocked"):
            print(f"  BLOCKED at frame {i}: {result['reason']} (confidence: {result['confidence']})")
            return result

    if all_failed:
        raise RuntimeError(
            "Every frame check failed (API error) - cannot determine block status. "
            "This is NOT a 'clear' result. Fix the API issue before trusting this route."
        )

    print("  No obstruction detected in any successfully-checked frame.")
    return {"blocked": False, "reason": "No obstruction detected", "confidence": "high", "frame_index": None}


def report_to_backend(region, village, site, lat, lon, result):
    """Feeds the drone detection result into the same block-point endpoint
    used by manual map clicks - identical downstream reroute behavior."""
    note = f"[drone_ai] {result['reason']} (confidence: {result['confidence']}, frame {result.get('frame_index')})"
    r = requests.post(f"{API_BASE}/{region}/verification/block-point", json={
        "village": village, "site": site, "lat": lat, "lon": lon,
        "note": note, "source": "drone_ai",
    })
    r.raise_for_status()
    return r.json()

def run_drone_check(region, village, site, lat, lon, video_path):
    """Importable entry point - used by both the CLI and the FastAPI upload endpoint."""
    result = analyze_video(video_path)
    if result["blocked"]:
        response = report_to_backend(region, village, site, lat, lon, result)
        return {"detection": result, "backend_response": response}
    return {"detection": result, "backend_response": None}


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--region", required=True)
    parser.add_argument("--village", required=True)
    parser.add_argument("--site", required=True)
    parser.add_argument("--lat", type=float, required=True)
    parser.add_argument("--lon", type=float, required=True)
    parser.add_argument("--video", required=True)
    args = parser.parse_args()

    output = run_drone_check(args.region, args.village, args.site, args.lat, args.lon, args.video)
    print("\nResult:")
    print(json.dumps(output, indent=2))