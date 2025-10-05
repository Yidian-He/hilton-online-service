import { Types } from 'mongoose';
import { Reservation, ReservationStatus } from '../entities/reservation.entity';

export class ReservationResponseDto {
  _id: Types.ObjectId;
  guestName: string;
  
  // Contact Information
  guestPhone: string;
  guestEmail: string;
  
  // Reservation Details
  expectedArrivalDate: String;
  expectedArrivalTime: string;
  tableSize: number;
  specialRequests?: string;
  
  // Status
  status: ReservationStatus;
  
  // Metadata
  reservationCode: string;
  remarks?: string;
  approvedBy?: Types.ObjectId;
  cancelledBy?: Types.ObjectId;
  cancelledAt?: Date;
  completedAt?: Date;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  
  // Virtual fields
  arrivalDate?: string;
}

export class ReservationGraphqlResponseDto {
  data: Reservation[];
  metadata: {
    total: number;
    page: number;
    limit: number;
    totalPages: number 
  }
}
