import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UpdateBookingDto {
  @ApiPropertyOptional({ example: 'Pago verificado por llamada' })
  @IsOptional()
  @IsString()
  adminNotes?: string;

  @ApiPropertyOptional({ example: 'Llevar chalecos rojos' })
  @IsOptional()
  @IsString()
  notes?: string;
}
