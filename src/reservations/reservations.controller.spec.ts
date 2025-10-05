import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { ReservationsController } from './reservations.controller';
import { ReservationsService } from './reservations.service';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { ReservationResponseDto } from './dto/reservation-response.dto';
import { UpdateReservationDto, UpdateReservationStatusDto } from './dto/update-reservation.dto';
import { ReservationStatus } from './entities/reservation.entity';
import { BasicStrategy } from '../auth/strategies/basic.strategy';
import { Types } from 'mongoose';

describe('ReservationsController', () => {
  let controller: ReservationsController;
  let service: ReservationsService;
  let basicStrategy: BasicStrategy;

  const mockId = new Types.ObjectId();
  const mockDate = '2039-12-30';
  const mockPhone = '13812345678';
  const mockReservationCode = 'ABC123';

  const mockGuestId = new Types.ObjectId();
  const mockEmployeeId = new Types.ObjectId();

  const mockReservation = {
    _id: mockId,
    guestName: 'Test Guest',
    guestPhone: mockPhone,
    guestEmail: 'test@example.com',
    expectedArrivalDate: new Date('2039-12-30T16:00:00.000Z'),
    expectedArrivalTime: 'dinner',
    tableSize: 4,
    status: ReservationStatus.REQUESTED,
    reservationCode: mockReservationCode,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const mockReservationsService = {
    create: jest.fn(),
    update: jest.fn(),
    cancelByGuest: jest.fn(),
    findActiveReservationByGuest: jest.fn(),
    findOne: jest.fn(),
    updateStatus: jest.fn(),
    graphql: jest.fn(),
  };

  const mockBasicStrategy = {
    validate: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReservationsController],
      providers: [
        {
          provide: ReservationsService,
          useValue: mockReservationsService,
        },
        {
          provide: BasicStrategy,
          useValue: mockBasicStrategy,
        },
      ],
    }).compile();

    controller = module.get<ReservationsController>(ReservationsController);
    service = module.get<ReservationsService>(ReservationsService);
    basicStrategy = module.get<BasicStrategy>(BasicStrategy);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // Guest endpoint: Create a new reservation
  describe('Guest endpoint: Create a new reservation', () => {
    it('should return with reservation when valid data is provided', async () => {
      const createReservationDto: CreateReservationDto = {
        guestName: 'Test Guest',
        guestPhone: mockPhone,
        guestEmail: 'test@example.com',
        expectedArrivalDate: mockDate,
        expectedArrivalTime: 'dinner',
        tableSize: 4,
      };

      mockReservationsService.create.mockResolvedValue(mockReservation);
      
      const result = await controller.create(createReservationDto);
      
      expect(result).toEqual(mockReservation);
      expect(mockReservationsService.create).toHaveBeenCalledWith(createReservationDto);
    });
  });

  // Guest endpoint: Find one reservation by query (date required, phone or code required)
  describe('Guest endpoint: Find one reservation by query (date required, phone or code required)', () => {
    describe('Request Validation', () => {
      it('should return BadRequestException when date is missing', async () => {
        await expect(
          controller.findActiveReservationByGuest(undefined, mockPhone)
        ).rejects.toThrow(new BadRequestException('Date is required'));
      });

      it('should return BadRequestException when both phone and code are missing', async () => {
        await expect(
          controller.findActiveReservationByGuest(mockDate, undefined, undefined)
        ).rejects.toThrow(new BadRequestException('Please provide at least one of \"phone number\" or \"reservation code\"'));
      });
    });

    describe('Response Handling', () => {
      it('should return with reservation when found by phone', async () => {
        mockReservationsService.findActiveReservationByGuest.mockResolvedValue(mockReservation);
        
        const result = await controller.findActiveReservationByGuest(mockDate, mockPhone);
        
        expect(result).toEqual(mockReservation);
        expect(mockReservationsService.findActiveReservationByGuest).toHaveBeenCalledWith(
          mockDate,
          mockPhone,
          undefined
        );
      });

      it('should return with reservation when found by reservation code', async () => {
        mockReservationsService.findActiveReservationByGuest.mockResolvedValue(mockReservation);
        
        const result = await controller.findActiveReservationByGuest(mockDate, undefined, mockReservationCode);
        
        expect(result).toEqual(mockReservation);
        expect(mockReservationsService.findActiveReservationByGuest).toHaveBeenCalledWith(
          mockDate,
          undefined,
          mockReservationCode
        );
      });

      it('should return NotFoundException when reservation is not found', async () => {
        mockReservationsService.findActiveReservationByGuest.mockRejectedValue(new NotFoundException());
        
        await expect(
          controller.findActiveReservationByGuest('2025-01-01', '12345678900')
        ).rejects.toThrow(NotFoundException);
      });
    });
  });

  // Guest endpoint: Update a reservation
  describe('Guest endpoint: Update a reservation', () => {
    it('should return with updated reservation', async () => {
      const updateReservationDto: UpdateReservationDto = {
        guestName: 'Updated Guest',
        expectedArrivalTime: 'lunch',
        tableSize: 2,
      };
      const updatedReservation = {
        ...mockReservation,
        ...updateReservationDto,
      };
      
      mockReservationsService.update.mockResolvedValue(updatedReservation);
      
      const response = await controller.update(mockId.toString(), updateReservationDto);
      
      expect(response).toBeDefined();
      expect(response).toEqual(updatedReservation);
      expect(mockReservationsService.update).toHaveBeenCalledWith(
        mockId.toString(),
        updateReservationDto
      );
    });
  });

  // Guest endpoint: Cancel a reservation
  describe('Guest endpoint: Cancel a reservation', () => {
    it('should return with cancelled reservation', async () => {
      const reqBody: any = {
        body: {
          userId: mockGuestId.toString()
        }
      };

      const updateStatusDto: UpdateReservationStatusDto = {
        status: ReservationStatus.CANCELLED,
      };

      const cancelledReservation = {
        ...mockReservation,
        ...updateStatusDto,
      };
      
      mockReservationsService.cancelByGuest.mockResolvedValue(cancelledReservation);
      
      const result = await controller.cancelByGuest(mockId.toString(), reqBody);
      
      expect(result).toEqual(cancelledReservation);
      expect(mockReservationsService.cancelByGuest).toHaveBeenCalledWith(
        mockId.toString(),
        updateStatusDto,
        mockGuestId.toString()
      );
    });
  });

  // Employee endpoint: Get reservation details by ID
  describe('Employee endpoint: Get reservation details by ID', () => {
    it('should return with reservation details', async () => {
      mockReservationsService.findOne.mockResolvedValue(mockReservation);
      
      const result = await controller.findOneForEmployee(mockId.toString());
      
      expect(result).toEqual(mockReservation);
      expect(mockReservationsService.findOne).toHaveBeenCalledWith(mockId.toString());
    });
  });

  // Employee endpoint: Update reservation status
  describe('Employee endpoint: Update reservation status', () => {
    const reqBody: any = {
      body: {
        status: ReservationStatus.APPROVED,
        userId: mockEmployeeId.toString()
      }
    };

    describe('Request Validation', () => {
      it('should return BadRequestException when status is invalid', async () => {
        const invalidStatusReq = {
          ...reqBody,
          body: {
            ...reqBody.body,
            status: 'INVALID_STATUS',
          }
        };

        await expect(
          controller.updateStatus(mockId.toString(), invalidStatusReq)
        ).rejects.toThrow(BadRequestException);
      });
    });

    describe('Response Handling', () => {
      it('should return with reservation status updated', async () => {
        const approvedReservation = {
          ...mockReservation,
          status: ReservationStatus.APPROVED,
        }

        mockReservationsService.updateStatus.mockResolvedValue(approvedReservation);
        
        const result = await controller.updateStatus(mockId.toString(), reqBody);

        expect(result.status).toEqual(ReservationStatus.APPROVED);
      });
    });
  });

  // Employee endpoint: GraphQL query
  describe('Employee endpoint: GraphQL query', () => {
    let date = "2039-12-30";
    let variables = {
        date: date,
        status: "",
        searchText: "",
        page: 1,
        limit: 0,
        sortBy: "",
        sortOrder: ""
      };
    let query = {
        query: 'query FindReservations { reservations { guestName guestPhone guestEmail expectedArrivalDate expectedArrivalTime tableSize status} }',
        variables: variables,
      };

    const mockGraphqlResponse = {
      data: [mockReservation],
      metadata: {
        total: 1,
        page: 1,
        limit: 0,
        totalPages: null
      }
    };

    it('should return with GraphQL-like response', async () => {
      mockReservationsService.graphql.mockResolvedValue(mockGraphqlResponse);
      
      const result = await controller.graphql(query);
      
      expect(result).toEqual(mockGraphqlResponse);
      expect(mockReservationsService.graphql).toHaveBeenCalledWith(query);
    });
  });
});
