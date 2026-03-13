import { Injectable, BadRequestException } from '@nestjs/common';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import * as streamifier from 'streamifier';

@Injectable()
export class CloudinaryService {
  private readonly folder = 'imagenes';

  /**
   * Sube múltiples archivos a Cloudinary en la carpeta "imagenes"
   * y retorna un array con las URLs seguras de cada imagen.
   */
  async uploadImages(files: Express.Multer.File[]): Promise<string[]> {
    if (!files || files.length === 0) {
      return [];
    }

    const uploadPromises = files.map((file) => this.uploadSingle(file));
    const results = await Promise.all(uploadPromises);
    return results.map((result) => result.secure_url);
  }

  /**
   * Elimina una imagen de Cloudinary usando su public_id.
   * El public_id tiene el formato: imagenes/nombre_archivo
   */
  async deleteImage(publicId: string): Promise<void> {
    await cloudinary.uploader.destroy(publicId);
  }

  /**
   * Extrae el public_id a partir de la URL de Cloudinary.
   * Ejemplo: https://res.cloudinary.com/.../imagenes/foto.jpg → imagenes/foto
   */
  extractPublicId(url: string): string {
    const parts = url.split('/');
    const uploadIndex = parts.indexOf('upload');
    // Tomar todo después de /upload/v123456/ ignorando la versión
    const pathAfterUpload = parts.slice(uploadIndex + 2).join('/');
    // Remover la extensión
    return pathAfterUpload.replace(/\.[^/.]+$/, '');
  }

  // ─── Privado ────────────────────────────────────────────────────────────────

  private uploadSingle(file: Express.Multer.File): Promise<UploadApiResponse> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: this.folder,
          resource_type: 'image',
        },
        (error, result) => {
          if (error) return reject(new BadRequestException(error.message));
          resolve(result!);
        },
      );

      streamifier.createReadStream(file.buffer).pipe(uploadStream);
    });
  }
}