export class Repo {
  id!: string;
  name!: string;
  full_name!: string;
  isLocal!: boolean;
  isRemote!: boolean;
  provider!: 'local' | 'github' | 'gitlab';
  externalId?: string;
  localPaths?: Record<string, string>;
  htmlUrl?: string; 
  description?: string;
  isContributed!: boolean;
  lastParsed!: Date;
  contributionScore!: number;

  constructor(partial: Partial<Repo>) {
    Object.assign(this, partial);
  }
}