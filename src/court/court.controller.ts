import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { CourtService } from './court.service';
import { CreateCourtDto } from './dto/create-court.dto';
import { UpdateCourtDto } from './dto/update-court.dto';
import { SetCourtAvailabilityDto } from './dto/set-court-availability.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles, CurrentUser } from '../common/decorators/auth.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { DayOfWeek } from '../common/enums/day-of-week.enum';

@ApiTags('Courts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('courts')
export class CourtController {
  constructor(private readonly courtService: CourtService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Crear nueva cancha' })
  @ApiResponse({ status: 201, description: 'Cancha creada exitosamente' })
  @ApiResponse({ status: 403, description: 'No autorizado' })
  @ApiResponse({ status: 404, description: 'Negocio no encontrado' })
  create(@Body() createCourtDto: CreateCourtDto, @CurrentUser() user: any) {
    return this.courtService.create(createCourtDto, user.id, user.role);
  }

  @Get()
  @ApiOperation({ summary: 'Listar todas las canchas' })
  @ApiResponse({ status: 200, description: 'Lista de canchas' })
  findAll() {
    return this.courtService.findAll();
  }

  @Get('by-business/:businessId')
  @ApiOperation({ summary: 'Listar canchas por negocio' })
  @ApiResponse({ status: 200, description: 'Lista de canchas del negocio' })
  findByBusiness(@Param('businessId') businessId: string) {
    return this.courtService.findByBusiness(businessId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener cancha por ID' })
  @ApiResponse({ status: 200, description: 'Cancha encontrada' })
  @ApiResponse({ status: 404, description: 'Cancha no encontrada' })
  findOne(@Param('id') id: string) {
    return this.courtService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Actualizar cancha' })
  @ApiResponse({ status: 200, description: 'Cancha actualizada' })
  @ApiResponse({ status: 403, description: 'No autorizado' })
  @ApiResponse({ status: 404, description: 'Cancha no encontrada' })
  update(
    @Param('id') id: string,
    @Body() updateCourtDto: UpdateCourtDto,
    @CurrentUser() user: any,
  ) {
    return this.courtService.update(id, updateCourtDto, user.id, user.role);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Eliminar cancha' })
  @ApiResponse({ status: 200, description: 'Cancha eliminada' })
  @ApiResponse({ status: 403, description: 'No autorizado' })
  @ApiResponse({ status: 404, description: 'Cancha no encontrada' })
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.courtService.remove(id, user.id, user.role);
  }

  @Post(':id/availability')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ 
    summary: 'Configurar horarios de disponibilidad de una cancha',
    description: 'Define los horarios en los que la cancha está disponible para reservas. Mínimo 1 hora por slot.'
  })
  @ApiResponse({ status: 200, description: 'Disponibilidad configurada exitosamente' })
  @ApiResponse({ status: 400, description: 'Slots inválidos (deben ser mínimo 1 hora)' })
  @ApiResponse({ status: 403, description: 'No autorizado' })
  @ApiResponse({ status: 404, description: 'Cancha no encontrada' })
  setAvailability(
    @Param('id') id: string,
    @Body() setAvailabilityDto: SetCourtAvailabilityDto,
    @CurrentUser() user: any,
  ) {
    return this.courtService.setAvailability(id, setAvailabilityDto, user.id, user.role);
  }

  @Get(':id/availability')
  @ApiOperation({ summary: 'Obtener horarios de disponibilidad de una cancha' })
  @ApiResponse({ status: 200, description: 'Horarios de disponibilidad' })
  @ApiResponse({ status: 404, description: 'Cancha no encontrada' })
  getAvailability(@Param('id') id: string) {
    return this.courtService.getAvailability(id);
  }

  @Get(':id/availability/:dayOfWeek')
  @ApiOperation({ summary: 'Obtener slots disponibles para un día específico' })
  @ApiParam({ 
    name: 'dayOfWeek', 
    enum: DayOfWeek,
    description: 'Día de la semana'
  })
  @ApiResponse({ status: 200, description: 'Slots disponibles para el día' })
  @ApiResponse({ status: 404, description: 'Cancha no encontrada' })
  getAvailableSlots(
    @Param('id') id: string,
    @Param('dayOfWeek') dayOfWeek: DayOfWeek,
  ) {
    return this.courtService.getAvailableSlots(id, dayOfWeek);
  }
}