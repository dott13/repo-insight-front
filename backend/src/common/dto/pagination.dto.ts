import { IsInt, IsOptional, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class PaginationDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  get skip(): number {
    return ((this.page ?? 1) - 1) * (this.limit ?? 20);
  }
}

export class PaginatedResponseDto<T> {
  data!: T[];
  total!: number;
  page!: number;
  limit!: number;
  hasMore!: boolean;

  static of<T>(
    data: T[],
    total: number,
    pagination: PaginationDto,
  ): PaginatedResponseDto<T> {
    const page = pagination.page ?? 1;
    const limit = pagination.limit ?? 20;
    return {
      data,
      total,
      page,
      limit,
      hasMore: page * limit < total,
    };
  }
}