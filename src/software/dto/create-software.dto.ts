import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUrl,
  IsEnum,
  IsNumber,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { SoftwareStatus } from '../../common/enums/user-role.enum';

export class CreateSoftwareDto {
  @ApiProperty({ example: 'Mi Aplicación', description: 'Nombre del software' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  nombre: string;

  @ApiPropertyOptional({
    example: 'educacion,herramienta,web',
    description: 'Tags separados por coma para búsqueda',
  })
  @IsOptional()
  @IsString()
  tags?: string;

  @ApiPropertyOptional({
    example: 'Una descripción del software',
    description: 'Descripción del software',
  })
  @IsOptional()
  @IsString()
  descripcion?: string;

  @ApiPropertyOptional({
    example: 'https://miaplicacion.com',
    description: 'URL de la aplicación',
  })
  @IsOptional()
  @IsUrl()
  @MaxLength(500)
  urlAplicacion?: string;

  @ApiPropertyOptional({
    example: 'Juan Pérez, María García',
    description: 'Autores del software',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  autores?: string;

  @ApiPropertyOptional({
    example: 4.5,
    description: 'Valoración del software (0 - 5)',
    minimum: 0,
    maximum: 5,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(5)
  @Type(() => Number)
  valoracion?: number;

  @ApiPropertyOptional({
    enum: SoftwareStatus,
    example: SoftwareStatus.ACTIVO,
    description: 'Estado del software',
  })
  @IsOptional()
  @IsEnum(SoftwareStatus)
  estado?: SoftwareStatus;
}