
import csv
import json
from pathlib import Path
from datetime import datetime

SOURCE = Path(__file__).parent / "source_users.csv"
TARGET = Path(__file__).parent / "google_directory_simulated.json"


def sync_directory():
    with SOURCE.open(
        "r", newline="", encoding="utf-8-sig"
    ) as file:
        reader = csv.DictReader(file)

        if not reader.fieldnames:
            raise ValueError("CSV file is empty or missing headers.")

        reader.fieldnames = [
            name.strip() for name in reader.fieldnames
        ]

        source_users = {}

        for row in reader:
            user_id = (row.get("user_id") or "").strip()

            if not user_id:
                continue

            source_users[user_id] = {
                key.strip(): (value or "").strip()
                for key, value in row.items()
                if key is not None
            }

    if TARGET.exists():
        target_users = json.loads(
            TARGET.read_text(encoding="utf-8")
        )
    else:
        target_users = {}

    added = 0
    updated = 0

    for user_id, user in source_users.items():
        if user_id not in target_users:
            added += 1
        elif target_users[user_id] != user:
            updated += 1

        target_users[user_id] = user

    TARGET.write_text(
        json.dumps(target_users, indent=2),
        encoding="utf-8"
    )

    print("Directory synchronization complete!")
    print("Source users:", len(source_users))
    print("Users added:", added)
    print("Users updated:", updated)
    print("Target users:", len(target_users))
    print("Target file:", TARGET)
    
    with open("sync.log", "a", encoding="utf-8") as log:
        log.write(
            f"{datetime.now().isoformat(timespec='seconds')} | "
            f"Source users: {len(source_users)} | "
            f"Added: {added} | Updated: {updated} | "
            f"Target users: {len(target_users)}\n"
        )




if __name__ == "__main__":
    sync_directory()
