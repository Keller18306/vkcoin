import { EventEmitter } from 'events';
import { formatURL, isJSON, timePromise } from './utils';

import { default as WebSocket } from 'ws'

type InitType = {
    type: 'INIT',
    score: number,
    place: number,
    randomId: number,
    pow: string/*"530-220*786+window.Math.round(680/2)*2-((typeof window.parseInt !== 'undefined') ? 1 : 5)+(window.WebSocket ? 1 : 2)+902"*/,
    items: [],
    tx: number[],
    top: {
        userTop: {
            id: number,
            score: number,
            first_name: string,
            last_name: string,
            can_access_closed: boolean,
            is_closed: boolean,
            photo_200: string,
            link: string
        }[],
        groupTop: {
            id: number,
            score: number,
            name: string,
            screen_name: string,
            is_closed: boolean,
            type: 'page' | 'group',
            photo_200: string,
            link: string
        }[],
        online: number,
        txSum: number[],
        total: number[],
        groupInfo: null | any /*tempory any type*/
    },
    tick: number,
    vkpay: boolean,
    ccp: number,
    firstTime: boolean,
    ttl: number,
    digits: {
        description: string,
        value: number,
        trend: number
    }[],
    hasGift: boolean,
    botList: {
        id: number,
        name: string,
        description: string,
        image: string,
        url: string,
        flag: number,
        percent: number,
        order: number
    }[]
}

const WSOpcodes = {
    COMPLETE: 'C',
    ERROR: 'R',
    ENCOMING_TRANSACTION: 'TR',
    INIT: 'INIT',
    NEW_MERCHANT: 'NM',
    TRANSACTION: 'T',
    PUSH: 'P',
    ALREADY_CONNECTED: 'ALREADY_CONNECTED',
    BROKEN: 'BROKEN'
}

export declare interface VKCoinWebSocket {
    on(event: 'connect', listener: () => void): this
    on(event: 'init', listener: (data: InitType) => void): this
    on(event: 'answer', listener: (data: { id: number, type: 'C' | 'R', message: string }) => void): this
    on(event: 'ALREADY_CONNECTED', listener: () => void): this
    on(event: 'BROKEN', listener: () => void): this

    once(event: 'connect', listener: () => void): this
    once(event: 'init', listener: (data: InitType) => void): this
    once(event: 'answer', listener: (data: { id: number, type: 'C' | 'R', message: string }) => void): this
    once(event: 'ALREADY_CONNECTED', listener: () => void): this
    once(event: 'BROKEN', listener: () => void): this
}

export class VKCoinWebSocket extends EventEmitter {
    public url: string | undefined;

    public ws: WebSocket | null = null;

    public score: null | number = null;

    private reconnectOnClose: boolean = false;
    private pingInterval: NodeJS.Timeout | null = null;

    private queueId: number = 0;

    constructor(iframe_url?: string) {
        super()

        if (iframe_url) this.url = formatURL(iframe_url)
    }

    private onOpen() {
        this.reconnectOnClose = true
        this.pingInterval = setInterval(() => {
            this.ws?.ping()
        }, 15 * 1e3)
        this.emit('connect')
    }

    private onMessage(messsage: WebSocket.Data) {
        if (typeof messsage != 'string') return;

        if (isJSON(messsage)) {
            const json = JSON.parse(messsage)

            if (json.type == 'INIT') return this.onInit(json)

            console.log('new json', json)
        } else {
            if (messsage === WSOpcodes.ALREADY_CONNECTED) return this.emit(WSOpcodes.ALREADY_CONNECTED);
            if (messsage === WSOpcodes.BROKEN) return this.emit(WSOpcodes.BROKEN);

            if ([WSOpcodes.COMPLETE, WSOpcodes.ERROR].includes(messsage[0])) return this.onAnswer(messsage)

            console.log('opcode', messsage)
        }
    }

    private onInit(json: InitType) {
        this.score = json.score
        this.emit('init', json)
    }

    private onAnswer(message: string) {
        const id = +message.split(' ')[0].substr(1)
        const type = message[0]
        const text = message.split(' ').slice(1).join(' ')
        this.emit('answer', {
            id: id,
            type: type,
            message: text
        })
    }

    private onClose(code: number, reason: string) {
        if (this.pingInterval) clearInterval(this.pingInterval)

        if (this.reconnectOnClose) this.reconnect()
    }

    connect(): void {
        if (!this.url) throw new Error('can not connect without url')
        if (this.ws != null) throw new Error('WebSocket is already started')

        this.ws = new WebSocket(this.url)

        this.ws.on('open', () => this.onOpen())
        this.ws.on('message', (data) => this.onMessage(data))
        this.ws.on('close', (code, reason) => this.onClose(code, reason))
        this.ws.on('ping', (data) => {
            this.ws!.pong(data)
        })
    }

    disconnect(): void {
        if (this.ws == null) throw new Error('WebSocket is already disconnected')

        this.reconnectOnClose = false

        if (
            this.ws.readyState == this.ws.CONNECTING ||
            this.ws.readyState == this.ws.OPEN
        ) this.ws.close()

        this.ws = null
    }

    reconnect(): void {
        if (this.ws != null) this.disconnect()
        this.connect()
    }

    async start() {
        if (this.ws == null) throw new Error('WebSocket not connected')

        const res = new Promise<true>((res, rej) => {
            this.once('init', () => {
                res(true)
            })
            this.once('BROKEN', () => {
                rej(new Error('iframe_url is invalid'))
            })
            this.ws?.once('error', (err) => {
                rej(err)
            })
        })

        this.connect()

        return res
    }

    async command(command: string): Promise<string> {
        if (this.ws == null) throw new Error('WebSocket not connected')
        this.queueId++

        const id = this.queueId

        const promise = timePromise((res, rej) => {
            const that = this
            function answer(data: { id: number, type: 'C' | 'R', message: string }) {
                if (data.id != id) return;

                that.removeListener('answer', answer)

                if (data.type === WSOpcodes.COMPLETE) return res(data.message)
                if (data.type === WSOpcodes.ERROR) return rej(new Error(data.message))

                rej(new Error('unknown response type'))
            }
            this.on('answer', answer)
        }, 10 * 1e3) as Promise<string>

        this.ws.send(`${WSOpcodes.PUSH}${id} ${command}`)

        return promise
    }

    async getMerchantKey(): Promise<string> {
        const response = await this.command(WSOpcodes.NEW_MERCHANT)

        return JSON.parse(response)
    }

    async transfer(vk_id: number, amount: number, isFromUrl: boolean = false, payload?: number, asMerchant?: boolean) {
        if (isFromUrl && asMerchant) throw new Error('cannot send from url, when enabled as merchant')
        if (asMerchant != undefined && payload == undefined) throw new Error('payload can not be undefined, when asMerchant declared')
        if (payload != undefined && !(-2000000000 >= payload && payload <= 2000000000)) throw new Error(`payload range must be from -2000000000 to 2000000000`)

        return this.command(`${WSOpcodes.TRANSACTION} ${vk_id} ${amount} ${Number(isFromUrl)}${payload != undefined ? ` ${payload}` : ''}${asMerchant != undefined ? ` ${Number(asMerchant)}` : ''}`)
    }
}