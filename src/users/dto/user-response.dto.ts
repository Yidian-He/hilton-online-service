import { Types } from 'mongoose';
import { UserRole, UserStatus } from '../entities/user.entity';

export class UserResponseDto {
  _id: Types.ObjectId;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  role: UserRole;
  status: UserStatus;
  employeeId?: string;
  permissions: string[];
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: Types.ObjectId;
  updatedBy?: Types.ObjectId;
}
