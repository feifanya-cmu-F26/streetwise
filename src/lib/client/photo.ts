export async function readPhoto(file: File): Promise<string> {
  if (
    !file.type.startsWith("image/") &&
    !/\.(jpe?g|png|webp|heic|heif)$/i.test(file.name)
  )
    throw new Error("Choose an image from your camera or photo library.");
  if (file.size > 15 * 1024 * 1024)
    throw new Error("Choose a photo smaller than 15 MB.");
  const url = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new window.Image();
      image.onload = () => resolve(image);
      image.onerror = () =>
        reject(
          new Error(
            "This photo format could not be opened. Try a JPG photo from your camera or library.",
          ),
        );
      image.src = url;
    });
    const scale = Math.min(
      1,
      1280 / Math.max(image.naturalWidth, image.naturalHeight),
    );
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("This browser could not prepare the photo.");
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.8);
  } finally {
    URL.revokeObjectURL(url);
  }
}
