import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Court } from './entities/court.entity';
import { CourtAvailability } from './entities/court-availability.entity';
import { Business } from '../business/entities/business.entity';
import { CreateCourtDto } from './dto/create-court.dto';
import { UpdateCourtDto } from './dto/update-court.dto';
import { SetCourtAvailabilityDto } from './dto/set-court-availability.dto';
import { UserRole } from '../common/enums/user-role.enum';
import { DayOfWeek } from '../common/enums/day-of-week.enum';

@Injectable()
export class CourtService {
  constructor(
    @InjectRepository(Court)
    private courtRepository: Repository<Court>,
    @InjectRepository(CourtAvailability)
    private availabilityRepository: Repository<CourtAvailability>,
    @InjectRepository(Business)
    private businessRepository: Repository<Business>,
  ) {}

  async create(
    createCourtDto: CreateCourtDto,
    userId: string,
    userRole: UserRole,
  ): Promise<Court> {
    // Verificar que el negocio existe
    const business = await this.businessRepository.findOne({
      where: { id: createCourtDto.businessId },
    });

    if (!business) {
      throw new NotFoundException('Negocio no encontrado');
    }

    // Verificar permisos
    if (business.ownerId !== userId && userRole !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException(
        'No tienes permiso para agregar canchas a este negocio',
      );
    }

    const court = this.courtRepository.create(createCourtDto);
    return this.courtRepository.save(court);
  }

  async findAll(): Promise<Court[]> {
    return this.courtRepository.find({
      relations: ['business', 'availability'],
    });
  }

  async findByBusiness(businessId: string): Promise<Court[]> {
    return this.courtRepository.find({
      where: { businessId },
      relations: ['availability'],
      order: { name: 'ASC' },
    });
  }

  async findOne(id: string): Promise<Court> {
    const court = await this.courtRepository.findOne({
      where: { id },
      relations: ['business', 'availability'],
    });

    if (!court) {
      throw new NotFoundException(`Cancha con ID ${id} no encontrada`);
    }

    return court;
  }

  async update(
    id: string,
    updateCourtDto: UpdateCourtDto,
    userId: string,
    userRole: UserRole,
  ): Promise<Court> {
    const court = await this.findOne(id);

    // Verificar permisos
    if (court.business.ownerId !== userId && userRole !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException(
        'No tienes permiso para actualizar esta cancha',
      );
    }

    Object.assign(court, updateCourtDto);
    return this.courtRepository.save(court);
  }

  async remove(
    id: string,
    userId: string,
    userRole: UserRole,
  ): Promise<void> {
    const court = await this.findOne(id);

    // Verificar permisos
    if (court.business.ownerId !== userId && userRole !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException(
        'No tienes permiso para eliminar esta cancha',
      );
    }

    await this.courtRepository.remove(court);
  }

  async setAvailability(
    courtId: string,
    setAvailabilityDto: SetCourtAvailabilityDto,
    userId: string,
    userRole: UserRole,
  ): Promise<Court> {
    const court = await this.findOne(courtId);

    // Verificar permisos
    if (court.business.ownerId !== userId && userRole !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException(
        'No tienes permiso para modificar la disponibilidad de esta cancha',
      );
    }

    // Validar que los slots sean de mínimo 1 hora
    for (const slot of setAvailabilityDto.availability) {
      const [startHour, startMin] = slot.startTime.split(':').map(Number);
      const [endHour, endMin] = slot.endTime.split(':').map(Number);
      
      const startMinutes = startHour * 60 + startMin;
      const endMinutes = endHour * 60 + endMin;
      const duration = endMinutes - startMinutes;

      if (duration < 60) {
        throw new BadRequestException(
          `El slot ${slot.dayOfWeek} ${slot.startTime}-${slot.endTime} debe ser de mínimo 1 hora`,
        );
      }
    }

    // Eliminar disponibilidad anterior
    await this.availabilityRepository.delete({ courtId });

    // Crear nuevos slots de disponibilidad
    if (setAvailabilityDto.availability.length > 0) {
      const availabilityEntities = setAvailabilityDto.availability.map((slot) =>
        this.availabilityRepository.create({
          dayOfWeek: slot.dayOfWeek,
          startTime: slot.startTime,
          endTime: slot.endTime,
          isAvailable: slot.isAvailable ?? true,
          courtId,
        }),
      );

      await this.availabilityRepository.save(availabilityEntities);
    }

    return this.findOne(courtId);
  }

  async getAvailability(courtId: string): Promise<CourtAvailability[]> {
    const court = await this.courtRepository.findOne({
      where: { id: courtId },
    });

    if (!court) {
      throw new NotFoundException(`Cancha con ID ${courtId} no encontrada`);
    }

    return this.availabilityRepository.find({
      where: { courtId },
      order: {
        dayOfWeek: 'ASC',
        startTime: 'ASC',
      },
    });
  }

  async getAvailableSlots(
    courtId: string,
    dayOfWeek: DayOfWeek,
  ): Promise<CourtAvailability[]> {
    const court = await this.courtRepository.findOne({
      where: { id: courtId },
    });

    if (!court) {
      throw new NotFoundException(`Cancha con ID ${courtId} no encontrada`);
    }

    return this.availabilityRepository.find({
      where: {
        courtId,
        dayOfWeek,
        isAvailable: true,
      },
      order: {
        startTime: 'ASC',
      },
    });
  }
}