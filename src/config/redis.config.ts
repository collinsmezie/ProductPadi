import { GlideClusterClient } from "@valkey/valkey-glide";
import EventEmitter from "events";
import { createClient } from "redis";

type RedisClient = any;

// Event emitter for pub/sub message handling
const messageEmitter = new EventEmitter();

// Closure to maintain client instances
const createRedisClientManager = () => {
  let publisherInstance: RedisClient | null = null;
  let subscriberInstance: RedisClient | null = null;

  // Factory functions for different environments
  const createProductionRedisClient = async (): Promise<RedisClient> => {
    try {
      // TODO: Replace this with your actual AWS ElastiCache implementation
      // const client = await GlideClusterClient.createClient({
      //   addresses: [{
      //     host: process.env.REDIS_HOST || '',
      //     port: parseInt(process.env.REDIS_PORT || '6379')
      //   }],
      //   useTLS: process.env.REDIS_USE_TLS === 'true',
      // });
      
      console.log('Connected to AWS ElastiCache Redis');
      // return client;
    } catch (error) {
      console.error('Failed to connect to AWS ElastiCache Redis:', error);
      throw error;
    }
  };

  const createLocalRedisClient = async (): Promise<RedisClient> => {
    try {
      const client = createClient({
        url: `redis://${process.env.LOCAL_REDIS_HOST || 'localhost'}:${process.env.LOCAL_REDIS_PORT || '6379'}`,
        password: process.env.LOCAL_REDIS_PASSWORD,
      });

      client.on('error', (err: any) => {
        console.error('Local Redis Client Error', err);
      });

      await client.connect();
      console.log('Connected to local Redis');
      return client;
    } catch (error) {
      console.error('Failed to connect to local Redis:', error);
      throw error;
    }
  };

  // Get publisher client (used for general operations and publishing)
  const getPublisherClient = async (): Promise<RedisClient> => {
    if (!publisherInstance) {
      const environment = process.env.NODE_ENV || 'development';
      publisherInstance = environment === 'production'
        ? await createProductionRedisClient()
        : await createLocalRedisClient();
    }
    return publisherInstance;
  };

  // Get subscriber client (dedicated connection for subscriptions)
  const getSubscriberClient = async (): Promise<RedisClient> => {
    if (!subscriberInstance) {
      const environment = process.env.NODE_ENV || 'development';
      subscriberInstance = environment === 'production'
        ? await createProductionRedisClient()
        : await createLocalRedisClient();
    }
    return subscriberInstance;
  };

  // Close all Redis connections
  const closeConnections = async (): Promise<void> => {
    try {
      if (publisherInstance) {
        await publisherInstance.disconnect();
        publisherInstance = null;
      }
      
      if (subscriberInstance) {
        await subscriberInstance.disconnect();
        subscriberInstance = null;
      }
      
      console.log('All Redis connections closed');
    } catch (error) {
      console.error('Error closing Redis connections:', error);
    }
  };

  return {
    getPublisherClient,
    getSubscriberClient,
    closeConnections
  };
};

// Create a singleton instance of the manager
export const redisManager = createRedisClientManager();

// Initialize Redis clients for pub/sub
export const initRedis = async () => {
  try {
    // Initialize both clients
    const publisher = await redisManager.getPublisherClient();
    const subscriber = await redisManager.getSubscriberClient();
    
    console.log('Redis pub/sub service initialized');
    return true;
  } catch (error) {
    console.error('Failed to initialize Redis clients:', error);
    return false;
  }
};

// Subscribe to a channel
export const subscribe = async (channel: string, callback: (data: any) => void) => {
  try {
    const subscriber = await redisManager.getSubscriberClient();
    
    await subscriber.subscribe(channel, (message: string) => {
      try {
        const data = JSON.parse(message);
        callback(data);
      } catch (error) {
        console.error(`Error handling message from channel ${channel}:`, error);
      }
    });
    
    console.log(`Subscribed to channel: ${channel}`);
  } catch (error) {
    console.error(`Error subscribing to channel ${channel}:`, error);
    throw error;
  }
};

// Publish to a channel
export const publish = async (channel: string, data: any) => {
  try {
    const publisher = await redisManager.getPublisherClient();
    
    const message = JSON.stringify(data);
    await publisher.publish(channel, message);
  } catch (error) {
    console.error(`Error publishing to channel ${channel}:`, error);
    throw error;
  }
};



// Simplified interface for external usage
export const getRedisClient = redisManager.getPublisherClient;
export const closeRedisConnection = redisManager.closeConnections;

export default {
  initRedis,
  subscribe,
  publish,
  closeRedisConnection,
  getRedisClient
};