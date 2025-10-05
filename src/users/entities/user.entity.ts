import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type UserDocument = User & Document & {
  comparePassword(candidatePassword: string): Promise<boolean>;
};

export enum UserRole {
  GUEST = 'guest',
  EMPLOYEE = 'employee',
  ADMIN = 'admin',
}

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  PENDING = 'pending',
}

@Schema({
  timestamps: true,
  collection: 'users',
})
export class User {
  @Prop({ 
    type: Types.ObjectId, 
    auto: true 
  })
  _id: Types.ObjectId;

  // Authentication fields
  @Prop({ 
    required: true, 
    unique: true, 
    trim: true,
    minlength: 3,
    maxlength: 50,
  })
  username: string;

  @Prop({ 
    required: true,
    select: false,
  })
  password: string;

  // Personal information
  @Prop({ 
    required: true,
    trim: true,
    maxlength: 50,
  })
  firstName: string;

  @Prop({ 
    required: true,
    trim: true,
    maxlength: 50,
  })
  lastName: string;

  @Prop({ 
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    maxlength: 100,
  })
  email: string;

  @Prop({ 
    required: true,
    unique: true,
    trim: true,
    maxlength: 20,
  })
  phoneNumber: string;

  // Role and permissions
  @Prop({ 
    type: String,
    enum: UserRole,
    default: UserRole.GUEST,
    required: true,
  })
  role: UserRole;

  @Prop({ 
    type: [String],
    default: [],
  })
  permissions: string[];

  // Status and metadata
  @Prop({ 
    type: String,
    enum: UserStatus,
    default: UserStatus.ACTIVE,
  })
  status: UserStatus;

  @Prop({ 
    type: String,
    maxlength: 30,
  })
  employeeId?: string;

  // Security fields
  @Prop({ 
    type: Date,
  })
  lastLoginAt?: Date;

  @Prop({ 
    type: String,
  })
  lastLoginIp?: string;

  // Audit fields
  @Prop({ 
    type: Types.ObjectId,
    ref: 'User',
  })
  createdBy?: Types.ObjectId;

  @Prop({ 
    type: Types.ObjectId,
    ref: 'User',
  })
  updatedBy?: Types.ObjectId;

  // Timestamps
  createdAt?: Date;
  updatedAt?: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);

// Indexes 
UserSchema.index({ username: 1 });
UserSchema.index({ phoneNumber: 1 });
UserSchema.index({ employeeId: 1 });
UserSchema.index({ role: 1 });
UserSchema.index({ status: 1 });
UserSchema.index({ createdAt: -1 });

// Pre-save middleware to hash password
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  const bcrypt = require('bcryptjs');
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Instance method to compare passwords
UserSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  const bcrypt = require('bcryptjs');
  return bcrypt.compare(candidatePassword, this.password);
};
