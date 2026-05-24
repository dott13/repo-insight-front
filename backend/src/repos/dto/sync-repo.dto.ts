import { IsString, IsOptional, IsArray } from 'class-validator';

export class SyncReposDto {
  @IsArray()
  localPaths!: string[];

  @IsString()
  userEmail!: string;

  @IsString()
  userId!: string;

  @IsString()
  userLogin!: string;

  @IsString()
  deviceId!: string;

  @IsOptional()
  @IsString()
  gitHubToken?: string;

  @IsOptional()
  @IsArray()
  allUserEmails?: string[];
}