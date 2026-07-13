#!/usr/bin/env python3
"""
generate-icons.py — Pipeline regenerasi aset ikon aplikasi dari logo.jpg

Pipeline (tanpa dependency eksternal; hanya Pillow + numpy):
  1. Buka logo.jpg (1254x1254, emblem biru di tengah, dikelilingi bingkai hitam + bg putih).
  2. Buang bingkai hitam: potong ke region konten (deteksi bbox non-hitam).
  3. Hapus background putih -> RGBA transparan (threshold near-white -> alpha=0, feather edge).
  4. Simpan master emblem transparan -> logo.png.
  5. Komposit emblem ke canvas putih + resize untuk tiap aset.

Reproducible: jalankan ulang kapan saja dengan `python3 scripts/generate-icons.py`.

Aset yang dihasilkan (semua menimpa yang ada, kecuali yang ditandai BARU):
  - assets/images/logo.png              (BARU, master transparan ~800x800)
  - assets/images/icon.png              1024x1024
  - assets/images/adaptive-icon.png     1024x1024 (emblem di safe-zone tengah)
  - assets/images/splash-icon.png       1024x1024 (transparan, di atas bg splash putih)
  - assets/images/favicon.png           48x48
  - assets/store/playstore-icon.png     512x512 opaque
  - assets/store/feature-graphic.png    (BARU) 1024x500

Skema warna: biru native -> canvas/background PUTIH agar emblem biru terlihat.
"""
from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parent.parent
IMG_DIR = ROOT / "assets" / "images"
STORE_DIR = ROOT / "assets" / "store"
SOURCE = IMG_DIR / "logo.jpg"

# Threshold untuk deteksi background putih (semua kanal > nilai ini dianggap bg).
WHITE_THRESHOLD = 235
# Threshold untuk deteksi bingkai hitam (semua kanal < nilai ini dianggap hitam).
BLACK_THRESHOLD = 30
# Radius feather untuk anti-aliasing tepi alpha hasil remove-bg.
FEATHER_RADIUS = 2


def load_source(path: Path) -> Image.Image:
    if not path.exists():
        sys.exit(f"[generate-icons] Sumber tidak ditemukan: {path}")
    img = Image.open(path).convert("RGB")
    print(f"[generate-icons] Sumber dimuat: {path.name} {img.size[0]}x{img.size[1]}")
    return img


def find_content_bbox(img: Image.Image) -> tuple[int, int, int, int]:
    """Bbox konten non-hitam (untuk membuang bingkai hitam tebal di perimeter)."""
    arr = np.asarray(img).astype(np.int16)
    r, g, b = arr[..., 0], arr[..., 1], arr[..., 2]
    is_black = (r < BLACK_THRESHOLD) & (g < BLACK_THRESHOLD) & (b < BLACK_THRESHOLD)
    is_content = ~is_black
    rows = np.any(is_content, axis=1)
    cols = np.any(is_content, axis=0)
    if not rows.any() or not cols.any():
        sys.exit("[generate-icons] Tidak ada konten non-hitam terdeteksi.")
    top, bottom = int(np.argmax(rows)), int(len(rows) - np.argmax(rows[::-1]))
    left, right = int(np.argmax(cols)), int(len(cols) - np.argmax(cols[::-1]))
    print(f"[generate-icons] BBox konten: L={left} T={top} R={right} B={bottom}")
    return left, top, right, bottom


def crop_border(img: Image.Image, bbox: tuple[int, int, int, int]) -> Image.Image:
    left, top, right, bottom = bbox
    # Inset sedikit ke dalam untuk membuang anti-aliasing tepi bingkai hitam.
    inset = 4
    left, top = left + inset, top + inset
    right, bottom = right - inset, bottom - inset
    cropped = img.crop((left, top, right, bottom))
    print(f"[generate-icons] Crop bingkai -> {cropped.size[0]}x{cropped.size[1]}")
    return cropped


def remove_bg(img: Image.Image) -> Image.Image:
    """Hapus background (putih DAN sisa bingkai hitam) -> RGBA transparan.

    Emblem biru dipertahankan; pixel near-white (bg) dan near-black (anti-aliasing
    tepi bingkai hitam) dijadikan alpha=0. Feather tepi untuk anti-aliasing halus.
    """
    arr = np.asarray(img).astype(np.int16)
    r, g, b = arr[..., 0], arr[..., 1], arr[..., 2]

    is_white = (r >= WHITE_THRESHOLD) & (g >= WHITE_THRESHOLD) & (b >= WHITE_THRESHOLD)
    is_black = (r <= BLACK_THRESHOLD) & (g <= BLACK_THRESHOLD) & (b <= BLACK_THRESHOLD)
    is_bg = is_white | is_black

    alpha = np.where(is_bg, 0, 255).astype(np.uint8)

    rgba = np.dstack([arr.astype(np.uint8), alpha])
    out = Image.fromarray(rgba)

    # Feather tepi supaya tidak ada jaggies/halo di sekitar emblem biru.
    out = out.filter(ImageFilter.MinFilter(FEATHER_RADIUS * 2 + 1))
    out.putalpha(out.split()[3].filter(ImageFilter.GaussianBlur(radius=FEATHER_RADIUS)))
    print("[generate-icons] Background (putih+hitam) dihapus -> RGBA transparan")
    return out


def tight_crop_alpha(img: Image.Image, padding_pct: float = 4.0) -> Image.Image:
    """Crop ketat ke bbox konten non-transparan, lalu tambahkan padding persen."""
    bbox = img.getbbox()
    if bbox is None:
        return img
    cropped = img.crop(bbox)
    w, h = cropped.size
    pad_w = max(1, int(w * padding_pct / 100))
    pad_h = max(1, int(h * padding_pct / 100))
    final = Image.new("RGBA", (w + pad_w * 2, h + pad_h * 2), (0, 0, 0, 0))
    final.paste(cropped, (pad_w, pad_h), cropped)
    return final


def composite_on_white(img: Image.Image, size: int, emblem_scale: float = 0.78) -> Image.Image:
    """Komposit emblem transparan di tengah canvas PUTIH ukuran size x size."""
    canvas = Image.new("RGBA", (size, size), (255, 255, 255, 255))
    emblem_target = max(1, int(size * emblem_scale))
    resized = img.copy()
    resized.thumbnail((emblem_target, emblem_target), Image.LANCZOS)
    ew, eh = resized.size
    offset = ((size - ew) // 2, (size - eh) // 2)
    canvas.alpha_composite(resized, offset)
    return canvas


def save_rgb(img: Image.Image, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    img.convert("RGB").save(path, "PNG", optimize=True)
    print(f"[generate-icons] Tulis {path.relative_to(ROOT)} {img.size[0]}x{img.size[1]}")


def save_rgba(img: Image.Image, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    img.save(path, "PNG", optimize=True)
    print(f"[generate-icons] Tulis {path.relative_to(ROOT)} {img.size[0]}x{img.size[1]}")


def make_feature_graphic(emblem: Image.Image) -> Image.Image:
    """Feature graphic Play Store: 1024x500, emblem + wordmark di canvas putih/biru muda."""
    width, height = 1024, 500
    canvas = Image.new("RGBA", (width, height), (255, 255, 255, 255))

    # Accent band kiri (biru lembut) untuk struktur visual.
    draw = ImageDraw.Draw(canvas)
    draw.rectangle([0, 0, 18, height], fill=(13, 71, 161, 255))  # #0D47A1

    # Emblem di kiri-tengah.
    emblem_target = 300
    em = emblem.copy()
    em.thumbnail((emblem_target, emblem_target), Image.LANCZOS)
    canvas.alpha_composite(em, (90, (height - em.size[1]) // 2))
    title_font = _load_font(72, bold=True)
    sub_font = _load_font(30, bold=False)

    tx = 90 + emblem_target + 50
    draw.text((tx, height // 2 - 60), "Sagansa", fill=(17, 24, 39, 255), font=title_font)
    draw.text((tx, height // 2 + 18), "Attendance", fill=(13, 71, 161, 255), font=sub_font)

    return canvas


def _load_font(size: int, bold: bool = False) -> ImageFont.ImageFont:
    """Coba font sistem; fallback ke default Pillow jika tidak ada."""
    candidates = [
        "/System/Library/Fonts/Helvetica.ttc",
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf" if bold else "/System/Library/Fonts/Supplemental/Arial.ttf",
        "/System/Library/Fonts/Supplemental/Tahoma.ttf",
    ]
    for c in candidates:
        try:
            return ImageFont.truetype(c, size)
        except Exception:
            continue
    return ImageFont.load_default()


def main() -> None:
    if not SOURCE.exists():
        sys.exit(f"[generate-icons] Sumber tidak ditemukan: {SOURCE}")

    # 1-3: load -> crop bingkai -> remove bg (putih+hitam) -> emblem transparan master.
    src = load_source(SOURCE)
    bbox = find_content_bbox(src)
    cropped = crop_border(src, bbox)
    emblem_full = remove_bg(cropped)

    # Master emblem transparan (tight crop + sedikit padding).
    emblem = tight_crop_alpha(emblem_full, padding_pct=4.0)
    emblem.save(IMG_DIR / "logo.png", "PNG", optimize=True)
    print(
        f"[generate-icons] Tulis master emblem: "
        f"assets/images/logo.png {emblem.size[0]}x{emblem.size[1]}"
    )

    # 4: aset ikon (emblem di canvas putih).
    save_rgb(composite_on_white(emblem, 1024, 0.80), IMG_DIR / "icon.png")
    save_rgb(composite_on_white(emblem, 1024, 0.66), IMG_DIR / "adaptive-icon.png")
    # splash-icon: biarkan transparan (di atas bg splash putih via app.json).
    splash = emblem.copy()
    splash.thumbnail((200, 200), Image.LANCZOS)
    save_rgba(splash, IMG_DIR / "splash-icon.png")
    save_rgb(composite_on_white(emblem, 48, 0.92), IMG_DIR / "favicon.png")
    save_rgb(composite_on_white(emblem, 512, 0.80), STORE_DIR / "playstore-icon.png")

    # 5: feature graphic (BARU).
    save_rgb(make_feature_graphic(emblem), STORE_DIR / "feature-graphic.png")

    print("[generate-icons] Selesai. Semua aset berhasil diregenerasi.")


if __name__ == "__main__":
    main()
