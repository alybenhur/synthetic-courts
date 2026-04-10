import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsUUID,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';
import { PaymentMethod } from '../../common/enums/payment-method.enum';

export class CreateBookingDto {
  @ApiProperty({ example: 'uuid-de-la-cancha' })
  @IsUUID()
  courtId: string;

  @ApiProperty({
    example: '2026-04-15',
    description: 'Fecha de la reserva (YYYY-MM-DD)',
  })
  @IsDateString()
  date: string;

  @ApiProperty({ example: '14:00', description: 'Hora de inicio (HH:MM)' })
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'startTime debe tener formato HH:MM',
  })
  startTime: string;

  @ApiProperty({ example: '16:00', description: 'Hora de fin (HH:MM)' })
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'endTime debe tener formato HH:MM',
  })
  endTime: string;

  @ApiProperty({
    enum: PaymentMethod,
    example: PaymentMethod.NEQUI,
    description: 'Método de pago utilizado',
  })
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @ApiPropertyOptional({ example: 'Traer chalecos rojos' })
  @IsOptional()
  @IsString()
  notes?: string;
}
