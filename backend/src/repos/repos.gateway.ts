import {
  OnGatewayConnection,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({ cors: { origin: '*' } })
export class ReposGateway implements OnGatewayConnection {
  @WebSocketServer()
  server!: Server;

  private userSocket = new Map<string, string>();

  handleConnection(client: Socket) {
    const userId = client.handshake.query.userId as string;
    if (userId) {
      this.userSocket.set(userId, client.id);
    }
  }

  handleDisconnect(client: Socket) {
    for (const [userId, socketId] of this.userSocket) {
      if (socketId === client.id) {
        this.userSocket.delete(userId);
        break;
      }
    }
  }

  emitScoreUpdate(userId: string, repoId: string, score: number) {
    const socketId = this.userSocket.get(userId);
    if (socketId) {
      this.server.to(socketId).emit('score-updated', { repoId, score });
    }
  }
}
