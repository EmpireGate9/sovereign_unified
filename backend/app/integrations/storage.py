from pathlib import Path

STORAGE = Path(__file__).resolve().parents[2] / "storage"
STORAGE.mkdir(exist_ok=True, parents=True)

def save_file(filename: str, data: bytes) -> Path:
    path = STORAGE / filename
    path.write_bytes(data)
    return path
