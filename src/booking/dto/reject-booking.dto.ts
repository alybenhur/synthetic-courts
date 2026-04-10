import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class RejectBookingDto {
  @ApiProperty({
    example: 'El comprobante no corresponde al monto correcto',
    description: 'Razón por la que se rechaza el pago y se cancela la reserva',
  })
  @IsString()
  @IsNotEmpty()
  cancellationReason: string;
}
