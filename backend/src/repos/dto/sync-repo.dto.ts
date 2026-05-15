export class SyncReposDto {
  localPaths!: string[];
  userEmail!: string;
  deviceId!: string;
  gitHubToken?: string;
  allUserEmails?: string[];
}