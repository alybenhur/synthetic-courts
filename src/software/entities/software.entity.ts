import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';
import { SoftwareStatus } from '../../common/enums/user-role.enum';

@Entity('software')
export class Software {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 255 })
  nombre: string;

  @CreateDateColumn({ name: 'fecha_creacion' })
  fechaCreacion: Date;

  @Column({ type: 'text', nullable: true })
  tags: string;

  @Column({ type: 'text', nullable: true, name: 'url_imagen' })
  urlImagen: string | null;

  @Column({ type: 'text', nullable: true })
  descripcion: string;

  @Column({ length: 500, nullable: true, name: 'url_aplicacion' })
  urlAplicacion: string;

  @Column({ length: 500, nullable: true })
  autores: string;

  @Column({
    type: 'decimal',
    precision: 3,
    scale: 1,
    nullable: true,
    default: 0,
  })
  valoracion: number;

  @Column({
    type: 'enum',
    enum: SoftwareStatus,
    default: SoftwareStatus.ACTIVO,
  })
  estado: SoftwareStatus;
}