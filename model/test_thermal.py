from huggingface_hub import hf_hub_download
from ultralytics import YOLO
import cv2

# Download the pretrained thermal model (only happens once, then it's cached)
model_path = hf_hub_download(
    repo_id="pitangent-ds/YOLOv8-human-detection-thermal",
    filename="model.pt"
)
model = YOLO(model_path)

# Run it on your thermal video
cap = cv2.VideoCapture("Sample_videos/thermalimaging.mp4")

while True:
    ret, frame = cap.read()
    if not ret:
        print("Video ended")
        break

    results = model(frame, conf=0.5, verbose=False)
    annotated = results[0].plot()

    cv2.imshow("Thermal Detection Test", annotated)
    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()