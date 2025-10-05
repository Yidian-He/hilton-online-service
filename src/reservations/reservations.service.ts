import { Injectable, NotFoundException, BadRequestException, ConflictException, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { UpdateReservationDto, UpdateReservationStatusDto } from './dto/update-reservation.dto';
import { ReservationResponseDto, ReservationGraphqlResponseDto } from './dto/reservation-response.dto';
import { Reservation, ReservationDocument, ReservationStatus } from './entities/reservation.entity';

@Injectable()
export class ReservationsService {
  constructor(
    @InjectModel(Reservation.name) private reservationModel: Model<ReservationDocument>,
  ) {}

  // Guest functionality: Create a new reservation
  async create(createReservationDto: CreateReservationDto): Promise<ReservationResponseDto> {
    // Validate phone number
    const phoneRegex = /^1[3-9]\d{9}$/;
    if (!phoneRegex.test(createReservationDto.guestPhone)) {
      throw new BadRequestException('Invalid phone number.');
    }
    
    // Validate arrival time is in the future
    const arrivalDate = new Date(createReservationDto.expectedArrivalDate);
    if (arrivalDate <= new Date()) {
      throw new BadRequestException('Expected arrival time must be in the future');
    }

    // Check for conflicts (same phone number with active reservation on same day)
    await this.checkConfilct(createReservationDto.guestPhone, arrivalDate);

    // Generate a random reservation code with 6 mixed digits and letters
    const randomCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    // Ensure the generated code is unique
    const existingCode = await this.reservationModel.findOne({ reservationCode: randomCode });
    if (existingCode) {
      // Recursively generate a new code if collision occurs
      return this.create(createReservationDto);
    }

    // Create reservation with combined data
    const reservationData = {
      ...createReservationDto,
      expectedArrivalDate: arrivalDate,
      reservationCode: randomCode,
    };

    const reservation = new this.reservationModel(reservationData);
    const savedReservation = await reservation.save();

    return this.toReservationResponse(savedReservation);
  }

  // Guest functionality: Update a reservation
  async update(id: string, updateReservationDto: UpdateReservationDto): Promise<ReservationResponseDto> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid reservation ID');
    }

    const reservation = await this.reservationModel.findById(id).exec();
    if (!reservation) {
      throw new NotFoundException('Reservation not found');
    }

    // Validate status, only requested status can be updated
    if (reservation.status && reservation.status !== ReservationStatus.REQUESTED) {
      throw new BadRequestException('Reservation is not in pending status, cannot be updated');
    }

    // Validate arrival time
    if (updateReservationDto.expectedArrivalDate) {
      const newArrivalDate = new Date(updateReservationDto.expectedArrivalDate);
      if (newArrivalDate <= new Date()) {
        throw new BadRequestException('Arrival time must be in the future');
      }

      // Only check conflict if date is changed for update
      const prevDate = reservation.expectedArrivalDate.toDateString();
      const newDate = newArrivalDate.toDateString();
      if (prevDate !== newDate) {
        await this.checkConfilct(reservation.guestPhone, newArrivalDate);
      }

      (updateReservationDto as any).expectedArrivalDate = newArrivalDate;
    }

    const updateData = {
      ...updateReservationDto,
    };
    const updatedReservation = await this.reservationModel.findByIdAndUpdate(id, updateData, { new: true }).exec();
    if (!updatedReservation) {
      throw new InternalServerErrorException('Failed to update reservation');
    }

    return this.toReservationResponse(updatedReservation);
  }

  // Guest functionality: Cancel their reservation
  async cancelByGuest(id: string, updateStatusDto: UpdateReservationStatusDto, guestId: Types.ObjectId): Promise<ReservationResponseDto> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid reservation ID');
    }

    const reservation = await this.reservationModel.findById(id).exec();
    if (!reservation) {
      throw new NotFoundException('Reservation not found');
    }

    // Only allow cancellation if not already cancelled or completed
    if (reservation.status === ReservationStatus.CANCELLED) {
      throw new BadRequestException('Reservation is already cancelled');
    }
    if (reservation.status === ReservationStatus.COMPLETED) {
      throw new BadRequestException('Cannot cancel a completed reservation');
    }

    // Set cancellation status and timestamps
    updateStatusDto.status = ReservationStatus.CANCELLED;
    const updateData = {
      ...updateStatusDto,
    };

    const cancelledReservation = await this.reservationModel.findByIdAndUpdate(id, updateData, { new: true }).exec();
    if (!cancelledReservation) {
      throw new InternalServerErrorException('Failed to cancel reservation');
    }

    return this.toReservationResponse(cancelledReservation);
  }

  // Guest functionality: Find a single reservation by date and phone or reservation code
  async findActiveReservationByGuest(date: string, phone?: string, reservationCode?: string): Promise<ReservationResponseDto> {
    if (!date) {
      throw new BadRequestException('Date is required');
    }

    if (!phone && !reservationCode) {
      throw new BadRequestException('Please provide at least one of "phone number" or "reservation code"');
    }

    const filter: any = {};

    // Date range filter for the specific day using ISO format
    const datePart = date.split('T')[0];
    const startOfDay = `${datePart}T00:00:00.000Z`;
    const endOfDay = `${datePart}T23:59:59.999Z`;
    filter.expectedArrivalDate = { $gte: startOfDay, $lte: endOfDay };

    // Apply phone/code filters
    if (phone) {
      filter.guestPhone = phone;
    }
    if (reservationCode) {
      filter.reservationCode = reservationCode;
    }

    const reservation = await this.reservationModel
      .findOne(filter)
      .populate('guestName guestPhone guestEmail expectedArrivalDate expectedArrivalTime tableSize status specialRequests')
      .sort({ expectedArrivalDate: 1, createdAt: -1 })
      .exec();

    if (!reservation) {
      throw new NotFoundException('Reservation not found');
    } else if (reservation && (reservation.status === ReservationStatus.COMPLETED || reservation.status === ReservationStatus.CANCELLED)) {
      throw new NotFoundException('No active reservation found');
    }

    return this.toReservationResponse(reservation);
  }

  // Employee functionality: Get reservation details by ID
  async findOne(id: string): Promise<ReservationResponseDto> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid reservation ID');
    }

    const reservation = await this.reservationModel.findById(id).exec();

    if (!reservation) {
      throw new NotFoundException('Reservation not found');
    }

    return this.toReservationResponse(reservation);
  }

  // Employee functionality: Update reservation status
  async updateStatus(id: string, updateStatusDto: UpdateReservationStatusDto, employeeId: Types.ObjectId): Promise<ReservationResponseDto> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid reservation ID');
    }

    const reservation = await this.reservationModel.findById(id).exec();
    if (!reservation) {
      throw new NotFoundException('Reservation not found');
    }

    // Validate status transition
    if (!Object.values(ReservationStatus).includes(updateStatusDto.status)) {
      throw new BadRequestException('Invalid status');
    }

    // Validate if status changed
    if (reservation.status === updateStatusDto.status) {
      throw new InternalServerErrorException('Status not changed')
    } else if (reservation.status === ReservationStatus.CANCELLED) {
      throw new BadRequestException('Cannot update cancelled reservation');
    } else if (reservation.status === ReservationStatus.COMPLETED) {
      throw new BadRequestException('Cannot update completed reservation');
    }

    // Update status and processing remarks
    reservation.status = updateStatusDto.status;
    if (updateStatusDto.remarks) {
      reservation.remarks = updateStatusDto.remarks;
    }

    const updateData = {
      ...updateStatusDto,
    };

    const updatedReservation = await this.reservationModel.findByIdAndUpdate(id, updateData, { new: true }).exec();
    if (!updatedReservation) {
      throw new InternalServerErrorException('Failed to update reservation status');
    }

    return this.toReservationResponse(updatedReservation);
  }

  // GraphQL query handler for reservations
  async graphql(body: { query: string; variables?: any }): Promise<ReservationGraphqlResponseDto> {
    const { query, variables } = body;
    const filters: any = {};
    
    // Parse date if provided
    if (variables?.date) {
        const datePart = variables.date.split('T')[0];
        const startOfDay = `${datePart}T00:00:00.000Z`;
        const endOfDay = `${datePart}T23:59:59.999Z`;
        filters.expectedArrivalDate = {
          $gte: new Date(startOfDay),
          $lte: new Date(endOfDay)
        };
    }

    // Parse status filter
    if (variables?.status) {
      const statusList = variables.status.split(',');
      filters.status = { $in: statusList };
    }

    // Parse search text (search in phone, email, or reservation code)
    if (variables?.searchText) {
      const searchRegex = new RegExp(variables.searchText, 'i');
      filters.$or = [
        { guestPhone: searchRegex },
        { reservationCode: searchRegex }
      ];
    }

    // Parse pagination
    const page = variables?.page || 1;
    const limit = variables?.limit || 0;
    const skip = (page - 1) * limit;

    // Parse sorting
    const sort: any = {};
    
    // Handle sort fields
    const validSortFields = ['status', 'expectedArrivalDate'];
    const sortBy = variables?.sortBy || 'status';
    const sortOrder = variables?.sortOrder === 'desc' ? -1 : 1;

    if (validSortFields.includes(sortBy)) {
      sort[sortBy] = sortOrder;
      
      // Add secondary sort by expectedArrivalDate if sorting by status
      if (sortBy === 'status') {
        sort.expectedArrivalDate = 1; // Always sort by date ascending as secondary sort
      }
    } else {
      sort.expectedArrivalDate = 1; // default sort by status descending
    }

    try {
      // Parse field selection from query string
      const validFields = [
        '_id',   
        'guestName',
        'guestEmail',
        'guestPhone',
        'tableSize',
        'status',
        'expectedArrivalDate',
        'expectedArrivalTime',
        'reservationCode',
        'specialRequests',
        'createdAt',
        'updatedAt'
      ];

      // Extract fields from query string
      const fieldMatch = query.match(/{\s*reservations\s*{\s*([\w\s]+)}/);
      let selectedFields = fieldMatch 
        ? fieldMatch[1].trim().split(/\s+/).filter(field => validFields.includes(field))
        : validFields;

      // Always include _id field for data integrity
      if (!selectedFields.includes('_id')) {
        selectedFields.unshift('_id');
      }

      // Execute query with filters and field selection
      const [reservations, total] = await Promise.all([
        this.reservationModel
          .find(filters)
          .select(selectedFields.join(' '))
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .lean()
          .exec(),
        this.reservationModel.countDocuments(filters)
      ]);

      return {
        data: reservations,
        metadata: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      throw new BadRequestException('Invalid GraphQL query or variables');
    }
  }

  // Private methods
  private async checkConfilct(phone: string, arrivalDate: Date) {
    const startOfDay = new Date(arrivalDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(arrivalDate);
    endOfDay.setHours(23, 59, 59, 999);

    const existingReservation = await this.reservationModel.findOne({
      guestPhone: phone,
      expectedArrivalDate: { $gte: startOfDay, $lte: endOfDay },
      status: { $in: [ReservationStatus.REQUESTED, ReservationStatus.APPROVED] }
    });

    if (existingReservation) {
      throw new ConflictException('You already have an active reservation for this date');
    }

    return null;
  }

  private toReservationResponse(reservation: ReservationDocument): ReservationResponseDto {
    return {
      _id: reservation._id as Types.ObjectId,
      guestName: reservation.guestName,
      guestPhone: reservation.guestPhone,
      guestEmail: reservation.guestEmail,
      expectedArrivalDate: reservation.expectedArrivalDate.toISOString(),
      expectedArrivalTime: reservation.expectedArrivalTime,
      tableSize: reservation.tableSize,
      specialRequests: reservation.specialRequests,
      status: reservation.status,
      reservationCode: reservation.reservationCode,
      remarks: reservation.remarks,
      approvedBy: reservation.approvedBy,
      cancelledBy: reservation.cancelledBy,
      cancelledAt: reservation.cancelledAt,
      completedAt: reservation.completedAt,
      createdAt: reservation.createdAt!,
      updatedAt: reservation.updatedAt!,
      // Virtual fields
      arrivalDate: (reservation as any).arrivalDate,
    };
  }


}
