
from flask import Flask, jsonify
from flask_cors import CORS
from pathlib import Path
import csv
import json
import subprocess
import sys



app = Flask(__name__)
CORS(app)

BASE_DIR = Path(__file__).resolve().parent
SOURCE_FILE = BASE_DIR / "source_users.csv"
TARGET_FILE = BASE_DIR / "google_directory_simulated.json"
LOG_FILE = BASE_DIR / "sync.log"
SYNC_SCRIPT = BASE_DIR / "sync.py"


def read_source_users():
    with SOURCE_FILE.open("r", encoding="utf-8-sig", newline="") as file:
        return list(csv.DictReader(file))


def read_target_users():
    if not TARGET_FILE.exists():
        return []

    with TARGET_FILE.open("r", encoding="utf-8-sig") as file:
        data = json.load(file)

    if isinstance(data, list):
        return data

    if isinstance(data, dict):
        if "users" in data:
            users = data["users"]
            return list(users.values()) if isinstance(users, dict) else users

        return list(data.values())

    return []

def read_logs():
    if not LOG_FILE.exists():
        return []

    return LOG_FILE.read_text(encoding="utf-8").splitlines()[-20:][::-1]


@app.get("/api/health")
def health():
    return jsonify({
        "status": "online",
        "mode": "simulation",
        "message": "Python backend is running"
    })


@app.get("/api/users")
def users():
    try:
        source = read_source_users()
        target = read_target_users()

        return jsonify({
            "source": source,
            "target": target,
            "logs": read_logs(),
            "mode": "simulation"
        })
    except Exception as error:
        return jsonify({"error": str(error)}), 500


@app.post("/api/sync")
def run_sync():
    try:
        result = subprocess.run(
            [sys.executable, str(SYNC_SCRIPT)],
            cwd=str(BASE_DIR),
            capture_output=True,
            text=True,
            timeout=30
        )

        if result.returncode != 0:
            return jsonify({
                "success": False,
                "error": result.stderr or result.stdout
            }), 500

        return jsonify({
            "success": True,
            "output": result.stdout,
            "source": read_source_users(),
            "target": read_target_users(),
            "logs": read_logs(),
            "mode": "simulation"
        })
    except subprocess.TimeoutExpired:
        return jsonify({
            "success": False,
            "error": "Sync took too long. Please try again."
        }), 504
    except Exception as error:
        return jsonify({
            "success": False,
            "error": str(error)
        }), 500


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=False)
