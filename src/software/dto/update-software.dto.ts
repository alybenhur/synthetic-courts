import { PartialType } from '@nestjs/swagger';
import { CreateSoftwareDto } from './create-software.dto';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UpdateSoftwareDto extends PartialType(CreateSoftwareDto) {
  @ApiPropertyOptional({
    example: 'https://res.cloudinary.com/.../imagen1.jpg',
    description:
      'URLs de imágenes a eliminar (separadas por coma). Se eliminarán de Cloudinary y del registro.',
  })
  @IsOptional()
  @IsString()
  imagenesAEliminar?: string;
}