import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UserResponseDto } from './dto/user-response.dto';
import { User, UserDocument } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  async findByUsername(username: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ username }).select('+password');
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email }).select('+password');
  }

  private toUserResponse(user: UserDocument): UserResponseDto {
    return {
      _id: user._id,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phoneNumber: user.phoneNumber,
      role: user.role,
      status: user.status,
      employeeId: user.employeeId,
      permissions: user.permissions,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt!,
      updatedAt: user.updatedAt!,
      createdBy: user.createdBy,
      updatedBy: user.updatedBy,
    };
  }
}
