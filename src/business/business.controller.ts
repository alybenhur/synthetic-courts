import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { BusinessService } from './business.service';
import { CreateBusinessDto } from './dto/create-business.dto';
import { UpdateBusinessDto } from './dto/update-business.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles, CurrentUser, Public } from '../common/decorators/auth.decorator';
import { UserRole } from '../common/enums/user-role.enum';

@ApiTags('Business')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('businesses')
export class BusinessController {
  constructor(private readonly businessService: BusinessService) {}
 

  @Post()
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Crear nuevo negocio' })
  @ApiResponse({ status: 201, description: 'Negocio creado exitosamente' })
  create(@Body() createBusinessDto: CreateBusinessDto) {
    return this.businessService.create(createBusinessDto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar todos los negocios activos' })
  @ApiResponse({ status: 200, description: 'Lista de negocios' })
  findAll() {
    return this.businessService.findAll();
  }

  @Get('my-businesses')
  @Roles(UserRole.BUSSINES, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Obtener mis negocios' })
  @ApiResponse({ status: 200, description: 'Lista de negocios del usuario' })
  findMyBusinesses(@CurrentUser() user: any) {
    return this.businessService.findByOwner(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener negocio por ID' })
  @ApiResponse({ status: 200, description: 'Negocio encontrado' })
  @ApiResponse({ status: 404, description: 'Negocio no encontrado' })
  findOne(@Param('id') id: string) {
    return this.businessService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.BUSSINES, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Actualizar negocio' })
  @ApiResponse({ status: 200, description: 'Negocio actualizado' })
  @ApiResponse({ status: 403, description: 'No autorizado' })
  @ApiResponse({ status: 404, description: 'Negocio no encontrado' })
  update(
    @Param('id') id: string,
    @Body() updateBusinessDto: UpdateBusinessDto,
    @CurrentUser() user: any,
  ) {
    return this.businessService.update(
      id,
      updateBusinessDto,
      user.id,
      user.role,
    );
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Desactivar negocio' })
  @ApiResponse({ status: 200, description: 'Negocio desactivado' })
  @ApiResponse({ status: 403, description: 'No autorizado' })
  @ApiResponse({ status: 404, description: 'Negocio no encontrado' })
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.businessService.remove(id, user.id, user.role);
  }
}