import { Controller, Get, Post, Body, Patch, Query, Param, Request, HttpCode, BadRequestException,ValidationPipe } from '@nestjs/common';
import { ReservationsService } from './reservations.service';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { UpdateReservationDto, UpdateReservationStatusDto } from './dto/update-reservation.dto';
import { ReservationResponseDto } from './dto/reservation-response.dto';
import { ReservationStatus } from './entities/reservation.entity';

@Controller('reservations')
export class ReservationsController {
  constructor(private readonly reservationsService: ReservationsService) {}

  // -------- Guest Endpoints -------- 

  // Guest endpoint: Create a new reservation
  @Post()
  async create(@Body(ValidationPipe) createReservationDto: CreateReservationDto): Promise<ReservationResponseDto> {
    return this.reservationsService.create(createReservationDto);
  }

  // Guest endpoint: Find one reservation by query (date required, phone or code required)
  @Get('guest')
  async findActiveReservationByGuest(
    @Query('date') date?: string,
    @Query('phone') phone?: string,
    @Query('reservationCode') reservationCode?: string,
  ): Promise<ReservationResponseDto> {
    if (!date) {
      throw new BadRequestException('Date is required');
    }
    if (!phone && !reservationCode) {
      throw new BadRequestException('Please provide at least one of "phone number" or "reservation code"');
    }
    return this.reservationsService.findActiveReservationByGuest(date, phone, reservationCode);
  }

  // Guest endpoint: Update a reservation 
  @Patch('guest/:id')
  async update(
    @Param('id') id: string,
    @Body(ValidationPipe) updateReservationDto: UpdateReservationDto,
  ): Promise<ReservationResponseDto> {
    return this.reservationsService.update(id, updateReservationDto);
  }

  // Guest endpoint: Cancel a reservation
  @Patch('guest/:id/cancel')
  async cancelByGuest(
    @Param('id') id: string,
    @Request() req: any
  ): Promise<ReservationResponseDto> {
    const guestId = req.body.userId || '';
    const updateStatusDto: UpdateReservationStatusDto = {
      status: ReservationStatus.CANCELLED,
    };
    return this.reservationsService.cancelByGuest(id, updateStatusDto, guestId);
  }

  // -------- Employee Endpoints -------- 

  // Employee endpoint: Get reservation details by ID
  @Get('admin/:id')
  async findOneForEmployee(@Param('id') id: string): Promise<ReservationResponseDto> {
    return this.reservationsService.findOne(id);
  }

  // Employee endpoint: Update reservation status
  @Patch('admin/:id/status')
  async updateStatus(
    @Param('id') id: string,
    @Request() req: any
  ): Promise<ReservationResponseDto> {
    const employeeId = req.body.userId || '';
    const status = req.body.status;
    if (!Object.values(ReservationStatus).includes(status)) {
      throw new BadRequestException('Invalid status');
    }
    const updateStatusDto: UpdateReservationStatusDto = {
      status: status,
      remarks: req.body.remarks || '',
    };
    return this.reservationsService.updateStatus(id, updateStatusDto, employeeId);
  }

  // Employee endpoint: GraphQL query to browse reservations
  @Post('admin/graphql')
  @HttpCode(200)
  async graphql(
    @Body() body: { query: string, variables?: any }
  ): Promise<any> {
    return this.reservationsService.graphql(body);
  }
}
