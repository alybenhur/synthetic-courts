import {
  IsString,
  IsEmail,
  IsOptional,
  IsNumber,
  IsObject,
  IsArray,
  ValidateNested,
  Min,
  Max,
  IsEnum,
  IsBoolean,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DayOfWeek } from '../../common/enums/day-of-week.enum';

class ScheduleDto {
  @ApiProperty({ 
    example: 'monday', 
    enum: DayOfWeek,
    description: 'Día de la semana'
  })
  @IsEnum(DayOfWeek, {
    message: 'dayOfWeek debe ser un día válido: monday, tuesday, wednesday, thursday, friday, saturday, sunday'
  })
  dayOfWeek: DayOfWeek;

  @ApiProperty({ example: '08:00', description: 'Hora de apertura (formato HH:MM)' })
  @IsString()
  openTime: string;

  @ApiProperty({ example: '22:00', description: 'Hora de cierre (formato HH:MM)' })
  @IsString()
  closeTime: string;

  @ApiPropertyOptional({ example: true, description: 'Indica si el negocio abre este día' })
  @IsOptional()
  @IsBoolean()
  isOpen?: boolean;
}

export class CreateBusinessDto {
  @ApiProperty({
    example: 'uuid-del-usuario-bussines',
    description: 'ID del usuario con rol BUSSINES al que pertenecerá el negocio',
  })
  @IsUUID()
  ownerId: string;

  @ApiProperty({ example: 'Canchas El Estadio' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'Las mejores canchas sintéticas de la ciudad' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: '+57 300 1234567' })
  @IsString()
  phone: string;

  @ApiPropertyOptional({ example: 'contact@elestadio.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ example: 'Calle 123 #45-67, Bogotá' })
  @IsString()
  address: string;

  @ApiProperty({ example: 4.6097, description: 'Latitud GPS' })
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @ApiProperty({ example: -74.0817, description: 'Longitud GPS' })
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;

  @ApiPropertyOptional({
    example: { parking: true, cafeteria: true, bathrooms: 4 },
    description: 'Características del negocio en formato JSON',
  })
  @IsOptional()
  @IsObject()
  features?: Record<string, any>;

  @ApiProperty({
    type: [ScheduleDto],
    description: 'Horarios de funcionamiento por día',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ScheduleDto)
  schedules: ScheduleDto[];
}