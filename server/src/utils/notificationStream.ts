import { Response } from 'express';
import type { Notification } from '@prisma/client';

type Client = {
  id: string;
  res: Response;
};

const clients = new Map<string, Set<Client>>();

export function addNotificationClient(userId: string, client: Client) {
  const userClients = clients.get(userId) ?? new Set<Client>();
  userClients.add(client);
  clients.set(userId, userClients);

  client.res.write('event: connected\n');
  client.res.write('data: {}\n\n');

  return () => {
    userClients.delete(client);
    if (userClients.size === 0) clients.delete(userId);
  };
}

export function pushNotification(notification: Notification) {
  const userClients = clients.get(notification.userId);
  if (!userClients) return;

  const payload = JSON.stringify(notification);
  userClients.forEach((client) => {
    client.res.write('event: notification\n');
    client.res.write(`data: ${payload}\n\n`);
  });
}
