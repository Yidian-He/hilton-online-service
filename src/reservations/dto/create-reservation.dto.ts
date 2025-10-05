import { IsString, IsEmail, IsDateString, IsInt, IsOptional, MaxLength, Min, Max, IsNotEmpty, ValidateIf } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateReservationDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @Transform(({ value }) => value?.trim())
  guestName: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  @Transform(({ value }) => value?.trim())
  guestPhone: string;

  @ValidateIf(({ guestEmail }) => guestEmail !== undefined && guestEmail !== null && guestEmail.trim() !== '')
  @IsEmail()
  @MaxLength(100)
  @Transform(({ value }) => value?.toLowerCase().trim())
  guestEmail: string;

  @IsDateString()
  @IsNotEmpty()
  expectedArrivalDate: string;

  @IsString()
  @IsNotEmpty()
  expectedArrivalTime: string;

  @IsInt()
  @Min(1)
  @Max(20)
  tableSize: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Transform(({ value }) => value?.trim())
  specialRequests?: string;
}
