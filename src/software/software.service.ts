import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { Software } from './entities/software.entity';
import { CreateSoftwareDto } from './dto/create-software.dto';
import { UpdateSoftwareDto } from './dto/update-software.dto';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { SoftwareStatus } from '../common/enums/user-role.enum';

@Injectable()
export class SoftwareService {
  constructor(
    @InjectRepository(Software)
    private softwareRepository: Repository<Software>,
    private cloudinaryService: CloudinaryService,
  ) {}

  // ─── Crear ───────────────────────────────────────────────────────────────────

  async create(
    createSoftwareDto: CreateSoftwareDto,
    files: Express.Multer.File[],
  ): Promise<Software> {
    let urlImagen: string | undefined;

    if (files && files.length > 0) {
      const urls = await this.cloudinaryService.uploadImages(files);
      urlImagen = urls.join(',');
    }

    const software = this.softwareRepository.create({
      ...createSoftwareDto,
      urlImagen,
    });

    return this.softwareRepository.save(software);
  }

  // ─── Listar todos ─────────────────────────────────────────────────────────

  async findAll(): Promise<Software[]> {
    return this.softwareRepository.find({
      order: { fechaCreacion: 'DESC' },
    });
  }

  // ─── Listar activos (endpoint público) ───────────────────────────────────

  async findAllActive(): Promise<Software[]> {
    return this.softwareRepository.find({
      where: { estado: SoftwareStatus.ACTIVO },
      order: { fechaCreacion: 'DESC' },
    });
  }

  // ─── Buscar por tag ────────────────────────────────────────────────────────

  async searchByTag(tag: string): Promise<Software[]> {
    return this.softwareRepository.find({
      where: [
        { tags: Like(`%${tag}%`), estado: SoftwareStatus.ACTIVO },
      ],
      order: { fechaCreacion: 'DESC' },
    });
  }

  // ─── Obtener uno ──────────────────────────────────────────────────────────

  async findOne(id: number): Promise<Software> {
    const software = await this.softwareRepository.findOne({ where: { id } });

    if (!software) {
      throw new NotFoundException(`Software con ID ${id} no encontrado`);
    }

    return software;
  }

  // ─── Actualizar ───────────────────────────────────────────────────────────

  async update(
    id: number,
    updateSoftwareDto: UpdateSoftwareDto,
    files: Express.Multer.File[],
  ): Promise<Software> {
    const software = await this.findOne(id);

    // 1. Eliminar imágenes indicadas de Cloudinary y del campo
    if (updateSoftwareDto.imagenesAEliminar) {
      const urlsAEliminar = updateSoftwareDto.imagenesAEliminar
        .split(',')
        .map((u) => u.trim())
        .filter(Boolean);

      for (const url of urlsAEliminar) {
        const publicId = this.cloudinaryService.extractPublicId(url);
        await this.cloudinaryService.deleteImage(publicId);
      }

      // Remover esas URLs del campo urlImagen
      const urlsActuales = software.urlImagen
        ? software.urlImagen.split(',').map((u) => u.trim())
        : [];

      const urlsRestantes = urlsActuales.filter(
        (u) => !urlsAEliminar.includes(u),
      );

      software.urlImagen = urlsRestantes.length > 0 ? urlsRestantes.join(',') : null;
    }

    // 2. Subir nuevas imágenes y agregar sus URLs
    if (files && files.length > 0) {
      const nuevasUrls = await this.cloudinaryService.uploadImages(files);
      const urlsActuales = software.urlImagen
        ? software.urlImagen.split(',').map((u) => u.trim())
        : [];

      software.urlImagen = [...urlsActuales, ...nuevasUrls]
        .filter(Boolean)
        .join(',');
    }

    // 3. Aplicar los demás campos del DTO (excluyendo imagenesAEliminar)
    const { imagenesAEliminar, ...camposActualizar } = updateSoftwareDto;
    Object.assign(software, camposActualizar);

    return this.softwareRepository.save(software);
  }

  // ─── Eliminar ─────────────────────────────────────────────────────────────

  async remove(id: number): Promise<void> {
    const software = await this.findOne(id);

    // Eliminar imágenes de Cloudinary si existen
    if (software.urlImagen) {
      const urls = software.urlImagen.split(',').map((u) => u.trim());
      for (const url of urls) {
        const publicId = this.cloudinaryService.extractPublicId(url);
        await this.cloudinaryService.deleteImage(publicId);
      }
    }

    await this.softwareRepository.remove(software);
  }
}