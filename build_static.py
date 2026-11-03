from pathlib import Path
from shutil import copy2, copytree, rmtree

from app import app


ROOT = Path(__file__).resolve().parent
PUBLIC = ROOT / "public"

PAGES = {
    "/": "index.html",
    "/about": "about/index.html",
    "/services": "services/index.html",
    "/products": "products/index.html",
    "/products/orvex": "products/orvex/index.html",
    "/products/recura": "products/recura/index.html",
    "/products/cubbo": "products/cubbo/index.html",
    "/capabilities": "capabilities/index.html",
    "/contact": "contact/index.html",
    "/careers": "careers/index.html",
    "/training": "training/index.html",
    "/terms": "terms/index.html",
    "/privacy": "privacy/index.html",
}

TEXT_SUFFIXES = {".css", ".html", ".js", ".svg", ".txt", ".xml"}


def normalize_text_files() -> None:
    """Keep generated files consistent and free of trailing whitespace."""
    for path in PUBLIC.rglob("*"):
        if path.is_file() and path.suffix in TEXT_SUFFIXES:
            text = path.read_text(encoding="utf-8")
            normalized = "\n".join(line.rstrip() for line in text.splitlines()) + "\n"
            path.write_text(normalized, encoding="utf-8")


def build() -> None:
    if PUBLIC.exists():
        rmtree(PUBLIC)
    PUBLIC.mkdir()

    with app.test_client() as client:
        for route, destination in PAGES.items():
            response = client.get(route)
            if response.status_code != 200:
                raise RuntimeError(f"{route} returned HTTP {response.status_code}")

            output = PUBLIC / destination
            output.parent.mkdir(parents=True, exist_ok=True)
            output.write_bytes(response.data)

    copytree(ROOT / "static", PUBLIC / "static")

    for source in (ROOT / "cloudflare").iterdir():
        if source.is_file():
            copy2(source, PUBLIC / source.name)

    normalize_text_files()

    print(f"Built {len(PAGES)} pages in {PUBLIC}")


if __name__ == "__main__":
    build()
