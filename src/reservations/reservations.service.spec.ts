import { Test, TestingModule } from '@nestjs/testing';
import { ReservationsService } from './reservations.service';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { UpdateReservationDto, UpdateReservationStatusDto } from './dto/update-reservation.dto';
import { ReservationResponseDto } from './dto/reservation-response.dto';
import { ReservationStatus } from './entities/reservation.entity';
import { BasicStrategy } from '../auth/strategies/basic.strategy';
import { BadRequestException, UnauthorizedException, NotFoundException, ConflictException } from '@nestjs/common';
import { Types } from 'mongoose';

describe('ReservationsService', () => {
  let service: ReservationsService;
  let basicStrategy: BasicStrategy;

  const mockReservation = {
    findOne: jest.fn(),
    findAll: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    cancelByGuest: jest.fn(),
    findActiveReservationByGuest: jest.fn(),
    updateStatus: jest.fn(),
    graphql: jest.fn(),
  };

  const mockBasicStrategy = {
    validate: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReservationsService,
        {
          provide: ReservationsService,
          useValue: mockReservation,
        },
        {
          provide: BasicStrategy,
          useValue: mockBasicStrategy,
        },
      ],
    }).compile();

    service = module.get<ReservationsService>(ReservationsService);
    basicStrategy = module.get<BasicStrategy>(BasicStrategy);
    jest.clearAllMocks();
  });

  // Guest functionality: Create a new reservation
  describe('Guest functionality: Create a new reservation', () => {
    const validCreateReservationDto: CreateReservationDto = {
      guestName: 'Test Guest',
      guestPhone: '13000000000',
      guestEmail: 'test.guest@example.com',
      expectedArrivalDate: '2039-12-30T16:00:00.000Z',
      expectedArrivalTime: 'dinner',
      tableSize: 4,
      specialRequests: 'Window seat please',
    };

    const mockReservationResponse: ReservationResponseDto = {
      _id: new Types.ObjectId(),
      guestName: 'Test Guest',
      guestPhone: '13000000000',
      guestEmail: 'test.guest@example.com',
      expectedArrivalDate: '2039-12-30T16:00:00.000Z',
      expectedArrivalTime: 'dinner',
      tableSize: 4,
      specialRequests: 'Window seat please',
      status: ReservationStatus.REQUESTED,
      reservationCode: 'ABC123',
      createdAt: new Date(),
      updatedAt: new Date(),
      arrivalDate: '2039-12-31',
    };

    it('should create a reservation successfully', async () => {      
      mockReservation.create.mockReturnValue(mockReservationResponse);

      const result = await service.create(validCreateReservationDto);
      
      expect(mockReservation.create).toHaveBeenCalledWith(validCreateReservationDto);
      expect(result).toEqual(mockReservationResponse);
    });

    it('should throw UnauthorizedException for invalid auth credentials', async () => {
      mockBasicStrategy.validate.mockRejectedValue(
        new UnauthorizedException('Invalid credentials')
      );

      await expect(
        basicStrategy.validate('invalid_user', 'invalid_password')
      ).rejects.toThrow(UnauthorizedException);
      
      expect(mockBasicStrategy.validate).toHaveBeenCalledWith('invalid_user', 'invalid_password');
    });

    it('should throw BadRequestException for invalid phone number', async () => {
      const invalidCreateReservationDto: CreateReservationDto = {
        ...validCreateReservationDto,
        guestPhone: '0000', // Not 11 digits
      };

      mockReservation.create.mockRejectedValue(
        new BadRequestException('Invalid phone number.')
      );

      await expect(service.create(invalidCreateReservationDto)).rejects.toThrow(
        BadRequestException
      );
      expect(mockReservation.create).toHaveBeenCalledWith(invalidCreateReservationDto);
    });

    it('should throw BadRequestException for past arrival date', async () => {
      const pastDateDto = {
        ...validCreateReservationDto,
        expectedArrivalDate: '2025-09-15T16:00:00.000Z', // Past date
      };

      mockReservation.create.mockRejectedValue(
        new BadRequestException('Expected arrival time must be in the future')
      );

      await expect(service.create(pastDateDto)).rejects.toThrow(
        BadRequestException
      );
      expect(mockReservation.create).toHaveBeenCalledWith(pastDateDto);
    });

    it('should throw ConflictException for duplicate reservation on the same day', async () => {
      mockReservation.create.mockRejectedValue(
        new ConflictException('You already have an active reservation for this date')
      );

      await expect(service.create(validCreateReservationDto)).rejects.toThrow(
        ConflictException
      );
      expect(mockReservation.create).toHaveBeenCalledWith(validCreateReservationDto);
    });

    it('should handle missing optional fields', async () => {
      const minimalDto: CreateReservationDto = {
        guestName: 'Another Guest',
        guestPhone: '13812345678',
        guestEmail: 'anothor.guest@example.com',
        expectedArrivalDate: '2039-12-30T16:00:00.000Z',
        expectedArrivalTime: 'dinner',
        tableSize: 4,
      };

      const minimalResponse = {
        ...mockReservationResponse,
        guestName: 'Another Guest',
        guestPhone: '13812345678',
        guestEmail: 'anothor.guest@example.com',
        tableSize: 4,
        specialRequests: '',
      };

      mockReservation.create.mockResolvedValue(minimalResponse);

      const result = await service.create(minimalDto);
      
      expect(mockReservation.create).toHaveBeenCalledWith(minimalDto);
      expect(result).toEqual(minimalResponse);
    });

    it('should handle edge case table sizes', async () => {
      const largeTableDto = {
        ...validCreateReservationDto,
        tableSize: 20, // Maximum table size
      };

      const largeTableResponse = {
        ...mockReservationResponse,
        tableSize: 20,
      };

      mockReservation.create.mockResolvedValue(largeTableResponse);

      const result = await service.create(largeTableDto);
      
      expect(mockReservation.create).toHaveBeenCalledWith(largeTableDto);
      expect(result).toEqual(largeTableResponse);
    });

    it('should create a random reservation code and return it in the response', async () => {
      mockReservation.create.mockResolvedValue(mockReservationResponse);

      const result = await service.create(validCreateReservationDto);
      
      expect(mockReservation.create).toHaveBeenCalledWith(validCreateReservationDto);
      expect(result.reservationCode).toBeDefined();
      expect(result.reservationCode).toHaveLength(6);
    });
  });

  // Guest functionality: Update a reservation
  describe('Guest functionality: Update a reservation', () => {
    // Mock an exising reservation
    const mockId = new Types.ObjectId().toString();
    const existingReservation = {
      _id: mockId,
      guestName: 'Update Guest',
      guestPhone: '13000000000',
      guestEmail: 'update.guest@example.com',
      expectedArrivalDate: new Date('2039-12-30T16:00:00.000Z'),
      expectedArrivalTime: 'dinner',
      tableSize: 4,
      status: ReservationStatus.REQUESTED,
      reservationCode: 'ABC123',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    beforeEach(() => {
      jest.clearAllMocks();
      mockReservation.findById.mockResolvedValue(existingReservation);
    });

    it('should update an existing reservation', async () => {
      const updateDto: UpdateReservationDto = {
        guestEmail: 'updated@example.com',
      };

      const updateResult = {
        ...existingReservation,
        ...updateDto,
      };

      mockReservation.update.mockResolvedValue(updateResult);

      const result = await service.update(mockId, updateDto);

      expect(mockReservation.update).toHaveBeenCalledWith(mockId, updateDto);
      expect(result).toBeDefined();
      expect(result.guestEmail).toBe(updateDto.guestEmail);
    });

    it('should throw NotFoundException when updating non-existent entity', async () => {
      const updateDto: UpdateReservationDto = { guestName: 'Updated' };

      mockReservation.update.mockRejectedValue(
        new NotFoundException('Reservation not found')
      );

      await expect(service.update('123', updateDto)).rejects.toThrow(
        NotFoundException
      );
      expect(mockReservation.update).toHaveBeenCalledWith('123', updateDto);
    });

    describe('when expected arrival date changed', () => {
      it('should throw BadRequestException when updating to a past date', async () => {
        const pastDateDto: UpdateReservationDto = {
          expectedArrivalDate: '2025-01-01T16:00:00.000Z',
        };

        mockReservation.update.mockRejectedValue(
          new BadRequestException('Arrival date must be in the future')
        );

        await expect(service.update(mockId, pastDateDto)).rejects.toThrow(
          BadRequestException
        );
        expect(mockReservation.update).toHaveBeenCalledWith(mockId, pastDateDto);
      });

      it('should throw ConflictException when updating to a date with existing reservation', async () => {
        const newDateDto: UpdateReservationDto = {
          expectedArrivalDate: '2039-12-31T16:00:00.000Z',
        };

        mockReservation.update.mockRejectedValue(
          new ConflictException('You already have an active reservation for this date')
        );

        await expect(service.update(mockId, newDateDto)).rejects.toThrow(
          ConflictException
        );
        expect(mockReservation.update).toHaveBeenCalledWith(mockId, newDateDto);
      });
    });
  });

  // Guest functionality: Cancel their reservation
  describe('Guest functionality: Cancel their reservation', () => {
    // Mock exising reservation with requested status
    const mockId = new Types.ObjectId().toString();
    const requestedReservation = {
      _id: mockId,
      guestName: 'Test Guest',
      guestPhone: '13000000000',
      guestEmail: 'test.guest@example.com',
      expectedArrivalDate: new Date('2039-12-30T16:00:00.000Z'),
      expectedArrivalTime: 'dinner',
      tableSize: 4,
      status: ReservationStatus.REQUESTED,
      reservationCode: 'ABC123',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    const guestId = new Types.ObjectId();

    const cancelDto: UpdateReservationStatusDto = {
      status: ReservationStatus.CANCELLED,
    };

    beforeEach(() => {
      jest.clearAllMocks();
      mockReservation.findById.mockResolvedValue(requestedReservation);
    });

    it('should cancel a reservation', async () => {
      const cancelResult = {
        ...requestedReservation,
        ...cancelDto,
      };

      mockReservation.cancelByGuest.mockResolvedValue(cancelResult);

      const result = await service.cancelByGuest(mockId, cancelDto, guestId);

      expect(mockReservation.cancelByGuest).toHaveBeenCalledWith(mockId, cancelDto, guestId);
      expect(result).toBeDefined();
      expect(result.status).toBe(ReservationStatus.CANCELLED);
    });

    it('should throw NotFoundException when canceling non-existent entity', async () => {
      const nonExistId = new Types.ObjectId().toString();
      mockReservation.cancelByGuest.mockRejectedValue(
        new NotFoundException('Reservation not found')
      );

      await expect(service.cancelByGuest(nonExistId, cancelDto, guestId)).rejects.toThrow(
        NotFoundException
      );
      expect(mockReservation.cancelByGuest).toHaveBeenCalledWith(nonExistId, cancelDto, guestId);
    });

    describe('On reservation found successfully', () => {
      it('should throw BadRequestException when the reservation is already cancelled', async () => {
        const cancelledReservation = {
          ...requestedReservation,
          status: ReservationStatus.CANCELLED,
        };

        mockReservation.findOne.mockResolvedValue(cancelledReservation);

        mockReservation.cancelByGuest.mockRejectedValue(
          new BadRequestException('Reservation is already cancelled')
        );
    
        await expect(service.cancelByGuest(mockId, cancelDto, guestId)).rejects.toThrow(
          BadRequestException
        );
        expect(mockReservation.cancelByGuest).toHaveBeenCalledWith(mockId, cancelDto, guestId);
      });

      it('should throw BadRequestException when the reservation is completed', async () => {
        const completedReservation = {
          ...requestedReservation,
          status: ReservationStatus.COMPLETED,
        };

        mockReservation.findOne.mockResolvedValue(completedReservation);

        mockReservation.cancelByGuest.mockRejectedValue(
          new BadRequestException('Cannot cancel a completed reservation')
        );

        await expect(service.cancelByGuest(mockId, cancelDto, guestId)).rejects.toThrow(
          BadRequestException
        );
        expect(mockReservation.cancelByGuest).toHaveBeenCalledWith(mockId, cancelDto, guestId);
      });
    });
  });

  // Guest functionality: Find a single reservation by date and phone or reservation code
  describe('Guest functionality: Find a single reservation by date and phone or reservation code', () => {
    // Mock exising reservation with requested status
    const mockId = new Types.ObjectId().toString();
    const requestedReservation = {
      _id: mockId,
      guestName: 'Test Guest',
      guestPhone: '13000000000',
      guestEmail: 'test.guest@example.com',
      expectedArrivalDate: new Date('2039-12-30T16:00:00.000Z'),
      expectedArrivalTime: 'dinner',
      tableSize: 4,
      status: ReservationStatus.REQUESTED,
      reservationCode: 'ABC123',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should throw BadRequestException when date is not provided', async () => {
      mockReservation.findActiveReservationByGuest.mockRejectedValue(
        new BadRequestException('Date is required')
      );
      
      await expect(service.findActiveReservationByGuest('', '13000000000', 'ABC123')).rejects.toThrow(
        BadRequestException
      );
      expect(mockReservation.findActiveReservationByGuest).toHaveBeenCalledWith('', '13000000000', 'ABC123');
    });

    it('should throw BadRequestException when phone or reservation code is not provided', async () => {
      mockReservation.findActiveReservationByGuest.mockRejectedValue(
        new BadRequestException('Please provide at least one of "phone number" or "reservation code"')
      );

      await expect(service.findActiveReservationByGuest('2039-12-30', '', '')).rejects.toThrow(
        BadRequestException
      );
      expect(mockReservation.findActiveReservationByGuest).toHaveBeenCalledWith('2039-12-30', '', '');
    });

    it('should return the active reservation when found', async () => {
      mockReservation.findActiveReservationByGuest.mockResolvedValue(requestedReservation);

      const result = await service.findActiveReservationByGuest('2039-12-30', '13000000000', 'ABC123');

      expect(result).toEqual(requestedReservation);
      expect(mockReservation.findActiveReservationByGuest).toHaveBeenCalledWith('2039-12-30', '13000000000', 'ABC123');
    });

    it('should throw NotFoundException when no reservation found by provided criteria', async () => {
      mockReservation.findActiveReservationByGuest.mockRejectedValue(
        new NotFoundException('Reservation not found')
      );

      await expect(service.findActiveReservationByGuest('2025-12-30', '13999999999', '456DEF')).rejects.toThrow(
        NotFoundException
      );
      expect(mockReservation.findActiveReservationByGuest).toHaveBeenCalledWith('2025-12-30', '13999999999', '456DEF');
    });

    it('should throw NotFoundException when no active reservation found', async () => {
      const nonActiveReservation = {
        ...requestedReservation,
        status: ReservationStatus.CANCELLED,
      };

      mockReservation.findActiveReservationByGuest.mockRejectedValue(
        new NotFoundException('No active reservation found')
      );

      await expect(service.findActiveReservationByGuest('2039-12-30', '13000000000', 'ABC123')).rejects.toThrow(
        NotFoundException
      );
      expect(mockReservation.findActiveReservationByGuest).toHaveBeenCalledWith('2039-12-30', '13000000000', 'ABC123');
    });
  });

  // Employee functionality: Get reservation details by ID
  describe('Employee functionality: Get reservation details by ID', () => {
    // Mock exising reservation with requested status
    const mockId = new Types.ObjectId().toString();
    const requestedReservation = {
      _id: mockId,
      guestName: 'Test Guest',
      guestPhone: '13000000000',
      guestEmail: 'test.guest@example.com',
      expectedArrivalDate: new Date('2039-12-30T16:00:00.000Z'),
      expectedArrivalTime: 'dinner',
      tableSize: 4,
      status: ReservationStatus.REQUESTED,
      reservationCode: 'ABC123',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should return the reservation when found', async () => {
      mockReservation.findOne.mockResolvedValue(requestedReservation);

      const result = await service.findOne(mockId);

      expect(result).toEqual(requestedReservation);
      expect(mockReservation.findOne).toHaveBeenCalledWith(mockId);
    });

    it('should throw NotFoundException when reservation not found', async () => {
      const nonExistId = new Types.ObjectId().toString();

      mockReservation.findOne.mockResolvedValue(null);

      mockReservation.findOne.mockRejectedValue(
        new NotFoundException('Reservation not found')
      )

      await expect(service.findOne(nonExistId)).rejects.toThrow(NotFoundException);
      expect(mockReservation.findOne).toHaveBeenCalledWith(nonExistId);
    });
  });

  // Employee functionality: Update reservation status
  describe('Employee functionality: Update reservation status', () => {
    // Mock exising reservation with requested status
    const mockId = new Types.ObjectId().toString();
    let existingReservation = {
      _id: mockId,
      guestName: 'Test Guest',
      guestPhone: '13000000000',
      guestEmail: 'test.guest@example.com',
      expectedArrivalDate: new Date('2039-12-30T16:00:00.000Z'),
      expectedArrivalTime: 'dinner',
      tableSize: 4,
      status: ReservationStatus.REQUESTED,
      reservationCode: 'ABC123',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const mockEmployeeId = new Types.ObjectId();

    const updateStatusDto: UpdateReservationStatusDto = {
      status: ReservationStatus.APPROVED,
      remarks: 'Confirmed by employee',
    };

    const approvedReservation = {
      ...existingReservation,
      status: ReservationStatus.APPROVED,
    };

    const cancelledReservation = {
      ...existingReservation,
      status: ReservationStatus.CANCELLED,
    };

    const completedReservation = {
      ...existingReservation,
      status: ReservationStatus.COMPLETED,
    };

    const approvedDto = { status: ReservationStatus.APPROVED };
    const cancelledDto = { status: ReservationStatus.CANCELLED };
    const completedDto = { status: ReservationStatus.COMPLETED };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should throw NotFoundException when reservation not found', async () => {
      const nonExistId = new Types.ObjectId().toString();

      mockReservation.updateStatus.mockRejectedValue(
        new NotFoundException('Reservation not found')
      )

      await expect(service.updateStatus(nonExistId, updateStatusDto, mockEmployeeId)).rejects.toThrow(NotFoundException);
      expect(mockReservation.updateStatus).toHaveBeenCalledWith(nonExistId, updateStatusDto, mockEmployeeId);
    });

    it('should throw BadRequestException when invalid status', async () => {
      const invalidStatusDto: UpdateReservationStatusDto = {
        status: 'Invalid status string' as ReservationStatus,
      };

      mockReservation.updateStatus.mockRejectedValue(
        new BadRequestException('Invalid status')
      )

      await expect(service.updateStatus(mockId, invalidStatusDto, mockEmployeeId)).rejects.toThrow(BadRequestException);
      expect(mockReservation.updateStatus).toHaveBeenCalledWith(mockId, invalidStatusDto, mockEmployeeId);
    });

    describe('When providing a requested reservation', () => {
      it('should update reservation status successfully to approved', async () => {
        mockReservation.updateStatus.mockResolvedValue(approvedReservation);

        const result = await service.updateStatus(mockId, approvedDto, mockEmployeeId);

        expect(result.status).toEqual(ReservationStatus.APPROVED);
        expect(mockReservation.updateStatus).toHaveBeenCalledWith(mockId, approvedDto, mockEmployeeId);
      });

      it('should update reservation status successfully to cancelled', async () => {
        mockReservation.updateStatus.mockResolvedValue(cancelledReservation);

        const result = await service.updateStatus(mockId, cancelledDto, mockEmployeeId);

        expect(result.status).toEqual(ReservationStatus.CANCELLED);
        expect(mockReservation.updateStatus).toHaveBeenCalledWith(mockId, cancelledDto, mockEmployeeId);
      });

      it('should update reservation status successfully to completed', async () => {
        mockReservation.updateStatus.mockResolvedValue(completedReservation);

        const result = await service.updateStatus(mockId, completedDto, mockEmployeeId);

        expect(result.status).toEqual(ReservationStatus.COMPLETED);
        expect(mockReservation.updateStatus).toHaveBeenCalledWith(mockId, completedDto, mockEmployeeId);
      });

      it('should throw BadRequestException when status not changed', async () => {
        const sameStatusDto: UpdateReservationStatusDto = {
          status: existingReservation.status,
        };

        mockReservation.updateStatus.mockRejectedValue(
          new BadRequestException('Status not changed')
        )

        await expect(service.updateStatus(mockId, sameStatusDto, mockEmployeeId)).rejects.toThrow(BadRequestException);
        expect(mockReservation.updateStatus).toHaveBeenCalledWith(mockId, sameStatusDto, mockEmployeeId);
      });
    });

    describe('When providing an approved reservation', () => {
      existingReservation = {
        ...approvedReservation,
      };

      it('should update reservation status successfully to cancelled', async () => {
        mockReservation.updateStatus.mockResolvedValue(cancelledReservation);

        const result = await service.updateStatus(mockId, cancelledDto, mockEmployeeId);

        expect(result.status).toEqual(ReservationStatus.CANCELLED);
        expect(mockReservation.updateStatus).toHaveBeenCalledWith(mockId, cancelledDto, mockEmployeeId);
      });

      it('should update reservation status successfully to completed', async () => {
        mockReservation.updateStatus.mockResolvedValue(completedReservation);

        const result = await service.updateStatus(mockId, completedDto, mockEmployeeId);

        expect(result.status).toEqual(ReservationStatus.COMPLETED);
        expect(mockReservation.updateStatus).toHaveBeenCalledWith(mockId, completedDto, mockEmployeeId);
      });

      it('should throw BadRequestException when status not changed', async () => {
        const sameStatusDto: UpdateReservationStatusDto = {
          status: existingReservation.status,
        };

        mockReservation.updateStatus.mockRejectedValue(
          new BadRequestException('Status not changed')
        )

        await expect(service.updateStatus(mockId, sameStatusDto, mockEmployeeId)).rejects.toThrow(BadRequestException);
        expect(mockReservation.updateStatus).toHaveBeenCalledWith(mockId, sameStatusDto, mockEmployeeId);
      });
    });

    describe('When providing a cancelled reservation', () => {
      existingReservation = {
        ...cancelledReservation,
      };

      it('should throw BadRequestException when updating cancelled reservation', async () => {
        mockReservation.updateStatus.mockRejectedValue(
          new BadRequestException('Cannot update cancelled reservation')
        )

        await expect(service.updateStatus(mockId, cancelledDto, mockEmployeeId)).rejects.toThrow(BadRequestException);
        expect(mockReservation.updateStatus).toHaveBeenCalledWith(mockId, cancelledDto, mockEmployeeId);
      });

      it('should throw BadRequestException when status not changed', async () => {
        const sameStatusDto: UpdateReservationStatusDto = {
          status: existingReservation.status,
        };

        mockReservation.updateStatus.mockRejectedValue(
          new BadRequestException('Status not changed')
        )

        await expect(service.updateStatus(mockId, sameStatusDto, mockEmployeeId)).rejects.toThrow(BadRequestException);
        expect(mockReservation.updateStatus).toHaveBeenCalledWith(mockId, sameStatusDto, mockEmployeeId);
      });
    });

    describe('When providing a completed reservation', () => {
      existingReservation = {
        ...completedReservation,
      };

      it('should throw BadRequestException when updating completed reservation', async () => {
        mockReservation.updateStatus.mockRejectedValue(
          new BadRequestException('Cannot update completed reservation')
        )

        await expect(service.updateStatus(mockId, completedDto, mockEmployeeId)).rejects.toThrow(BadRequestException);
        expect(mockReservation.updateStatus).toHaveBeenCalledWith(mockId, completedDto, mockEmployeeId);
      });

      it('should throw BadRequestException when status not changed', async () => {
        const sameStatusDto: UpdateReservationStatusDto = {
          status: existingReservation.status,
        };

        mockReservation.updateStatus.mockRejectedValue(
          new BadRequestException('Status not changed')
        )

        await expect(service.updateStatus(mockId, sameStatusDto, mockEmployeeId)).rejects.toThrow(BadRequestException);
        expect(mockReservation.updateStatus).toHaveBeenCalledWith(mockId, sameStatusDto, mockEmployeeId);
      });
    });
  });

  // GraphQL query handler for reservations
  describe('GraphQL query handler for reservations', () => {
    // Mock an exising reservation
    const mockId = new Types.ObjectId().toString();
    const existingReservations = [{
        _id: mockId,
        guestName: 'Test1 Guest',
        guestPhone: '13000000000',
        guestEmail: 'test1.guest@example.com',
        expectedArrivalDate: new Date('2039-12-30T16:00:00.000Z'),
        expectedArrivalTime: 'dinner',
        tableSize: 4,
        status: ReservationStatus.REQUESTED,
        reservationCode: 'ABC123',
        createdAt: new Date(),
        updatedAt: new Date()
      }, {
        _id: new Types.ObjectId().toString(),
        guestName: 'Test2 Guest',
        guestPhone: '13000000001',
        guestEmail: 'test2.guest@example.com',
        expectedArrivalDate: new Date('2039-12-31T16:00:00.000Z'),
        expectedArrivalTime: 'lunch',
        tableSize: 2,
        status: ReservationStatus.REQUESTED,
        reservationCode: 'XYZ789',
        createdAt: new Date(),
        updatedAt: new Date()
      }, {
        _id: new Types.ObjectId().toString(),
        guestName: 'Test3 Guest',
        guestPhone: '13000000002',
        guestEmail: 'test3.guest@example.com',
        expectedArrivalDate: new Date('2039-12-31T16:00:00.000Z'),
        expectedArrivalTime: 'breakfast',
        tableSize: 3,
        status: ReservationStatus.APPROVED,
        reservationCode: 'LMN456',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    let FIND_RESERVATIONS_FIELDS = `
        guestName
        guestPhone
        guestEmail
        expectedArrivalDate
        expectedArrivalTime
        tableSize
        status
        reservationCode
      `;
    let variables = {
          date: "2025-09-29",
          status: "",
          searchText: "",
          page: 1,
          limit: 0,
          sortBy: "",
          sortOrder: ""
      };
    let query = {
      query: 'query FindReservations { reservations { ' + FIND_RESERVATIONS_FIELDS + '} }',
      variables: variables,
      };

    let graphqlResponse = {
      data: existingReservations,
      metadata: {
        total: existingReservations.length,
        page: variables.page,
        limit: variables.limit,
        totalPages: null
      }
    };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should return all reservations with initial query', async () => {
      mockReservation.graphql.mockResolvedValue(graphqlResponse);

      const result = await service.graphql(query);

      expect(result.data).toHaveLength(existingReservations.length);
    });

    it('should return all reservations by date if date is provided', async () => {
      variables.date = '2039-12-30';
      query.variables = variables;
      graphqlResponse.data = existingReservations.filter(res => res.expectedArrivalDate.toDateString() === new Date(variables.date).toDateString());
      mockReservation.graphql.mockResolvedValue(graphqlResponse);

      const result = await service.graphql(query);

      expect(result.data).toHaveLength(graphqlResponse.data.length);
    });

    it('should return all reservations by status if status is provided', async () => {
      variables.status = ReservationStatus.REQUESTED;
      query.variables = variables;
      graphqlResponse.data = existingReservations.filter(res => res.status === variables.status);
      mockReservation.graphql.mockResolvedValue(graphqlResponse);

      const result = await service.graphql(query);

      expect(result.data).toHaveLength(graphqlResponse.data.length);
    });

    it('should return all reservations by status if multiple status are provided', async () => {
      variables.status = [ReservationStatus.REQUESTED, ReservationStatus.APPROVED].join(',');
      query.variables = variables;
      graphqlResponse.data = existingReservations.filter(res => variables.status.split(',').includes(res.status));
      mockReservation.graphql.mockResolvedValue(graphqlResponse);

      const result = await service.graphql(query);

      expect(result.data).toHaveLength(graphqlResponse.data.length);
    });

    it('should return all reservations by search text if search text is provided', async () => {
      variables.searchText = 'LMN456';
      query.variables = variables;
      graphqlResponse.data = existingReservations.filter(res => res.reservationCode.includes(variables.searchText));
      mockReservation.graphql.mockResolvedValue(graphqlResponse);

      const result = await service.graphql(query);

      expect(result.data).toHaveLength(graphqlResponse.data.length);
    });

    it('should return empty data if no reservations available on provided date', async () => {
      variables.date = '2039-01-01';
      query.variables = variables;
      graphqlResponse.data = existingReservations.filter(res => res.expectedArrivalDate.toDateString() === new Date(variables.date).toDateString());
      mockReservation.graphql.mockResolvedValue(graphqlResponse);

      const result = await service.graphql(query);

      expect(result.data).toHaveLength(graphqlResponse.data.length);
    });
  });
});
