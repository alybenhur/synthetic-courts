import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Court } from './court.entity';
import { DayOfWeek } from '../../common/enums/day-of-week.enum';

@Entity('court_availability')
export class CourtAvailability {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: DayOfWeek,
  })
  dayOfWeek: DayOfWeek;

  @Column({ type: 'time' })
  startTime: string;

  @Column({ type: 'time' })
  endTime: string;

  @Column({ default: true })
  isAvailable: boolean;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  pricePerHour: number | null;

  @ManyToOne(() => Court, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'courtId' })
  court: Court;

  @Column()
  courtId: string;
}