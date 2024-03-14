import fetch from 'node-fetch';
import https from 'https';
import http from 'http';
import { readFileSync } from 'fs'

const noop = () => {}; // eslint-disable-line no-empty-function
type HTTPMethod = 'get' | 'post' | 'delete' | 'patch' | 'put';
const methods = ['get', 'post', 'delete', 'patch', 'put'];
const reflectors = [
  'toString',
  'valueOf',
  'inspect',
  'constructor',
  Symbol.toPrimitive,
  Symbol.for('nodejs.util.inspect.custom'),
];

function routeBuilder() {
    const route = [''];
    const handler: any = {
        // every time an attribute is accessed the name is added to the route
        // e.g api.att1.att2.att3 -> .../att1/att2/att3/
        get (target: string, name: string): any {
            if (reflectors.includes(name)) return () => route.join('/'); // If serialized return URL
            if (methods.includes(name)) {
                // Send request
                // return (options) => `${name.toUpperCase()} ${route.join('/')}`;
                return (options: any) => request(name as HTTPMethod, route.join('/'), options);
            }
            route.push(name)
            // very clever hack, returns an empty object that when accessed turns the attributes into URL paths
            return new Proxy(noop, handler);
        },
        // if there is a method called the parameter turns into another directory in the path
        // e.g api.method(param) -> .../method/param/
        apply(target: string, _: any, args: string[]): any {
            route.push(...args.filter(x => x != null)); // eslint-disable-line eqeqeq
            return new Proxy(noop, handler);
        }
    }
    return new Proxy(noop, handler);
}

async function request(method: HTTPMethod, route: string, options = null) {
    const protocol = process.env.USE_SSL == 'true' ? 'https' : 'http';
    const url = `${protocol}://${process.env.HOSTNAME}:${process.env.API_PORT}${process.env.API_HOME}${route}`;
    const agent = new https.Agent({ ca:getCertificate(), keepAlive: true });
    // const agent = new http.Agent({keepAlive: true});
    let headers = {
        'User-Agent': 'hapico',
        'Content-Type': ''
    };
    let body;
    // TODO: handle auth, add 'Authorization' to header
    if (options != null) {
        body = JSON.stringify(options);
        headers['Content-Type'] = 'application/json';
    }
    return await fetch(url, {
        method,
        headers,
        agent,
        body
    });
}

function getCertificate() {
    return [readFileSync(process.env.SSL_CA_CERT as string)];
}

class REST {
    get api(): any {
        return routeBuilder();
    }
}

const rest = new REST();
export { rest as default };
