import { HttpError } from "./http";

export const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

/** Restrict files to raster formats; never serve user-supplied HTML/SVG. */
export function avatarContentType(bytes: Uint8Array, declaredType: string) {
  const startsWith = (signature: number[]) => signature.every((byte, index) => bytes[index] === byte);
  let type: string | undefined;
  if (startsWith([137, 80, 78, 71, 13, 10, 26, 10])) type = "image/png";
  else if (startsWith([255, 216, 255])) type = "image/jpeg";
  else if (new TextDecoder().decode(bytes.slice(0, 4)) === "RIFF" && new TextDecoder().decode(bytes.slice(8, 12)) === "WEBP") type = "image/webp";
  if (!type || declaredType !== type) throw new HttpError(400, "Upload a PNG, JPEG or WebP image.");
  return type;
}
