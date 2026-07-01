#!/usr/bin/env python3
"""Process src/assets/images/*.jpeg into stylized transparent PNGs.

For every image except background.jpeg:
  1. Remove the white/plain background with rembg -> transparent RGBA.
  2. Convert the remaining object to a black-and-white halftone dot pattern.
  3. Draw a red offset stroke outline around the silhouette.

background.jpeg is copied through untouched.

Output goes to src/assets/images/processed/, using the original base
filename with a .png extension (background.jpeg keeps its own extension).
"""

import shutil
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw
from rembg import remove, new_session
from scipy.ndimage import binary_dilation, generate_binary_structure

IMAGES_DIR = Path(__file__).resolve().parent.parent / "src" / "assets" / "images"
OUT_DIR = IMAGES_DIR / "processed"
SKIP_FILE = "background.jpeg"

# Halftone dot grid cell size, in pixels.
CELL_SIZE = 10
# Maximum dot radius as a fraction of the cell size.
MAX_DOT_RADIUS_FRAC = 0.5
# Distance (px) between the silhouette edge and the start of the red stroke.
STROKE_OFFSET = 4
# Thickness (px) of the red stroke ring.
STROKE_WIDTH = 3

ALPHA_THRESHOLD = 32  # 0-255, below this we treat a pixel as fully outside the silhouette


def remove_background(img: Image.Image, session) -> Image.Image:
    result = remove(img, session=session)
    return result.convert("RGBA")


def halftone_and_outline(rgba: Image.Image) -> Image.Image:
    width, height = rgba.size
    rgb = np.array(rgba.convert("RGB"), dtype=np.uint8)
    alpha = np.array(rgba.getchannel("A"), dtype=np.uint8)
    mask = alpha >= ALPHA_THRESHOLD

    if not mask.any():
        # Nothing survived background removal; return a fully transparent
        # canvas so the caller can flag it instead of silently emitting
        # a blank object.
        return Image.new("RGBA", (width, height), (0, 0, 0, 0))

    gray = np.array(rgba.convert("L"), dtype=np.uint8)

    out = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    draw = ImageDraw.Draw(out)

    # --- Halftone dot pattern -------------------------------------------------
    for cy in range(0, height, CELL_SIZE):
        for cx in range(0, width, CELL_SIZE):
            cell_mask = mask[cy : cy + CELL_SIZE, cx : cx + CELL_SIZE]
            if not cell_mask.any():
                continue
            cell_gray = gray[cy : cy + CELL_SIZE, cx : cx + CELL_SIZE]
            # Average brightness over the silhouette pixels in this cell only.
            brightness = cell_gray[cell_mask].mean() / 255.0
            darkness = 1.0 - brightness
            radius = darkness * CELL_SIZE * MAX_DOT_RADIUS_FRAC
            if radius < 0.5:
                continue
            center_x = cx + CELL_SIZE / 2
            center_y = cy + CELL_SIZE / 2
            draw.ellipse(
                [center_x - radius, center_y - radius, center_x + radius, center_y + radius],
                fill=(0, 0, 0, 255),
            )

    # --- Red offset stroke outline --------------------------------------------
    struct = generate_binary_structure(2, 2)  # 8-connected
    inner_boundary = binary_dilation(mask, structure=struct, iterations=STROKE_OFFSET)
    outer_boundary = binary_dilation(
        mask, structure=struct, iterations=STROKE_OFFSET + STROKE_WIDTH
    )
    ring = outer_boundary & ~inner_boundary

    out_arr = np.array(out)
    out_arr[ring] = (220, 30, 30, 255)
    out = Image.fromarray(out_arr, mode="RGBA")

    return out


def main():
    if not IMAGES_DIR.exists():
        print(f"Images directory not found: {IMAGES_DIR}", file=sys.stderr)
        sys.exit(1)

    OUT_DIR.mkdir(parents=True, exist_ok=True)

    source_files = sorted(
        p for p in IMAGES_DIR.iterdir() if p.is_file() and p.suffix.lower() in (".jpeg", ".jpg")
    )

    session = new_session("u2net")

    results = []

    for src in source_files:
        if src.name == SKIP_FILE:
            dst = OUT_DIR / src.name
            shutil.copyfile(src, dst)
            results.append((src.name, dst.name, "copied (untouched)", None))
            continue

        dst = OUT_DIR / f"{src.stem}.png"
        try:
            with Image.open(src) as img:
                img.load()
                rgba = remove_background(img, session)
                alpha = np.array(rgba.getchannel("A"))
                nonzero_ratio = (alpha >= ALPHA_THRESHOLD).mean()

                styled = halftone_and_outline(rgba)
                styled.save(dst, "PNG")

                flag = None
                if nonzero_ratio == 0:
                    flag = "background removal left an empty silhouette (0% foreground)"
                elif nonzero_ratio > 0.95:
                    flag = (
                        f"foreground covers {nonzero_ratio:.0%} of the frame - "
                        "background may not have been removed"
                    )
                elif nonzero_ratio < 0.01:
                    flag = f"foreground covers only {nonzero_ratio:.1%} of the frame - check output"

                results.append((src.name, dst.name, "processed", flag))
        except Exception as exc:  # noqa: BLE001 - report per-file failures, keep going
            results.append((src.name, dst.name, "FAILED", str(exc)))

    print("\n=== Processing summary ===")
    ok = 0
    for src_name, dst_name, status, flag in results:
        line = f"{src_name:35s} -> {dst_name:35s} [{status}]"
        if flag:
            line += f"  ⚠ {flag}"
        print(line)
        if status != "FAILED":
            ok += 1

    print(f"\n{ok}/{len(results)} files succeeded.")


if __name__ == "__main__":
    main()
