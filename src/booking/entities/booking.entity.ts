import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Court } from '../../court/entities/court.entity';
import { User } from '../../user/entities/user.entity';
import { BookingStatus } from '../../common/enums/booking-status.enum';
import { PaymentMethod } from '../../common/enums/payment-method.enum';

@Entity('bookings')
export class Booking {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // ─── Relations ──────────────────────────────────────────────────────────────

  @ManyToOne(() => Court, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'courtId' })
  court: Court;

  @Column()
  courtId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'clientId' })
  client: User;

  @Column()
  clientId: string;

  // ─── Date & Time ────────────────────────────────────────────────────────────

  @Column({ type: 'date' })
  date: string;

  @Column({ type: 'time' })
  startTime: string;

  @Column({ type: 'time' })
  endTime: string;

  @Column({ type: 'decimal', precision: 4, scale: 1 })
  durationHours: number;

  // ─── Status ─────────────────────────────────────────────────────────────────

  @Column({
    type: 'enum',
    enum: BookingStatus,
    default: BookingStatus.PENDING,
  })
  status: BookingStatus;

  // ─── Pricing (snapshot al momento de la reserva) ────────────────────────────

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  pricePerHour: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  totalPrice: number;

  // ─── Payment ────────────────────────────────────────────────────────────────

  @Column({
    type: 'enum',
    enum: PaymentMethod,
  })
  paymentMethod: PaymentMethod;

  @Column()
  paymentProofUrl: string;

  @Column({ default: false })
  isPaid: boolean;

  // ─── Notes ──────────────────────────────────────────────────────────────────

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'text', nullable: true })
  adminNotes: string;

  // ─── Cancellation ───────────────────────────────────────────────────────────

  @Column({ type: 'datetime', nullable: true })
  cancelledAt: Date;

  @Column({ type: 'text', nullable: true })
  cancellationReason: string;

  @Column({ nullable: true })
  cancelledBy: string;

  // ─── Audit ──────────────────────────────────────────────────────────────────

  @Column()
  createdBy: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
