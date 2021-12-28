

import { Consumer, Router, Transport, Producer, RtpCapabilities } from "mediasoup/node/lib/types";
import WebSocket from "ws";
import { createWebRtcTransport } from "./createWebrtcTransport";
import { createWorker } from "./worker";


let mediasoupRouter: Router;
let producerTransport: Transport;
let consumerTransport: Transport;
let producer: Producer;
let consumer: Consumer;

const WebsocketConnection = async (websock: WebSocket.Server) => {
    try {
        mediasoupRouter = await createWorker()
    } catch (error) {
        throw error;
    }




    websock.on('connection', (ws: WebSocket) => {
        ws.on('message', (message: string) => {
            message = message.toString();


            const jsonValidation = IsJsonString(message);
            if (!jsonValidation) {
                console.error('json error ')
                return
            }
            const event = JSON.parse(message);

            switch (event.type) {
                case 'getRouterRtpCapabilities':
                    onRouterRtpCapabilities(event, ws)
                    break;
                case 'createProducerTransport':
                    onCreateProducerTransport(event, ws);
                    break;
                case 'connectProducerTransport':
                    onConnectProducerTransport(event, ws);
                    break;
                case 'produce':
                    onProduce(event, ws, websock);
                    break;
                case 'createConsumerTransport':
                    onCreateConsumerTransport(event, ws)
                    break;
                case 'connectConsumerTransport':
                    onConnectConsumerTransport(event, ws)
                    break;
                case 'resume':
                    onResume(ws)
                    break;
                case 'consume':
                    onConsume(event, ws)
                    break;
                default:
                    break;
            }
        })
    });
    const onConsume = async (event: any, ws: WebSocket) => {
        const res = await createConsumer(producer, event.rtpCapabilities)
        console.log("response to onSubscribed => ", event.rtpCapabilities)
        send(ws, "subscribed", res)

    }
    const onResume = async (ws: WebSocket) => {
        await consumer.resume();
        send(ws, "resumed", "resumed")
    }
    const onConnectConsumerTransport = async (event: any, ws: WebSocket) => {
        await consumerTransport.connect({ dtlsParameters: event.dtlsParameters });
        send(ws, "subConnected", "consumer transport connected");
    }
    const onCreateConsumerTransport = async (event: string, ws: WebSocket) => {
        console.log("onCreateConsumerTransport called")
        try {
            const { transport, params } = await createWebRtcTransport(mediasoupRouter)
            consumerTransport = transport;
            send(ws, "subTransportCreated", params)
        } catch (error) {

        }
    }
    const onProduce = async (event: any, ws: WebSocket, websocket: WebSocket.Server) => {
        const { kind, rtpParameters } = event;
        producer = await producerTransport.produce({ kind, rtpParameters })
        console.log("onProduce", producer.id)
        const resp = {
            id: producer.id
        }

        send(ws, 'produced', resp)
        broadcast(websocket, 'newProducer', 'new user')
    }
    const onConnectProducerTransport = async (event: any, ws: WebSocket) => {
        console.log('producer connected')
        await producerTransport.connect({ dtlsParameters: event.dtlsParameters })
        send(ws, 'producerConnected', 'producer connect!')
    }
    const onRouterRtpCapabilities = (event: string, ws: WebSocket) => {
        console.log("rtp capabilities fuction evocked")
        send(ws, "routerCapabilities", mediasoupRouter.rtpCapabilities)
    }
    const onCreateProducerTransport = async (event: string, ws: WebSocket) => {
        try {
            const { transport, params } = await createWebRtcTransport(mediasoupRouter);
            producerTransport = transport;
            send(ws, "producerTransportCreated", params);

        } catch (error) {
            console.error(error);
            send(ws, "error", error)
        }

    }
    const IsJsonString = (str: string) => {

        try {



            JSON.parse(str)
        } catch (error) {
            return false
        }
        return true
    }
    const send = (ws: WebSocket, type: string, msg: any) => {
        const message = {
            type,
            data: msg
        }
        const resp = JSON.stringify(message);
        ws.send(resp);
    }

    const broadcast = (ws: WebSocket.Server, type: string, msg: any) => {
        const message = {
            type,
            data: msg
        }
        const resp = JSON.stringify(message);
        ws.clients.forEach((client) => {
            client.send(resp)
        });
    }
    const createConsumer = async (producer: Producer, rtpCapabilities: RtpCapabilities) => {

        if (!mediasoupRouter.canConsume(
            {
                producerId: producer.id,
                rtpCapabilities
            }

        )) {
            console.error('can not consume');
            return;
        }
        try {
            consumer = await consumerTransport.consume({
                producerId: producer.id,
                rtpCapabilities,
                paused: producer.kind === 'video'
            })
        } catch (error) {
            console.error('consume failed!', error);
            return
        }
        return {
            producerId: producer.id,
            id: consumer.id,
            kind: consumer.kind,
            rtpParameters: consumer.rtpParameters,
            type: consumer.type,
            producerPaused: consumer.producerPaused
        }
    }
}


export { WebsocketConnection }