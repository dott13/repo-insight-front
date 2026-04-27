import { Injectable } from '@nestjs/common';
import { SimpleGit, simpleGit } from 'simple-git';

@Injectable()
export class GitParserService {
  async isUserProject(path: string, userEmails: string[]): Promise<boolean> {
    const git: SimpleGit = simpleGit(path);

    try {
      const isRepo = await git.checkIsRepo();
      if (!isRepo) return false;

      const log = await git.log();
      return log.all.some(commit => userEmails.includes(commit.author_email));
    } catch (e) {
      console.error('Error occurred while parsing Git repository:', e);
      return false;
    }
  }

  async parseLocalMetadata(path: string) { 
    const git: SimpleGit = simpleGit(path);
    try {
      const remote = await git.remote(["get-url", "origin"]);
      const stats = await git.raw(["rev-list", "--count", "HEAD"]);
      return {
        name: path.split('/').pop() || 'unknown',
        remoteUrl: remote?.trim(),
        totalCommits: parseInt(stats) || 0,
      };
    } catch {
      return null;
    }
  }

  // Helper to normalize Git URLs into "owner/repo"
  extractFullName(url: string): string {
    const cleanUrl = url.replace(/\.git$/, '').replace(/\/$/, '');
    const parts = cleanUrl.split(/[:/]/);
    if (parts.length < 2) return cleanUrl;
    return `${parts[parts.length - 2]}/${parts[parts.length - 1]}`;
  }
}
