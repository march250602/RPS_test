import { WebSocketGateway, WebSocketServer, OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import * as amqp from 'amqplib';






@WebSocketGateway({ cors: true }) 
export class Gateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;
  
  async afterInit(server: Server) {
    console.log('Socket.IO Initialized');
    console.log('RABBITMQ_URL (Gate WAY):', process.env.RABBITMQ_URL);
console.log('QUEUE_NAME:(Gate WAY)', process.env.QUEUE_NAME);
    // connect RabbitMQ
    const connection = await amqp.connect(process.env.RABBITMQ_URL); 
    const channel = await connection.createChannel();
    const queue = process.env.QUEUE_NAME;
    await channel.assertQueue(process.env.QUEUE_NAME, { durable: false });

    // consume message จาก RabbitMQ
    channel.consume(queue, (msg) => {
      if (msg !== null) {
        const content = msg.content.toString();
        console.log('📩 Received from RabbitMQ:', content);

        
        this.server.emit('newMessage', content);

        channel.ack(msg);
      }
    });
  }

  handleConnection(client: Socket) {
    console.log('Client connected:', client.id);
  }

  handleDisconnect(client: Socket) {
    console.log('Client disconnected:', client.id);
  }
}
