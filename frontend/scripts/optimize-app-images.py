from pathlib import Path

from PIL import Image


PROJECT_ROOT = Path(__file__).resolve().parents[2]
IMAGE_DIR = PROJECT_ROOT / "frontend" / "public" / "images" / "interfaces"
OUTPUT_DIR = IMAGE_DIR / "optimized"

APP_IMAGES = {
    "app1": "supportit.png",
    "app3": "fiche1.png",
    "app20": "sigam.png",
    "app30": "sig.png",
    "app25": "Catalogage & Classification des Données.png",
    "app26": "evaluationfin.png",
    "app4": "receptionfin.png",
    "app27": "pointage.png",
    "app5": "idarafin.png",
    "app6": "gestion $ pointage.png",
    "app7": "parc.png",
    "app9": "ged1.png",
    "app12": "baridmin1.png",
    "app11": "baridanam1.jpg",
    "app21": "qrcode.png",
}


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    for app_id, filename in APP_IMAGES.items():
        source = IMAGE_DIR / filename
        if not source.is_file():
            print(f"Source absente, image conservée : {filename}")
            continue

        with Image.open(source) as image:
            image.thumbnail((900, 600), Image.Resampling.LANCZOS)
            if image.mode not in ("RGB", "RGBA"):
                image = image.convert("RGB")

            output = OUTPUT_DIR / f"{app_id}.webp"
            image.save(output, "WEBP", quality=78, method=6)
            print(f"{filename} -> {output.name} ({output.stat().st_size // 1024} Ko)")


if __name__ == "__main__":
    main()
