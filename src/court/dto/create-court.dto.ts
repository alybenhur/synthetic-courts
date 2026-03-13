import {
  IsString,
  IsOptional,
  IsNumber,
  IsObject,
  IsEnum,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CourtType } from '../../common/enums/court-type.enum';
import { CourtStatus } from '../../common/enums/court-status.enum';

export class CreateCourtDto {
  @ApiProperty({ example: 'Cancha 1' })
  @IsString()
  name: string;

  @ApiProperty({ 
    example: 'football_5', 
    enum: CourtType,
    description: 'Tipo de cancha'
  })
  @IsEnum(CourtType)
  type: CourtType;

  @ApiPropertyOptional({ example: 'Cancha sintética con iluminación LED' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 50000, description: 'Precio por hora en pesos' })
  @IsNumber()
  @Min(0)
  pricePerHour: number;

  @ApiPropertyOptional({ 
    example: 'available', 
    enum: CourtStatus,
    default: CourtStatus.AVAILABLE 
  })
  @IsOptional()
  @IsEnum(CourtStatus)
  status?: CourtStatus;

  @ApiPropertyOptional({
    example: { 
      roofed: true, 
      lighting: 'LED', 
      surface: 'synthetic',
      lockers: true,
      showers: 2
    },
    description: 'Características de la cancha en formato JSON',
  })
  @IsOptional()
  @IsObject()
  features?: Record<string, any>;

  @ApiProperty({ example: 'business-uuid-here', description: 'ID del negocio' })
  @IsString()
  businessId: string;
}