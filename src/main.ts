import express from 'express';
import * as http from 'http';
import * as  Websocket from 'ws';
import { WebsocketConnection } from './lib/ws';

const main = async () => {
    const app = express();
    const server = http.createServer(app)
    const webSocket = new Websocket.Server({ server, path: '/ws' })
    WebsocketConnection(webSocket);
    const port = 8080;

    server.listen(port, () => {
        console.log('server started  on port 8080')
    })
}

export { main }