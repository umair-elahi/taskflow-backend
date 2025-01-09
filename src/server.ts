import * as https from 'https';
import * as fs from 'fs';
import * as Koa from 'koa';
import * as koaBody from 'koa-body';
import * as cors from 'koa2-cors';
import * as dotenv from 'dotenv';
import * as bunyanLogger from 'koa-bunyan-logger';
import config from './config/index';
import pagination from './middleware/pagination';
import errorMiddleware from './middleware/error';
import response from './middleware/response';
import routes from './route/index';
import { Logger } from './utils/logger';

dotenv.config();

const whitelist: string | any[] = [
  'http://localhost:4200',
  'http://localhost:3000',
  'http://localhost:8100',
  'http://34.199.172.154:3000',
  'http://34.199.172.154',
  'http://localhost:3000/upload',
  'https://aetasaal.duckdns.org',
  'https://aetasaal.duckdns.org:3000',
  'http://localhost:3000/api'
];
function checkOriginAgainstWhitelist(ctx: Koa.Context) {
  const requestOrigin = ctx.request.headers.origin || ctx.request.origin;
  if (!whitelist.includes(requestOrigin)) {
    return ctx.throw(403, `${requestOrigin} is not a valid origin`);
  }
  return requestOrigin;
}

//@ts-ignore
export async function startServer(log: Logger) {
  const app = new Koa();

  try {
    const privateKey = fs.readFileSync('/etc/letsencrypt/live/aetasaal.duckdns.org/privkey.pem', 'utf8');
    const certificate = fs.readFileSync('/etc/letsencrypt/live/aetasaal.duckdns.org/cert.pem', 'utf8');
    const ca = fs.readFileSync('/etc/letsencrypt/live/aetasaal.duckdns.org/chain.pem', 'utf8');

    const httpsOptions = { key: privateKey, cert: certificate, ca: ca };

    const server = https.createServer(httpsOptions, app.callback());

    //@ts-ignore
    app.use(cors({
      //@ts-ignore
      origin: (ctx: Koa.Context) => {
        // Explicitly allow requests from the specified origin with HTTPS
        return 'https://aetasaal.duckdns.org';
      },
      credentials: true,
      allowHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization', 'appversion', 'platform'],
    }));

    //@ts-ignore
    app.use(bunyanLogger(log));
    app.use(async (ctx: Koa.Context, next: any) => {
      ctx.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      await next();
    });

    //@ts-ignore
    app.use(koaBody({ jsonLimit: '10mb', formLimit: '50mb', multipart: true, json: true }));
    app.use(pagination);
    app.use(errorMiddleware());
    app.use(routes());
    app.use(response());

    return new Promise<void>((resolve, reject) => {
      const p = process.env.PORT || config.server.port;
      //@ts-ignore
      server.listen(p, () => {
//@ts-ignore
        log.info('server started on port %d with env=%s', p, config.env);
        resolve();
      });

      server.on('error', err => {
        reject(err);
      });
    });
  } catch (err) {
    throw new Error(`Error reading SSL certificate and private key files: ${err.message}`);
  }
}




// import * as Bunyan from 'bunyan';
// import * as Koa from 'koa';
// import * as koaBody from 'koa-body';
// import * as helmet from 'koa-helmet';
// import * as mount from 'koa-mount';
// import * as serve from 'koa-static';
// import * as cors from 'koa2-cors';
// import * as dotenv from 'dotenv';
// import * as bunyanLogger from 'koa-bunyan-logger';
// import * as path from 'path';

// import config from './config/index';
// import pagination from './middleware/pagination';
// import errorMiddleware from './middleware/error';
// import response from './middleware/response';
// import routes from './route/index';
// import { Logger } from './utils/logger';
// import { Context, Middleware } from 'koa';

// dotenv.config();

// const whitelist: string | any[] = [
//   'http://localhost:4200',
//   'http://localhost:4000',
//   'http://localhost:3000',
//   'http://localhost',
//   'http://localhost:8100',
//   'https://aetasaal.duckdns.org',
//   // 'http://54.146.103.85:3000',
//   // 'http://54.146.103.85:3000/upload',
//   // 'http://54.146.103.85:3000/api',
//   // 'http://54.146.103.85',
//   'https://workable.aetasaal2.0.com'
// ];
// function checkOriginAgainstWhitelist(ctx: Koa.Context) {
//   const requestOrigin = ctx.request.headers.origin || ctx.request.origin;
//   if (!whitelist.includes(requestOrigin)) {
//     return ctx.throw(`${requestOrigin} is not a valid origin`);
//   }
//   return requestOrigin;
// }
// export async function startServer(log: Bunyan) {
//   const app = new Koa();
//   //@ts-ignore
//   app.use(bunyanLogger(log));
//   app.use(async (ctx: Context, next: any) => {
//     ctx.set('Cache-Control', 'no-cache, no-store, must-revalidate');
//     await next();
//   });
//   app.use(cors({ origin: checkOriginAgainstWhitelist }));
//   app.use(koaBody({ jsonLimit: '10mb', formLimit: '50mb', multipart: true, json: true }));
//   app.use(pagination);
//   const frontendDir = path.join(__dirname, '..', '..', 'taskflow-frontend', 'dist', 'aetasaal-web');
//   console.log("frontend", frontendDir);
//   //@ts-ignore
//   app.use(serve(frontendDir));
//   app.use(errorMiddleware());
//   app.use(routes());
//   app.use(response());
//   return new Promise<void>((resolve, reject) => {
//     const p = process.env.PORT || config.server.port;
//     app.listen(p, () => {
//       //@ts-ignore
//       log.info('server started on port %d with env=%s', p, config.env);
//       resolve();
//     });
//     app.on('error', err => {
//       reject(err);
//     });
//   });
// }