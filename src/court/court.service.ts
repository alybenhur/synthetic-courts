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
import { BusinessSchedule } from '../business/entities/business-schedule.entity';
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
    @InjectRepository(BusinessSchedule)
    private businessScheduleRepository: Repository<BusinessSchedule>,
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

    // Cargar horarios del negocio al que pertenece la cancha
    const businessSchedules = await this.businessScheduleRepository.find({
      where: { businessId: court.business.id },
    });

    const scheduleByDay = new Map(
      businessSchedules.map((s) => [s.dayOfWeek, s]),
    );

    const toMinutes = (time: string) => {
      const [h, m] = time.split(':').map(Number);
      return h * 60 + m;
    };

    // Validar que los slots sean de mínimo 1 hora y estén dentro del horario del negocio
    for (const slot of setAvailabilityDto.availability) {
      const startMinutes = toMinutes(slot.startTime);
      const endMinutes = toMinutes(slot.endTime);
      const duration = endMinutes - startMinutes;

      if (duration < 60) {
        throw new BadRequestException(
          `El slot ${slot.dayOfWeek} ${slot.startTime}-${slot.endTime} debe ser de mínimo 1 hora`,
        );
      }

      const schedule = scheduleByDay.get(slot.dayOfWeek);

      if (!schedule || !schedule.isOpen) {
        throw new BadRequestException(
          `El negocio no opera el día ${slot.dayOfWeek}`,
        );
      }

      const openMinutes = toMinutes(schedule.openTime);
      const closeMinutes = toMinutes(schedule.closeTime);

      if (startMinutes < openMinutes || endMinutes > closeMinutes) {
        throw new BadRequestException(
          `El slot ${slot.dayOfWeek} ${slot.startTime}-${slot.endTime} está fuera del horario del negocio (${schedule.openTime}-${schedule.closeTime})`,
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
          pricePerHour: slot.pricePerHour ?? null,
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

  getEffectivePrice(slot: CourtAvailability, court: Court): number {
    return slot.pricePerHour !== null && slot.pricePerHour !== undefined
      ? Number(slot.pricePerHour)
      : Number(court.pricePerHour);
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