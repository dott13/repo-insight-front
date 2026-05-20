export class SyncReposDto {
  localPaths!: string[];
  userEmail!: string;
  userId!: string;
  userLogin!: string;
  deviceId!: string;
  gitHubToken?: string;
  allUserEmails?: string[];
}