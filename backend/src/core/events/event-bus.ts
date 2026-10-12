import { EventEmitter } from "events";
import { logger } from "../logger/logger.js";

export interface DomainEvent<T = unknown> {
  eventName: string;
  occurredAt: Date;
  payload: T;
}

export class DomainEventBus {
  private static instance: DomainEventBus;
  private emitter: EventEmitter;

  private constructor() {
    this.emitter = new EventEmitter();
    this.emitter.setMaxListeners(50);
  }

  public static getInstance(): DomainEventBus {
    if (!DomainEventBus.instance) {
      DomainEventBus.instance = new DomainEventBus();
    }
    return DomainEventBus.instance;
  }

  public publish<T>(eventName: string, payload: T): void {
    const event: DomainEvent<T> = {
      eventName,
      occurredAt: new Date(),
      payload,
    };
    logger.debug({ eventName, payload }, "Domain event published");
    // Asynchronous dispatch to avoid blocking request cycle
    setImmediate(() => {
      this.emitter.emit(eventName, event);
    });
  }

  public subscribe<T>(eventName: string, handler: (event: DomainEvent<T>) => Promise<void> | void): void {
    this.emitter.on(eventName, async (event: DomainEvent<T>) => {
      try {
        await handler(event);
      } catch (error) {
        logger.error({ error, eventName }, "Error processing domain event in listener");
      }
    });
  }
}

export const domainEventBus = DomainEventBus.getInstance();
