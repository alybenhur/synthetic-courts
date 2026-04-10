import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Booking } from './entities/booking.entity';
import { Court } from '../court/entities/court.entity';
import { CourtAvailability } from '../court/entities/court-availability.entity';
import { Business } from '../business/entities/business.entity';
import { BusinessSchedule } from '../business/entities/business-schedule.entity';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { RejectBookingDto } from './dto/reject-booking.dto';
import { BookingStatus } from '../common/enums/booking-status.enum';
import { UserRole } from '../common/enums/user-role.enum';
import { DayOfWeek } from '../common/enums/day-of-week.enum';
import { CourtStatus } from '../common/enums/court-status.enum';

@Injectable()
export class BookingService {
  constructor(
    @InjectRepository(Booking)
    private bookingRepository: Repository<Booking>,
    @InjectRepository(Court)
    private courtRepository: Repository<Court>,
    @InjectRepository(CourtAvailability)
    private availabilityRepository: Repository<CourtAvailability>,
    @InjectRepository(Business)
    private businessRepository: Repository<Business>,
    @InjectRepository(BusinessSchedule)
    private businessScheduleRepository: Repository<BusinessSchedule>,
  ) {}

  // ─── Create ────────────────────────────────────────────────────────────────

  async create(
    dto: CreateBookingDto,
    paymentProofUrl: string,
    clientId: string,
  ): Promise<Booking> {
    const { courtId, date, startTime, endTime, paymentMethod, notes } = dto;

    // 1. Cancha existe y está disponible
    const court = await this.courtRepository.findOne({
      where: { id: courtId },
      relations: ['business'],
    });
    if (!court) throw new NotFoundException('Cancha no encontrada');
    if (court.status !== CourtStatus.AVAILABLE) {
      throw new BadRequestException('La cancha no está disponible para reservas');
    }

    // 2. Fecha no es en el pasado
    const todayStr = new Date().toISOString().split('T')[0];
    if (date < todayStr) {
      throw new BadRequestException('No se pueden crear reservas en fechas pasadas');
    }

    // 3. Validar horas
    const toMinutes = (t: string): number => {
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    };
    const startMin = toMinutes(startTime);
    const endMin = toMinutes(endTime);

    if (startMin >= endMin) {
      throw new BadRequestException('La hora de inicio debe ser menor a la hora de fin');
    }

    const durationMinutes = endMin - startMin;
    if (durationMinutes < 60) {
      throw new BadRequestException('La reserva debe ser de mínimo 1 hora');
    }
    if (durationMinutes % 60 !== 0) {
      throw new BadRequestException('La duración debe ser en horas completas (ej: 1h, 2h, 3h)');
    }
    const durationHours = durationMinutes / 60;

    // 4. Disponibilidad de la cancha para ese día
    const dayOfWeek = this.getDayOfWeek(date);
    const availability = await this.availabilityRepository.findOne({
      where: { courtId, dayOfWeek, isAvailable: true },
    });
    if (!availability) {
      throw new BadRequestException(
        `La cancha no tiene disponibilidad configurada para el día ${dayOfWeek}`,
      );
    }
    const avStartMin = toMinutes(availability.startTime);
    const avEndMin = toMinutes(availability.endTime);
    if (startMin < avStartMin || endMin > avEndMin) {
      throw new BadRequestException(
        `El horario solicitado está fuera de la disponibilidad de la cancha (${availability.startTime}-${availability.endTime})`,
      );
    }

    // 5. Horario del negocio cubre el rango solicitado
    const businessSchedule = await this.businessScheduleRepository.findOne({
      where: { businessId: court.businessId, dayOfWeek, isOpen: true },
    });
    if (!businessSchedule) {
      throw new BadRequestException(`El negocio no opera el día ${dayOfWeek}`);
    }
    const busOpenMin = toMinutes(businessSchedule.openTime);
    const busCloseMin = toMinutes(businessSchedule.closeTime);
    if (startMin < busOpenMin || endMin > busCloseMin) {
      throw new BadRequestException(
        `El horario solicitado está fuera del horario del negocio (${businessSchedule.openTime}-${businessSchedule.closeTime})`,
      );
    }

    // 6. Sin conflicto con reservas existentes
    const conflict = await this.bookingRepository
      .createQueryBuilder('b')
      .where('b.courtId = :courtId', { courtId })
      .andWhere('b.date = :date', { date })
      .andWhere('b.status NOT IN (:...statuses)', {
        statuses: [BookingStatus.CANCELLED, BookingStatus.NO_SHOW],
      })
      .andWhere('b.startTime < :endTime AND b.endTime > :startTime', {
        startTime,
        endTime,
      })
      .getOne();

    if (conflict) {
      throw new BadRequestException(
        'Ya existe una reserva para esta cancha en el horario solicitado',
      );
    }

    // 7. Calcular precio (el slot puede tener precio override)
    const pricePerHour =
      availability.pricePerHour != null
        ? Number(availability.pricePerHour)
        : Number(court.pricePerHour);
    const totalPrice = pricePerHour * durationHours;

    // 8. Crear reserva
    const booking = this.bookingRepository.create({
      courtId,
      clientId,
      date,
      startTime,
      endTime,
      durationHours,
      status: BookingStatus.PENDING,
      pricePerHour,
      totalPrice,
      paymentMethod,
      paymentProofUrl,
      isPaid: false,
      notes,
      createdBy: clientId,
    });

    return this.bookingRepository.save(booking);
  }

  // ─── Upload payment proof ─────────────────────────────────────────────────

  async uploadPaymentProof(
    id: string,
    paymentProofUrl: string,
    userId: string,
  ): Promise<Booking> {
    const booking = await this.bookingRepository.findOne({ where: { id } });
    if (!booking) throw new NotFoundException('Reserva no encontrada');

    if (booking.clientId !== userId) {
      throw new ForbiddenException('Solo el cliente que creó la reserva puede subir el comprobante');
    }

    if (booking.status !== BookingStatus.PENDING) {
      throw new BadRequestException('Solo se puede actualizar el comprobante de reservas pendientes');
    }

    booking.paymentProofUrl = paymentProofUrl;
    return this.bookingRepository.save(booking);
  }

  // ─── Read ──────────────────────────────────────────────────────────────────

  async findAll(): Promise<Booking[]> {
    return this.bookingRepository.find({
      relations: ['court', 'court.business', 'client'],
      order: { date: 'DESC', startTime: 'ASC' },
    });
  }

  async findMyBookings(clientId: string): Promise<Booking[]> {
    return this.bookingRepository.find({
      where: { clientId },
      relations: ['court', 'court.business'],
      order: { date: 'DESC', startTime: 'ASC' },
    });
  }

  async findByCourt(
    courtId: string,
    userId: string,
    userRole: UserRole,
  ): Promise<Booking[]> {
    await this.validateCourtOwnership(courtId, userId, userRole);
    return this.bookingRepository.find({
      where: { courtId },
      relations: ['client'],
      order: { date: 'DESC', startTime: 'ASC' },
    });
  }

  async findByBusiness(
    businessId: string,
    userId: string,
    userRole: UserRole,
  ): Promise<Booking[]> {
    const business = await this.businessRepository.findOne({
      where: { id: businessId },
    });
    if (!business) throw new NotFoundException('Negocio no encontrado');
    if (business.ownerId !== userId && userRole !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException(
        'No tienes permiso para ver las reservas de este negocio',
      );
    }
    return this.bookingRepository
      .createQueryBuilder('b')
      .leftJoinAndSelect('b.court', 'court')
      .leftJoinAndSelect('b.client', 'client')
      .where('court.businessId = :businessId', { businessId })
      .orderBy('b.date', 'DESC')
      .addOrderBy('b.startTime', 'ASC')
      .getMany();
  }

  async findOne(
    id: string,
    userId: string,
    userRole: UserRole,
  ): Promise<Booking> {
    const booking = await this.bookingRepository.findOne({
      where: { id },
      relations: ['court', 'court.business', 'client'],
    });
    if (!booking) throw new NotFoundException('Reserva no encontrada');

    if (userRole === UserRole.CLIENT && booking.clientId !== userId) {
      throw new ForbiddenException('No tienes permiso para ver esta reserva');
    }
    if (
      userRole === UserRole.BUSSINES &&
      booking.court.business.ownerId !== userId
    ) {
      throw new ForbiddenException('No tienes permiso para ver esta reserva');
    }

    return booking;
  }

  // ─── State transitions ─────────────────────────────────────────────────────

  async confirm(
    id: string,
    userId: string,
    userRole: UserRole,
  ): Promise<Booking> {
    const booking = await this.getBookingWithCourt(id);
    this.assertBusinessOwnership(booking.court, userId, userRole);

    if (booking.status !== BookingStatus.PENDING) {
      throw new BadRequestException('Solo se pueden confirmar reservas pendientes');
    }

    booking.status = BookingStatus.CONFIRMED;
    booking.isPaid = true;
    return this.bookingRepository.save(booking);
  }

  async reject(
    id: string,
    userId: string,
    userRole: UserRole,
    dto: RejectBookingDto,
  ): Promise<Booking> {
    const booking = await this.getBookingWithCourt(id);
    this.assertBusinessOwnership(booking.court, userId, userRole);

    if (booking.status !== BookingStatus.PENDING) {
      throw new BadRequestException('Solo se pueden rechazar reservas pendientes');
    }

    booking.status = BookingStatus.CANCELLED;
    booking.cancelledAt = new Date();
    booking.cancellationReason = dto.cancellationReason;
    booking.cancelledBy = userId;
    return this.bookingRepository.save(booking);
  }

  async complete(
    id: string,
    userId: string,
    userRole: UserRole,
  ): Promise<Booking> {
    const booking = await this.getBookingWithCourt(id);
    this.assertBusinessOwnership(booking.court, userId, userRole);

    if (booking.status !== BookingStatus.CONFIRMED) {
      throw new BadRequestException('Solo se pueden completar reservas confirmadas');
    }

    booking.status = BookingStatus.COMPLETED;
    return this.bookingRepository.save(booking);
  }

  async noShow(
    id: string,
    userId: string,
    userRole: UserRole,
  ): Promise<Booking> {
    const booking = await this.getBookingWithCourt(id);
    this.assertBusinessOwnership(booking.court, userId, userRole);

    if (booking.status !== BookingStatus.CONFIRMED) {
      throw new BadRequestException(
        'Solo se puede marcar no-show en reservas confirmadas',
      );
    }

    booking.status = BookingStatus.NO_SHOW;
    return this.bookingRepository.save(booking);
  }

  async cancel(
    id: string,
    userId: string,
    userRole: UserRole,
    reason?: string,
  ): Promise<Booking> {
    const booking = await this.getBookingWithCourt(id);

    if (userRole === UserRole.CLIENT) {
      if (booking.clientId !== userId) {
        throw new ForbiddenException('No puedes cancelar reservas de otros usuarios');
      }
    } else if (userRole === UserRole.BUSSINES) {
      this.assertBusinessOwnership(booking.court, userId, userRole);
    }

    if (
      [
        BookingStatus.CANCELLED,
        BookingStatus.COMPLETED,
        BookingStatus.NO_SHOW,
      ].includes(booking.status)
    ) {
      throw new BadRequestException('Esta reserva no puede ser cancelada');
    }

    booking.status = BookingStatus.CANCELLED;
    booking.cancelledAt = new Date();
    booking.cancelledBy = userId;
    if (reason) booking.cancellationReason = reason;
    return this.bookingRepository.save(booking);
  }

  async update(
    id: string,
    userId: string,
    userRole: UserRole,
    dto: UpdateBookingDto,
  ): Promise<Booking> {
    const booking = await this.getBookingWithCourt(id);
    this.assertBusinessOwnership(booking.court, userId, userRole);
    Object.assign(booking, dto);
    return this.bookingRepository.save(booking);
  }

  // ─── Available slots by date ───────────────────────────────────────────────

  async getAvailableSlotsByDate(
    courtId: string,
    date: string,
  ): Promise<{
    date: string;
    dayOfWeek: DayOfWeek;
    courtId: string;
    slots: {
      startTime: string;
      endTime: string;
      isAvailable: boolean;
      pricePerHour: number;
    }[];
  }> {
    const court = await this.courtRepository.findOne({ where: { id: courtId } });
    if (!court) throw new NotFoundException('Cancha no encontrada');

    const dayOfWeek = this.getDayOfWeek(date);
    const availabilitySlots = await this.availabilityRepository.find({
      where: { courtId, dayOfWeek, isAvailable: true },
      order: { startTime: 'ASC' },
    });

    if (availabilitySlots.length === 0) {
      return { date, dayOfWeek, courtId, slots: [] };
    }

    const activeBookings = await this.bookingRepository
      .createQueryBuilder('b')
      .where('b.courtId = :courtId', { courtId })
      .andWhere('b.date = :date', { date })
      .andWhere('b.status NOT IN (:...statuses)', {
        statuses: [BookingStatus.CANCELLED, BookingStatus.NO_SHOW],
      })
      .getMany();

    const toMinutes = (t: string): number => {
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    };
    const toTime = (minutes: number): string => {
      const h = Math.floor(minutes / 60).toString().padStart(2, '0');
      const m = (minutes % 60).toString().padStart(2, '0');
      return `${h}:${m}`;
    };

    const result: {
      startTime: string;
      endTime: string;
      isAvailable: boolean;
      pricePerHour: number;
    }[] = [];

    for (const slot of availabilitySlots) {
      const slotStart = toMinutes(slot.startTime);
      const slotEnd = toMinutes(slot.endTime);
      const pricePerHour =
        slot.pricePerHour != null
          ? Number(slot.pricePerHour)
          : Number(court.pricePerHour);

      // Generar bloques de 1 hora dentro del slot de disponibilidad
      for (let start = slotStart; start < slotEnd; start += 60) {
        const end = start + 60;
        const isBooked = activeBookings.some(
          (b) => toMinutes(b.startTime) < end && toMinutes(b.endTime) > start,
        );
        result.push({
          startTime: toTime(start),
          endTime: toTime(end),
          isAvailable: !isBooked,
          pricePerHour,
        });
      }
    }

    return { date, dayOfWeek, courtId, slots: result };
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  private getDayOfWeek(dateStr: string): DayOfWeek {
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    const map: DayOfWeek[] = [
      DayOfWeek.SUNDAY,
      DayOfWeek.MONDAY,
      DayOfWeek.TUESDAY,
      DayOfWeek.WEDNESDAY,
      DayOfWeek.THURSDAY,
      DayOfWeek.FRIDAY,
      DayOfWeek.SATURDAY,
    ];
    return map[date.getDay()];
  }

  private async getBookingWithCourt(id: string): Promise<Booking> {
    const booking = await this.bookingRepository.findOne({
      where: { id },
      relations: ['court', 'court.business'],
    });
    if (!booking) throw new NotFoundException('Reserva no encontrada');
    return booking;
  }

  private assertBusinessOwnership(
    court: Court,
    userId: string,
    userRole: UserRole,
  ): void {
    if (
      userRole !== UserRole.SUPER_ADMIN &&
      court.business.ownerId !== userId
    ) {
      throw new ForbiddenException(
        'No tienes permiso para gestionar reservas de esta cancha',
      );
    }
  }

  private async validateCourtOwnership(
    courtId: string,
    userId: string,
    userRole: UserRole,
  ): Promise<void> {
    if (userRole === UserRole.SUPER_ADMIN) return;
    const court = await this.courtRepository.findOne({
      where: { id: courtId },
      relations: ['business'],
    });
    if (!court) throw new NotFoundException('Cancha no encontrada');
    if (court.business.ownerId !== userId) {
      throw new ForbiddenException(
        'No tienes permiso para ver las reservas de esta cancha',
      );
    }
  }
}
