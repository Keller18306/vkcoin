import { VKCoinAPI } from "./api";
import { getIframeUrl } from "./getIframeUrl";
import { getUserId } from "./getUserId";
import { VKCoinWebSocket } from "./ws";

export class VKCoin {
    public access_token: string;

    public key: string | undefined;
    public userId: number | undefined;

    public ws: VKCoinWebSocket;
    public api: VKCoinAPI;

    constructor (access_token: string) {
        if(!access_token) throw new Error('access_token is required')
        this.access_token = access_token

        this.ws = new VKCoinWebSocket()
        this.api = new VKCoinAPI({ userId: 1, key: '.' })
    }

    async start() {
        const [id, url] = await Promise.all([
            getUserId(this.access_token),
            getIframeUrl(this.access_token)
        ])

        if(typeof id != 'number') throw new Error('can not get userId by access_token')
        if(typeof url != 'string' || url == '') throw new Error('can not get iframeUrl by access_token')

        this.ws = new VKCoinWebSocket(url)

        await this.ws.start()

        const key = this.ws.getMerchantKey()

        if(typeof key != 'string') throw new Error('can not get key by access_token')

        this.api = new VKCoinAPI({userId: id, key: key})

        this.key = key
        this.userId = id

        return this
    }
}