import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SoftwareService } from './software.service';
import { SoftwareController } from './software.controller';
import { Software } from './entities/software.entity';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Software]),
    CloudinaryModule,
  ],
  controllers: [SoftwareController],
  providers: [SoftwareService],
})
export class SoftwareModule {}