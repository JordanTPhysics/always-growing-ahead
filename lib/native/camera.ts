import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";
import { isNativePlatform } from "@/lib/native/platform";

export type CapturedImage = {
  dataUrl: string;
  format: string;
};

/** Capture or pick an image; returns a data URL for upload. */
export async function captureOrPickImage(): Promise<CapturedImage | null> {
  try {
    if (isNativePlatform()) {
      const photo = await Camera.getPhoto({
        quality: 80,
        allowEditing: true,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Prompt,
      });
      if (!photo.dataUrl) return null;
      return {
        dataUrl: photo.dataUrl,
        format: photo.format || "jpeg",
      };
    }

    // Web: file picker
    return await new Promise((resolve) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      input.onchange = () => {
        const file = input.files?.[0];
        if (!file) {
          resolve(null);
          return;
        }
        const reader = new FileReader();
        reader.onload = () => {
          resolve({
            dataUrl: String(reader.result),
            format: file.type.split("/")[1] || "jpeg",
          });
        };
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(file);
      };
      input.click();
    });
  } catch {
    return null;
  }
}
