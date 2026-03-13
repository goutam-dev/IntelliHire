import base64
import os
import time
from collections import deque
from typing import Dict, List

import cv2
import numpy as np
from ultralytics import YOLO

from app import config


class ObjectDetectorEngine:
    def __init__(self):
        resolved_model_path = self._resolve_model_path(config.OBJECT_MODEL_PATH)
        self.model = YOLO(resolved_model_path)
        self.confidence_threshold = config.OBJECT_CONFIDENCE_THRESHOLD
        self.suspicious_objects = {
            k: v for k, v in config.SUSPICIOUS_OBJECTS.items() if v.get("enabled", True)
        }

    @staticmethod
    def _resolve_model_path(configured_path: str) -> str:
        if configured_path and os.path.exists(configured_path):
            return configured_path

        basename = os.path.basename(configured_path) if configured_path else ""
        if basename and os.path.exists(basename):
            return basename

        return "yolov8n.pt"


class ObjectMonitorSession:
    def __init__(self, engine: ObjectDetectorEngine):
        self.engine = engine
        self.detection_buffer = deque(maxlen=config.DETECTION_BUFFER_SIZE)
        self.last_alert_time: Dict[str, float] = {}
        self.violation_start_times: Dict[str, float] = {}
        self.violation_confirmation_time = config.VIOLATION_CONFIRMATION_TIME
        self.alert_cooldown = config.ALERT_COOLDOWN
        self._prev_stable_flags = {
            "no_person": False,
            "multiple_people": False,
            "objects": set(),
        }

    def analyze_frame(self, frame: np.ndarray) -> dict:
        results = self.engine.model(frame, conf=self.engine.confidence_threshold, verbose=False)

        violations = {
            "multiple_people": False,
            "no_person": False,
            "suspicious_objects": [],
            "person_count": 0,
            "severity": "none",
        }

        boxes_for_annotation = []

        if len(results) > 0:
            boxes = results[0].boxes
            person_count = 0
            detected_objects = []

            for box in boxes:
                cls_id = int(box.cls[0])
                confidence = float(box.conf[0])
                class_name = self.engine.model.names[cls_id]
                x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
                bbox = [int(x1), int(y1), int(x2), int(y2)]

                if class_name == "person":
                    if confidence < config.PERSON_CONFIDENCE_THRESHOLD:
                        continue
                    box_area = (x2 - x1) * (y2 - y1)
                    if box_area < config.MIN_PERSON_BOX_AREA:
                        continue
                    person_count += 1
                    boxes_for_annotation.append(
                        {
                            "kind": "person",
                            "bbox": bbox,
                            "label": f"Person {confidence:.2f}",
                        }
                    )

                elif class_name in self.engine.suspicious_objects:
                    obj_info = self.engine.suspicious_objects[class_name]
                    display_name = obj_info["display_name"]
                    detected_objects.append(
                        {
                            "object": display_name,
                            "confidence": confidence,
                            "severity": obj_info.get("severity", "medium"),
                            "bbox": bbox,
                        }
                    )
                    boxes_for_annotation.append(
                        {
                            "kind": "suspicious",
                            "bbox": bbox,
                            "label": f"{display_name} {confidence:.2f}",
                        }
                    )

            violations["person_count"] = person_count

            violations["suspicious_objects"] = detected_objects

            if detected_objects and violations["severity"] == "none":
                max_severity = max([obj["severity"] for obj in detected_objects])
                violations["severity"] = max_severity

        self.detection_buffer.append(violations)
        stable_violations = self._get_stable_violations()
        crossed_this_frame = self._get_crossed_threshold_violations(stable_violations)
        alert_result = self._handle_violation(stable_violations)

        annotated = self._annotate_frame(frame, boxes_for_annotation, stable_violations)
        snapshot_b64 = self._encode_frame(annotated) if alert_result["new_alert"] else None

        return {
            "person_count": stable_violations.get("person_count", 0),
            "suspicious_objects": [
                {
                    "object": obj["object"],
                    "confidence": round(float(obj["confidence"]), 4),
                    "severity": obj.get("severity", "medium"),
                }
                for obj in stable_violations.get("suspicious_objects", [])
            ],
            "stable_violations": crossed_this_frame,
            "new_alert": alert_result["new_alert"],
            "alert_types": alert_result["alert_types"],
            "snapshot_base64": snapshot_b64,
        }

    def _get_stable_violations(self) -> dict:
        if not self.detection_buffer:
            return {}

        current_time = time.time()
        latest = self.detection_buffer[-1]
        stable = latest.copy()

        if latest.get("no_person", False):
            if "no_person" not in self.violation_start_times:
                self.violation_start_times["no_person"] = current_time
            duration = current_time - self.violation_start_times["no_person"]
            stable["no_person"] = duration >= self.violation_confirmation_time
        else:
            self.violation_start_times.pop("no_person", None)
            stable["no_person"] = False

        if latest.get("multiple_people", False):
            if "multiple_people" not in self.violation_start_times:
                self.violation_start_times["multiple_people"] = current_time
            duration = current_time - self.violation_start_times["multiple_people"]
            stable["multiple_people"] = duration >= self.violation_confirmation_time
        else:
            self.violation_start_times.pop("multiple_people", None)
            stable["multiple_people"] = False

        stable_suspicious_objects = []
        current_object_types = set([obj["object"] for obj in latest.get("suspicious_objects", [])])

        for obj in latest.get("suspicious_objects", []):
            obj_key = f"object_{obj['object']}"

            if obj_key not in self.violation_start_times:
                self.violation_start_times[obj_key] = current_time

            duration = current_time - self.violation_start_times[obj_key]
            if duration >= self.violation_confirmation_time:
                obj_copy = obj.copy()
                obj_copy["confirmed_duration"] = duration
                stable_suspicious_objects.append(obj_copy)

        object_keys_to_remove = [
            k
            for k in self.violation_start_times.keys()
            if k.startswith("object_") and k.replace("object_", "") not in current_object_types
        ]
        for key in object_keys_to_remove:
            self.violation_start_times.pop(key, None)

        stable["suspicious_objects"] = stable_suspicious_objects
        return stable

    def _get_crossed_threshold_violations(self, stable_violations: dict) -> List[dict]:
        crossed = []

        now_no_person = stable_violations.get("no_person", False)
        if now_no_person and not self._prev_stable_flags["no_person"]:
            crossed.append({"type": "no_person"})

        now_multiple_people = stable_violations.get("multiple_people", False)
        if now_multiple_people and not self._prev_stable_flags["multiple_people"]:
            crossed.append(
                {
                    "type": "multiple_people",
                    "person_count": stable_violations.get("person_count", 0),
                }
            )

        now_objects = set([obj["object"] for obj in stable_violations.get("suspicious_objects", [])])
        for obj_name in now_objects:
            if obj_name not in self._prev_stable_flags["objects"]:
                crossed.append({"type": "suspicious_object", "object": obj_name})

        self._prev_stable_flags["no_person"] = now_no_person
        self._prev_stable_flags["multiple_people"] = now_multiple_people
        self._prev_stable_flags["objects"] = now_objects

        return crossed

    def _handle_violation(self, violations: dict) -> dict:
        current_time = time.time()
        should_capture = False
        alert_types = []

        if violations.get("no_person") and self._should_alert("no_person", current_time):
            should_capture = True
            alert_types.append("no_person")

        if violations.get("multiple_people") and self._should_alert("multiple_people", current_time):
            should_capture = True
            alert_types.append("multiple_people")

        for obj in violations.get("suspicious_objects", []):
            obj_key = f"object_{obj['object']}"
            if self._should_alert(obj_key, current_time):
                should_capture = True
                alert_types.append(f"suspicious_object:{obj['object']}")

        return {"new_alert": should_capture, "alert_types": alert_types}

    def _should_alert(self, alert_type: str, current_time: float) -> bool:
        if alert_type not in self.last_alert_time:
            self.last_alert_time[alert_type] = current_time
            return True

        if current_time - self.last_alert_time[alert_type] >= self.alert_cooldown:
            self.last_alert_time[alert_type] = current_time
            return True

        return False

    def _annotate_frame(self, frame: np.ndarray, boxes_for_annotation: list, violations: dict) -> np.ndarray:
        annotated = frame.copy()

        for item in boxes_for_annotation:
            x1, y1, x2, y2 = item["bbox"]
            if item["kind"] == "person":
                color = (0, 255, 0)
            else:
                color = (0, 0, 255)
            label = item["label"]

            cv2.rectangle(annotated, (x1, y1), (x2, y2), color, 2)
            label_size, _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.6, 2)
            cv2.rectangle(
                annotated,
                (x1, y1 - label_size[1] - 10),
                (x1 + label_size[0], y1),
                color,
                -1,
            )
            cv2.putText(
                annotated,
                label,
                (x1, y1 - 5),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.6,
                (255, 255, 255),
                2,
            )

        width = annotated.shape[1]
        alert_y = 30

        if violations.get("no_person"):
            cv2.rectangle(annotated, (10, 10), (width - 10, 60), (0, 0, 255), -1)
            cv2.putText(
                annotated,
                "ALERT: No person detected!",
                (20, 45),
                cv2.FONT_HERSHEY_SIMPLEX,
                1,
                (255, 255, 255),
                2,
            )
            alert_y = 90

        if violations.get("multiple_people"):
            cv2.rectangle(annotated, (10, alert_y - 20), (width - 10, alert_y + 30), (0, 0, 255), -1)
            cv2.putText(
                annotated,
                f"ALERT: {violations.get('person_count', 0)} people detected!",
                (20, alert_y + 5),
                cv2.FONT_HERSHEY_SIMPLEX,
                1,
                (255, 255, 255),
                2,
            )
            alert_y += 70

        suspicious = violations.get("suspicious_objects", [])
        if suspicious:
            objects_str = ", ".join([obj["object"] for obj in suspicious[:3]])
            cv2.rectangle(annotated, (10, alert_y - 20), (width - 10, alert_y + 30), (0, 165, 255), -1)
            cv2.putText(
                annotated,
                f"Suspicious: {objects_str}",
                (20, alert_y + 5),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.8,
                (255, 255, 255),
                2,
            )

        return annotated

    @staticmethod
    def _encode_frame(frame: np.ndarray) -> str:
        ok, buffer = cv2.imencode(".jpg", frame)
        if not ok:
            return None
        return base64.b64encode(buffer).decode("utf-8")
