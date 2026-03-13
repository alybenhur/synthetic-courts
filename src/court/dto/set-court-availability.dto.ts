import {
  IsString,
  IsEnum,
  IsBoolean,
  IsOptional,
  ValidateNested,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DayOfWeek } from '../../common/enums/day-of-week.enum';

export class AvailabilitySlotDto {
  @ApiProperty({ 
    example: 'monday', 
    enum: DayOfWeek,
    description: 'Día de la semana'
  })
  @IsEnum(DayOfWeek)
  dayOfWeek: DayOfWeek;

  @ApiProperty({ 
    example: '08:00', 
    description: 'Hora de inicio (formato HH:MM, slots de 1 hora mínimo)' 
  })
  @IsString()
  startTime: string;

  @ApiProperty({ 
    example: '09:00', 
    description: 'Hora de fin (formato HH:MM)' 
  })
  @IsString()
  endTime: string;

  @ApiPropertyOptional({ 
    example: true, 
    description: 'Indica si está disponible en este horario',
    default: true
  })
  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;
}

export class SetCourtAvailabilityDto {
  @ApiProperty({
    type: [AvailabilitySlotDto],
    description: 'Slots de disponibilidad de la cancha por día y hora',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AvailabilitySlotDto)
  availability: AvailabilitySlotDto[];
}