import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({ cors: { origin: '*' } })
export class ReposGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  private server!: Server;

  private readonly logger = new Logger(ReposGateway.name);

  private readonly userSockets = new Map<string, string>();

  handleConnection(client: Socket) {
    const userId = client.handshake.query.userId as string;
    if (userId) {
      this.userSockets.set(userId, client.id);
      this.logger.debug(`Client connected: ${client.id} (user: ${userId})`);
    }
  }

  handleDisconnect(client: Socket) {
    for (const [userId, socketId] of this.userSockets) {
      if (socketId === client.id) {
        this.userSockets.delete(userId);
        this.logger.debug(`Client disconnected: ${client.id} (user: ${userId})`);
        break;
      }
    }
  }
  emitScoreUpdate(userId: string, repoId: string): void {
    const socketId = this.userSockets.get(userId);
    if (!socketId) return;

    this.server.to(socketId).emit('repo:synced', { repoId });
    this.logger.debug(`Emitted repo:synced → user ${userId}, repo ${repoId}`);
  }
  emitSyncComplete(userId: string, totalRepos: number): void {
    const socketId = this.userSockets.get(userId);
    if (!socketId) return;

    this.server.to(socketId).emit('sync:complete', { totalRepos });
  }
}