import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Business } from './entities/business.entity';
import { BusinessSchedule } from './entities/business-schedule.entity';
import { User } from '../user/entities/user.entity';
import { CreateBusinessDto } from './dto/create-business.dto';
import { UpdateBusinessDto } from './dto/update-business.dto';
import { UserRole } from '../common/enums/user-role.enum';
import { DayOfWeek } from '../common/enums/day-of-week.enum';

@Injectable()
export class BusinessService {
  constructor(
    @InjectRepository(Business)
    private businessRepository: Repository<Business>,
    @InjectRepository(BusinessSchedule)
    private scheduleRepository: Repository<BusinessSchedule>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async create(createBusinessDto: CreateBusinessDto): Promise<Business> {
    const { schedules, ownerId, ...businessData } = createBusinessDto;

    const owner = await this.userRepository.findOne({ where: { id: ownerId } });

    if (!owner) {
      throw new NotFoundException(`Usuario con ID ${ownerId} no encontrado`);
    }

    if (owner.role !== UserRole.BUSSINES) {
      throw new BadRequestException(
        'El usuario propietario debe tener rol BUSSINES',
      );
    }

    const business = this.businessRepository.create({
      ...businessData,
      ownerId,
    });

    const savedBusiness = await this.businessRepository.save(business);

    if (schedules && schedules.length > 0) {
      const scheduleEntities = schedules.map((schedule) =>
        this.scheduleRepository.create({
          dayOfWeek: schedule.dayOfWeek as DayOfWeek,
          openTime: schedule.openTime,
          closeTime: schedule.closeTime,
          isOpen: schedule.isOpen ?? true,
          businessId: savedBusiness.id,
        }),
      );

      await this.scheduleRepository.save(scheduleEntities);
    }

    return this.findOne(savedBusiness.id);
  }

  async findAll(): Promise<Business[]> {
    return this.businessRepository.find({
      where: { isActive: true },
      relations: ['schedules', 'owner'],
      select: {
        owner: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    });
  }

  async findOne(id: string): Promise<Business> {
    const business = await this.businessRepository.findOne({
      where: { id },
      relations: ['schedules', 'owner'],
      select: {
        owner: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    });

    if (!business) {
      throw new NotFoundException(`Negocio con ID ${id} no encontrado`);
    }

    return business;
  }

  async findByOwner(ownerId: string): Promise<Business[]> {
    return this.businessRepository.find({
      where: { ownerId, isActive: true },
      relations: ['schedules'],
    });
  }

  async update(
    id: string,
    updateBusinessDto: UpdateBusinessDto,
    userId: string,
    userRole: UserRole,
  ): Promise<Business> {
    const business = await this.findOne(id);

    if (business.ownerId !== userId && userRole !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException(
        'No tienes permiso para actualizar este negocio',
      );
    }

    const { schedules, ...businessData } = updateBusinessDto;

    Object.assign(business, businessData);
    await this.businessRepository.save(business);

    if (schedules) {
      await this.scheduleRepository.delete({ businessId: id });

      if (schedules.length > 0) {
        const scheduleEntities = schedules.map((schedule) =>
          this.scheduleRepository.create({
            dayOfWeek: schedule.dayOfWeek as DayOfWeek,
            openTime: schedule.openTime,
            closeTime: schedule.closeTime,
            isOpen: schedule.isOpen ?? true,
            businessId: id,
          }),
        );

        await this.scheduleRepository.save(scheduleEntities);
      }
    }

    return this.findOne(id);
  }

  async remove(
    id: string,
    userId: string,
    userRole: UserRole,
  ): Promise<void> {
    const business = await this.findOne(id);

    if (business.ownerId !== userId && userRole !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException(
        'No tienes permiso para eliminar este negocio',
      );
    }

    business.isActive = false;
    await this.businessRepository.save(business);
  }
}