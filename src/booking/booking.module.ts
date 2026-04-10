import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BookingService } from './booking.service';
import { BookingController } from './booking.controller';
import { Booking } from './entities/booking.entity';
import { Court } from '../court/entities/court.entity';
import { CourtAvailability } from '../court/entities/court-availability.entity';
import { Business } from '../business/entities/business.entity';
import { BusinessSchedule } from '../business/entities/business-schedule.entity';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Booking,
      Court,
      CourtAvailability,
      Business,
      BusinessSchedule,
    ]),
    CloudinaryModule,
  ],
  controllers: [BookingController],
  providers: [BookingService],
  exports: [BookingService],
})
export class BookingModule {}
