import config from 'config';
import Router, { url } from 'koa-router';
import { DefaultState, Context } from 'koa';
import cors from '@koa/cors';
import { redis } from '../lib/redis';

const SECONDS_IN_DAY = 24 * 60 * 60;
const getDayTimestamp = () => Math.floor(new Date().getTime() / 1000 / SECONDS_IN_DAY);

const router = new Router<DefaultState, Context>();

const sanitizeIp = (ip: string) => {
  if (ip === '::1' || ip === '::ffff:127.0.0.1') {
    return '127.0.0.1';
  }
  return ip;
};

const allowedOriginsHostnames = ['localhost', '127.0.0.1', 'soundsync.localtunnel.apps.besson.co'];
router.use(cors({
  origin: (ctx) => {
    const origin = ctx.request.headers.origin;
    const hostname = new URL(origin).hostname.split(':')[0];
    if (allowedOriginsHostnames.includes(hostname)) {
      return origin;
    }
    return null;
  },
}));

router.post(`/api/ip_registry/register`, async (ctx) => {
  ctx.assert(typeof ctx.request.body === 'string', 400, 'body should be a string');
  ctx.assert(ctx.request.body.length < 1024, 400, 'body length should be less than 1024 chars'); // 1024 because in some cases a peer can have a lot of internal IP addresses (Docker for example)
  const internalIps = ctx.request.body.split(',');
  const externalIp = sanitizeIp(ctx.request.ip);
  // we add the ip to two sets, one for the current day and one for the next day and set the expire time accordingly
  // this is used to delete unused internal ip after 24h using only the expire strategy of redis

  const pipeline = redis.pipeline();
  internalIps.forEach((ip) => {
    pipeline.sadd(`ip_registry:${getDayTimestamp()}:${externalIp}`, ip);
    pipeline.sadd(`ip_registry:${getDayTimestamp() + 1}:${externalIp}`, ip);
  });
  pipeline.expire(`ip_registry:${getDayTimestamp()}:${externalIp}`, config.get('ipAddressRegistryExpireTime'));
  pipeline.expire(`ip_registry:${getDayTimestamp() + 1}:${externalIp}`, SECONDS_IN_DAY);
  await pipeline.exec();

  ctx.status = 204;
});

router.get('/api/ip_registry/peers', async (ctx) => {
  const externalIp = sanitizeIp(ctx.request.ip);

  const ips = await redis.smembers(`ip_registry:${getDayTimestamp()}:${externalIp}`);
  ctx.body = ips;
});

router.get('/api/ip_registry/external_ip', async (ctx) => {
  const externalIp = sanitizeIp(ctx.request.ip);
  ctx.body = {
    ip: externalIp,
  };
});

export default router;
