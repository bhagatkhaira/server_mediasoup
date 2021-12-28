import { Router } from "mediasoup/node/lib/Router";
import { config } from '../config'

const createWebRtcTransport = async (mediasoupRouter: Router) => {
    const {
        maxIncomeBitrate,
        initialAvailableOutgoingBitrate,
    } = config.mediasoup.webRtcTransport;

    const transport = await mediasoupRouter.createWebRtcTransport({
        listenIps: config.mediasoup.webRtcTransport.listenIps,
        enableUdp: true,
        enableTcp: true,
        preferUdp: true,
        initialAvailableOutgoingBitrate,
    });
    console.log("transport from Webrtc transport", transport.iceParameters)
    if (maxIncomeBitrate) {
        try {
            await transport.setMaxIncomingBitrate(maxIncomeBitrate)
        } catch (error) {
            console.error(error)
        }
    }
    return {
        transport,
        params: {
            id: transport.id,
            iceParameters: transport.iceParameters,
            iceCandidates: transport.iceCandidates,
            dtlsParameters: transport.dtlsParameters
        }
    }
}
export { createWebRtcTransport }