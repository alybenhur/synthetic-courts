import 'multer';
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiQuery,
} from '@nestjs/swagger';
import { SoftwareService } from './software.service';
import { CreateSoftwareDto } from './dto/create-software.dto';
import { UpdateSoftwareDto } from './dto/update-software.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles, Public } from '../common/decorators/auth.decorator';
import { UserRole } from '../common/enums/user-role.enum';

@ApiTags('Software')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('software')
export class SoftwareController {
  constructor(private readonly softwareService: SoftwareService) {}

  // ─── POST /software ───────────────────────────────────────────────────────
  @Post()
  @Roles(UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @UseInterceptors(FilesInterceptor('imagenes', 10))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Crear software (Solo Super Admin)' })
  @ApiResponse({ status: 201, description: 'Software creado exitosamente' })
  create(
    @Body() createSoftwareDto: CreateSoftwareDto,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    return this.softwareService.create(createSoftwareDto, files);
  }

  // ─── GET /software ────────────────────────────────────────────────────────
  @Get()
  @Public()
  @ApiOperation({ summary: 'Listar software activo' })
  @ApiResponse({ status: 200, description: 'Lista de software activo' })
  findAll() {
    return this.softwareService.findAllActive();
  }

  // ─── GET /software/admin ──────────────────────────────────────────────────
  @Get('admin')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Listar todo el software incluyendo inactivos (Solo Super Admin)' })
  @ApiResponse({ status: 200, description: 'Lista completa de software' })
  findAllAdmin() {
    return this.softwareService.findAll();
  }

  // ─── GET /software/search?tag=xxx ─────────────────────────────────────────
  @Get('search')
  @Public()
  @ApiOperation({ summary: 'Buscar software por tag' })
  @ApiQuery({ name: 'tag', required: true, description: 'Tag a buscar' })
  @ApiResponse({ status: 200, description: 'Resultados de búsqueda' })
  search(@Query('tag') tag: string) {
    return this.softwareService.searchByTag(tag);
  }

  // ─── GET /software/:id ────────────────────────────────────────────────────
  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Obtener software por ID' })
  @ApiResponse({ status: 200, description: 'Software encontrado' })
  @ApiResponse({ status: 404, description: 'Software no encontrado' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.softwareService.findOne(id);
  }

  // ─── PATCH /software/:id ──────────────────────────────────────────────────
  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @UseInterceptors(FilesInterceptor('imagenes', 10))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Actualizar software (Solo Super Admin)' })
  @ApiResponse({ status: 200, description: 'Software actualizado' })
  @ApiResponse({ status: 404, description: 'Software no encontrado' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateSoftwareDto: UpdateSoftwareDto,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    return this.softwareService.update(id, updateSoftwareDto, files);
  }

  // ─── DELETE /software/:id ─────────────────────────────────────────────────
  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Eliminar software y sus imágenes (Solo Super Admin)' })
  @ApiResponse({ status: 200, description: 'Software eliminado' })
  @ApiResponse({ status: 404, description: 'Software no encontrado' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.softwareService.remove(id);
  }
}