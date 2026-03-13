import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Business } from '../../business/entities/business.entity';
import { CourtAvailability } from './court-availability.entity';
import { CourtType } from '../../common/enums/court-type.enum';
import { CourtStatus } from '../../common/enums/court-status.enum';

@Entity('courts')
export class Court {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({
    type: 'enum',
    enum: CourtType,
  })
  type: CourtType;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  pricePerHour: number;

  @Column({
    type: 'enum',
    enum: CourtStatus,
    default: CourtStatus.AVAILABLE,
  })
  status: CourtStatus;

  @Column({ type: 'json', nullable: true })
  features: Record<string, any>;

  @ManyToOne(() => Business, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'businessId' })
  business: Business;

  @Column()
  businessId: string;

  @OneToMany(() => CourtAvailability, (availability) => availability.court, {
    cascade: true,
  })
  availability: CourtAvailability[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}