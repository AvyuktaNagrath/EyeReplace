from eyeware.client import TrackerClient
import time

def run_tracker():
    tracker = TrackerClient(base_communication_port=12010, hostname="127.0.0.1")

    while True:
        if tracker.connected:
            # Retrieve and print head pose
            head_pose = tracker.get_head_pose_info()
            head_is_lost = head_pose.is_lost
            if not head_is_lost:
                rot = head_pose.transform.rotation
                tr = head_pose.transform.translation
                print(f"Head Pose: Rotation: {rot}, Translation: {tr}")

            # Retrieve and print screen gaze
            screen_gaze = tracker.get_screen_gaze_info()
            screen_gaze_is_lost = screen_gaze.is_lost
            if not screen_gaze_is_lost:
                print(f"Gaze on Screen: Coordinates: ({screen_gaze.x}, {screen_gaze.y})")

            time.sleep(1 / 30)  # Data frequency at 30 Hz
        else:
            print("No connection with tracker server")
            time.sleep(2)
