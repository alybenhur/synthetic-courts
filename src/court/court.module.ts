import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CourtService } from './court.service';
import { CourtController } from './court.controller';
import { Court } from './entities/court.entity';
import { CourtAvailability } from './entities/court-availability.entity';
import { Business } from '../business/entities/business.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Court, CourtAvailability, Business])],
  controllers: [CourtController],
  providers: [CourtService],
  exports: [CourtService],
})
export class CourtModule {}