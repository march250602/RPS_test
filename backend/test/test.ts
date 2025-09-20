const amqp = require('amqplib');

async function main() {
  try {
    const conn = await amqp.connect('amqp://kalo:kalo@localhost:5672');
    const channel = await conn.createChannel();

    const queue = 'highscore_queue';
    await channel.assertQueue(queue, { durable: false });

    console.log('Waiting for messages...');
    channel.consume(queue, msg => {
      if (msg !== null) {
        console.log('Received message:', msg.content.toString());
        channel.ack(msg);
      }
    });
  } catch (err) {
    console.error(err);
  }
}

main();
