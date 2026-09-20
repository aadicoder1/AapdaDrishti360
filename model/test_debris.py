from ultralytics import YOLO
import cv2

model = YOLO("models/debris.pt")
cap = cv2.VideoCapture("Sample_videos/debris.mp4")

while True:
    ret, frame = cap.read()
    if not ret:
        print("Video ended")
        break
    results = model(frame, conf=0.4, verbose=False)
    annotated = results[0].plot()
    cv2.imshow("VictimDet Test", annotated)
    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()