import 'multer';
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { BookingService } from './booking.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { RejectBookingDto } from './dto/reject-booking.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles, CurrentUser } from '../common/decorators/auth.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

@ApiTags('Bookings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('bookings')
export class BookingController {
  constructor(
    private readonly bookingService: BookingService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  // ─── POST /bookings ────────────────────────────────────────────────────────

  @Post()
  @Roles(UserRole.CLIENT)
  @UseInterceptors(FileInterceptor('paymentProof'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Crear una reserva',
    description:
      'El cliente envía los datos de la reserva junto con el comprobante de pago. La reserva queda en estado PENDING hasta que el administrador del negocio verifique el pago.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['courtId', 'date', 'startTime', 'endTime', 'paymentMethod', 'paymentProof'],
      properties: {
        courtId: { type: 'string', format: 'uuid' },
        date: { type: 'string', example: '2026-04-15' },
        startTime: { type: 'string', example: '14:00' },
        endTime: { type: 'string', example: '16:00' },
        paymentMethod: { type: 'string', enum: ['nequi', 'transferencia'] },
        notes: { type: 'string', example: 'Traer chalecos' },
        paymentProof: { type: 'string', format: 'binary', description: 'Imagen del comprobante de pago' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Reserva creada, pendiente de confirmación' })
  @ApiResponse({ status: 400, description: 'Datos inválidos, conflicto de horario o comprobante faltante' })
  @ApiResponse({ status: 404, description: 'Cancha no encontrada' })
  async create(
    @Body() createBookingDto: CreateBookingDto,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: any,
  ) {
    if (!file) {
      throw new BadRequestException('El comprobante de pago es obligatorio');
    }
    const [paymentProofUrl] = await this.cloudinaryService.uploadImages([file]);
    return this.bookingService.create(createBookingDto, paymentProofUrl, user.id);
  }

  // ─── GET /bookings ─────────────────────────────────────────────────────────

  @Get()
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Listar todas las reservas (Solo Super Admin)' })
  @ApiResponse({ status: 200, description: 'Lista de todas las reservas' })
  findAll() {
    return this.bookingService.findAll();
  }

  // ─── GET /bookings/my-bookings ─────────────────────────────────────────────

  @Get('my-bookings')
  @Roles(UserRole.CLIENT)
  @ApiOperation({ summary: 'Ver mis reservas (Cliente)' })
  @ApiResponse({ status: 200, description: 'Reservas del cliente autenticado' })
  findMyBookings(@CurrentUser() user: any) {
    return this.bookingService.findMyBookings(user.id);
  }

  // ─── GET /bookings/court/:courtId/available-slots?date= ───────────────────

  @Get('court/:courtId/available-slots')
  @ApiOperation({
    summary: 'Ver slots disponibles de una cancha para una fecha',
    description: 'Retorna bloques de 1 hora indicando cuáles están disponibles y cuáles ya están reservados.',
  })
  @ApiQuery({
    name: 'date',
    required: true,
    example: '2026-04-15',
    description: 'Fecha en formato YYYY-MM-DD',
  })
  @ApiResponse({ status: 200, description: 'Slots disponibles para la fecha' })
  @ApiResponse({ status: 400, description: 'Parámetro date requerido' })
  @ApiResponse({ status: 404, description: 'Cancha no encontrada' })
  getAvailableSlots(
    @Param('courtId') courtId: string,
    @Query('date') date: string,
  ) {
    if (!date) {
      throw new BadRequestException('El parámetro date es requerido (YYYY-MM-DD)');
    }
    return this.bookingService.getAvailableSlotsByDate(courtId, date);
  }

  // ─── GET /bookings/court/:courtId ─────────────────────────────────────────

  @Get('court/:courtId')
  @Roles(UserRole.BUSSINES, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Ver reservas de una cancha (Negocio/Admin)' })
  @ApiResponse({ status: 200, description: 'Reservas de la cancha' })
  @ApiResponse({ status: 403, description: 'No es dueño de esta cancha' })
  findByCourt(
    @Param('courtId') courtId: string,
    @CurrentUser() user: any,
  ) {
    return this.bookingService.findByCourt(courtId, user.id, user.role);
  }

  // ─── GET /bookings/business/:businessId ───────────────────────────────────

  @Get('business/:businessId')
  @Roles(UserRole.BUSSINES, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Ver todas las reservas de un negocio (Negocio/Admin)' })
  @ApiResponse({ status: 200, description: 'Reservas del negocio' })
  @ApiResponse({ status: 403, description: 'No es dueño de este negocio' })
  findByBusiness(
    @Param('businessId') businessId: string,
    @CurrentUser() user: any,
  ) {
    return this.bookingService.findByBusiness(businessId, user.id, user.role);
  }

  // ─── GET /bookings/:id ─────────────────────────────────────────────────────

  @Get(':id')
  @ApiOperation({ summary: 'Ver detalle de una reserva' })
  @ApiResponse({ status: 200, description: 'Detalle de la reserva' })
  @ApiResponse({ status: 403, description: 'Sin permiso para ver esta reserva' })
  @ApiResponse({ status: 404, description: 'Reserva no encontrada' })
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.bookingService.findOne(id, user.id, user.role);
  }

  // ─── POST /bookings/:id/payment-proof ─────────────────────────────────────

  @Post(':id/payment-proof')
  @Roles(UserRole.CLIENT)
  @UseInterceptors(FileInterceptor('paymentProof'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Subir o reemplazar comprobante de pago (Cliente)',
    description: 'Permite al cliente subir el comprobante de pago a una reserva existente en estado PENDING.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['paymentProof'],
      properties: {
        paymentProof: {
          type: 'string',
          format: 'binary',
          description: 'Imagen del comprobante de pago',
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Comprobante subido correctamente' })
  @ApiResponse({ status: 400, description: 'Archivo faltante o reserva no está en estado pendiente' })
  @ApiResponse({ status: 403, description: 'No eres el cliente de esta reserva' })
  @ApiResponse({ status: 404, description: 'Reserva no encontrada' })
  async uploadPaymentProof(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: any,
  ) {
    if (!file) {
      throw new BadRequestException('El comprobante de pago es obligatorio');
    }
    const [paymentProofUrl] = await this.cloudinaryService.uploadImages([file]);
    return this.bookingService.uploadPaymentProof(id, paymentProofUrl, user.id);
  }

  // ─── PATCH /bookings/:id ───────────────────────────────────────────────────

  @Patch(':id')
  @Roles(UserRole.BUSSINES, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Actualizar notas de una reserva (Negocio/Admin)' })
  @ApiResponse({ status: 200, description: 'Reserva actualizada' })
  update(
    @Param('id') id: string,
    @Body() updateBookingDto: UpdateBookingDto,
    @CurrentUser() user: any,
  ) {
    return this.bookingService.update(id, user.id, user.role, updateBookingDto);
  }

  // ─── DELETE /bookings/:id ──────────────────────────────────────────────────

  @Delete(':id')
  @ApiOperation({
    summary: 'Cancelar una reserva',
    description: 'El cliente puede cancelar sus propias reservas. El negocio puede cancelar cualquier reserva de sus canchas.',
  })
  @ApiResponse({ status: 200, description: 'Reserva cancelada' })
  @ApiResponse({ status: 400, description: 'La reserva no puede ser cancelada' })
  @ApiResponse({ status: 403, description: 'Sin permiso' })
  cancel(@Param('id') id: string, @CurrentUser() user: any) {
    return this.bookingService.cancel(id, user.id, user.role);
  }

  // ─── POST /bookings/:id/confirm ────────────────────────────────────────────

  @Post(':id/confirm')
  @Roles(UserRole.BUSSINES)
  @ApiOperation({
    summary: 'Confirmar reserva (Negocio)',
    description: 'El administrador del negocio verifica el comprobante de pago y confirma la reserva.',
  })
  @ApiResponse({ status: 200, description: 'Reserva confirmada, pago registrado' })
  @ApiResponse({ status: 400, description: 'Solo se pueden confirmar reservas pendientes' })
  confirm(@Param('id') id: string, @CurrentUser() user: any) {
    return this.bookingService.confirm(id, user.id, user.role);
  }

  // ─── POST /bookings/:id/reject ─────────────────────────────────────────────

  @Post(':id/reject')
  @Roles(UserRole.BUSSINES, UserRole.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Rechazar reserva por pago inválido (Negocio)',
    description: 'El administrador rechaza el comprobante de pago. La reserva pasa a estado CANCELLED.',
  })
  @ApiResponse({ status: 200, description: 'Reserva rechazada y cancelada' })
  @ApiResponse({ status: 400, description: 'Solo se pueden rechazar reservas pendientes' })
  reject(
    @Param('id') id: string,
    @Body() rejectDto: RejectBookingDto,
    @CurrentUser() user: any,
  ) {
    return this.bookingService.reject(id, user.id, user.role, rejectDto);
  }

  // ─── POST /bookings/:id/complete ───────────────────────────────────────────

  @Post(':id/complete')
  @Roles(UserRole.BUSSINES, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Marcar reserva como completada (Negocio)' })
  @ApiResponse({ status: 200, description: 'Reserva completada' })
  @ApiResponse({ status: 400, description: 'Solo se pueden completar reservas confirmadas' })
  complete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.bookingService.complete(id, user.id, user.role);
  }

  // ─── POST /bookings/:id/no-show ────────────────────────────────────────────

  @Post(':id/no-show')
  @Roles(UserRole.BUSSINES, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Marcar reserva como no-show (Negocio)' })
  @ApiResponse({ status: 200, description: 'Reserva marcada como no-show' })
  @ApiResponse({ status: 400, description: 'Solo se puede marcar no-show en reservas confirmadas' })
  noShow(@Param('id') id: string, @CurrentUser() user: any) {
    return this.bookingService.noShow(id, user.id, user.role);
  }
}
