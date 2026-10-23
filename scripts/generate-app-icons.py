from PIL import Image

SRC = "assets/logo-source.png"


def load_trimmed():
    im = Image.open(SRC).convert("RGBA")
    bbox = im.getbbox()
    return im.crop(bbox)


def square_canvas(content, canvas_size, content_fraction, bg=(0, 0, 0, 0)):
    """Paste `content` centered on a canvas_size x canvas_size square, scaled so its
    longest side is content_fraction * canvas_size."""
    canvas = Image.new("RGBA", (canvas_size, canvas_size), bg)
    w, h = content.size
    scale = (canvas_size * content_fraction) / max(w, h)
    new_w, new_h = round(w * scale), round(h * scale)
    resized = content.resize((new_w, new_h), Image.LANCZOS)
    x = (canvas_size - new_w) // 2
    y = (canvas_size - new_h) // 2
    canvas.paste(resized, (x, y), resized)
    return canvas


def flatten_on_white(im):
    bg = Image.new("RGBA", im.size, (255, 255, 255, 255))
    bg.paste(im, (0, 0), im)
    return bg.convert("RGB")


def monochrome_silhouette(content, canvas_size, content_fraction):
    silhouette = square_canvas(content, canvas_size, content_fraction)
    alpha = silhouette.split()[3]
    black = Image.new("RGBA", silhouette.size, (0, 0, 0, 255))
    black.putalpha(alpha)
    return black


content = load_trimmed()

# Main app icon (iOS + fallback) — stores disallow transparency, flatten on white.
icon = square_canvas(content, 1024, 0.86)
flatten_on_white(icon).save("assets/icon.png")

# Web favicon.
favicon = square_canvas(content, 256, 0.86)
favicon.save("assets/favicon.png")

# Android adaptive icon foreground — must fit inside the ~66% safe zone so it isn't
# clipped by circle/squircle/rounded-square masks across launchers.
fg = square_canvas(content, 1024, 0.62)
fg.save("assets/android-icon-foreground.png")

# Android adaptive icon background — plain white so the green/black glossy mark reads
# cleanly under any mask shape (was the Expo-template default light blue, unrelated to brand).
bg = Image.new("RGBA", (1024, 1024), (255, 255, 255, 255))
bg.save("assets/android-icon-background.png")

# Android 13+ themed monochrome layer — single-color silhouette, same safe-zone sizing.
mono = monochrome_silhouette(content, 1024, 0.62)
mono.save("assets/android-icon-monochrome.png")

# In-app logo (login screen etc.) — transparent background, modest resolution so it
# isn't a ~1.1MB bundle asset for a single on-screen image.
w, h = content.size
scale = 900 / max(w, h)
logo = content.resize((round(w * scale), round(h * scale)), Image.LANCZOS)
logo.save("assets/logo.png", optimize=True)

print("done")
