import _ from 'lodash';
import Koa from 'koa';
import Router from 'koa-router';
import bodyParser from 'koa-bodyparser';
import { createServer } from 'http';
import { createServer as createServerHttps } from 'https';
import cors from '@koa/cors';
import { getLogHistory, l } from '../utils/environment/log';
import { sniRequestReceived } from './https_sni_request';
import { initHttpServerRoutes as initHttpInitiator } from './initiators/httpApiInitiator';
import { initHttpServerRoutes as initRendezvousInitiator } from './initiators/rendezvousServiceInititor';
import { BUILD_VERSION_NOT_SANITIZED } from '../utils/version';
import { getAudioSourcesSinksManager } from '../audio/get_audio_sources_sinks_manager';

const log = l.extend(`httpserver`);

export interface SoundSyncHttpServer {
  app: Koa<Koa.DefaultState, Koa.DefaultContext>;
  router: Router<any, {}>;
  port: number;
}

export const getHttpServer = _.memoize(async (port: number): Promise<SoundSyncHttpServer> => {
  log(`Creating new http server`);
  const app = new Koa();
  const router = new Router();

  app.use(cors({
    // TODO limit CORS access here
  }));
  app.use(bodyParser());
  app.use(router.routes());

  router.get('/debuginfo', (ctx) => {
    ctx.body = {
      version: BUILD_VERSION_NOT_SANITIZED,
      platform: process.platform,
      arch: process.arch,
      logs: getLogHistory(),
      sources: getAudioSourcesSinksManager().sources.map((s) => s.getDebugInfo()),
      sinks: getAudioSourcesSinksManager().sinks.map((s) => s.getDebugInfo()),
    };
    ctx.status = 200;
  });

  initHttpInitiator(router);
  initRendezvousInitiator(router);

  const server = createServer(app.callback());
  await new Promise((resolve, reject) => {
    server.on('error', (e) => {
      reject(e);
    });
    server.listen(port);
    server.on('listening', resolve);
  });
  log(`Listening on ${port}`);

  // The https server is used to receive a rendezvous message advertisement from a https browser context (like from https://soundsync.app)
  // The https context needs to communicate to the http context in the local network and this hack is here to do that
  const httpsPort = port + 1;
  log(`Creating https server on ${httpsPort}`);
  const httpsServer = createServerHttps({
    SNICallback: async (serverName, cb) => {
      await sniRequestReceived(serverName);
      cb(new Error('Not supported'), null);
    },
  }, app.callback());
  httpsServer.listen(httpsPort);

  return {
    app,
    router,
    port,
  };
});
