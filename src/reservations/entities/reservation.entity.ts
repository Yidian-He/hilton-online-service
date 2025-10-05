import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ReservationDocument = Reservation & Document;

export enum ReservationStatus {
  REQUESTED = 'requested',
  APPROVED = 'approved',
  CANCELLED = 'cancelled',
  COMPLETED = 'completed',
}

export enum ReservationTimeSlot {
  LUNCH = 'lunch',
  DINNER = 'dinner',
}

@Schema({
  timestamps: true,
  collection: 'reservations',
})
export class Reservation {
  // Guest Information
  @Prop({ 
    type: String,
    required: true, 
    trim: true, 
    maxlength: 100 
  })
  guestName: string;

  @Prop({ 
    type: String,
    required: true, 
    maxlength: 11 
  })
  guestPhone: string;

  @Prop({ 
    type: String,
    trim: true, 
    maxlength: 100 
  })
  guestEmail: string;

  // Reservation Details
  @Prop({ 
    type: Date, 
    required: true 
  })
  expectedArrivalDate: Date;

  @Prop({ 
    type: String, 
    enum: Object.values(ReservationTimeSlot), 
    default: ReservationTimeSlot.DINNER 
  })
  expectedArrivalTime: ReservationTimeSlot;

  @Prop({ 
    type: Number,
    required: true, 
    min: 1, 
    max: 20 
  })
  tableSize: number;

  @Prop({ 
    type: String,
    default: '',
    trim: true,
    maxlength: 100 
  })
  specialRequests: string;

  // Status
  @Prop({ 
    type: String, 
    enum: Object.values(ReservationStatus), 
    default: ReservationStatus.REQUESTED 
  })
  status: ReservationStatus;

  // Audit fields
  @Prop({ 
    required: true 
  })
  reservationCode: string;

  @Prop({ 
    type: String,
    default: '', 
    trim: true, 
    maxlength: 100 
  })
  remarks: string;

  @Prop({ 
    type: Types.ObjectId, 
    ref: 'User' 
  })
  approvedBy: Types.ObjectId;

  @Prop({ 
    type: Types.ObjectId, 
    ref: 'User' 
  })
  cancelledBy: Types.ObjectId;

  @Prop({ 
    type: Date,
  })
  cancelledAt: Date;

  @Prop({ 
    type: Date,
  })
  completedAt: Date;

  // Timestamps
  createdAt?: Date;
  updatedAt?: Date;
}

export const ReservationSchema = SchemaFactory.createForClass(Reservation);

// Indexes 
ReservationSchema.index({ status: 1 });
ReservationSchema.index({ guestEmail: 1 });
ReservationSchema.index({ guestPhone: 1 });
ReservationSchema.index({ reservationCode: 1});
ReservationSchema.index({ createdAt: -1 });
ReservationSchema.index({ expectedArrivalDate: 1, expectedArrivalTime: 1, status: 1 });

// Virtual for formatted arrival date at UTC+8 timezone
ReservationSchema.virtual('arrivalDate').get(function() {
  const utc8Date = new Date(this.expectedArrivalDate.getTime() + (8 * 60 * 60 * 1000));
  return utc8Date.toISOString().split('T')[0];
});

// // Virtual for reservation duration (assuming 2 hours default)
// ReservationSchema.virtual('estimatedEndTime').get(function() {
//   const endTime = new Date(this.reservationDetails.expectedArrivalDate);
//   endTime.setHours(endTime.getHours() + 2);
//   return endTime;
// });

// Pre-save middleware to set timestamps
ReservationSchema.pre('save', function(next) {
  if (this.isModified('status')) {
    const now = new Date();
    
    switch (this.status) {
      case ReservationStatus.APPROVED:
        if (!this.updatedAt) this.updatedAt = now;
        break;
      case ReservationStatus.CANCELLED:
        if (!this.cancelledAt) this.cancelledAt = now;
        break;
      case ReservationStatus.COMPLETED:
        if (!this.completedAt) this.completedAt = now;
        break;
    }
  }
  next();
});
