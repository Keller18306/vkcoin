import { VKCoinAPI } from "./api";
import { getIframeUrl } from "./getIframeUrl";
import { getUserId } from "./getUserId";
import { VKCoinQueuer } from "./queuer";
import { VKCoinWebSocket } from "./ws";

export class VKCoin {
    public access_token: string;

    public key: string | undefined;
    public userId: number | undefined;

    public ws: VKCoinWebSocket;
    public api: VKCoinAPI;

    public queuer: VKCoinQueuer;

    constructor (access_token: string) {
        if(!access_token) throw new Error('access_token is required')
        this.access_token = access_token

        this.ws = new VKCoinWebSocket()
        this.api = new VKCoinAPI({ userId: 1, key: '.' })

        this.queuer = new VKCoinQueuer()
    }

    async start() {
        const [id, url] = await Promise.all([
            getUserId(this.access_token),
            getIframeUrl(this.access_token)
        ])

        if(typeof id != 'number') throw new Error('can not get userId by access_token')
        if(typeof url != 'string' || url == '') throw new Error('can not get iframeUrl by access_token')

        await this.ws.start(url)

        const key = await this.ws.getMerchantKey()

        if(typeof key != 'string') throw new Error('can not get key by access_token')

        this.api = new VKCoinAPI({userId: id, key: key})

        this.key = key
        this.userId = id

        this.queuer.addWorker((toId: number, amount: number, fromShop: boolean) => {
            return this.ws.transfer(toId, amount, fromShop)
        })

        this.queuer.addWorker((toId: number, amount: number, fromShop: boolean) => {
            return this.api.sendCoins(toId, amount, fromShop)
        })

        return this
    }

    async transfer(toId: number, amount: number, fromShop: boolean = false) {
        return this.queuer.addTask(toId, amount, fromShop)
    }
}