import { EventEmitter } from 'events';
import { formatURL, isJSON, timePromise } from './utils';

import { default as WebSocket } from 'ws'
import { TransferItem } from '../api/types';

type Group = {
    id: number,
    name: string,
    screen_name: string,
    is_closed: 0 | 1,
    type: 'group' | 'page',
    photo_200: string
}

type Top = {
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
}

type InitType = {
    type: 'INIT',
    score: number,
    place: number,
    randomId: number,
    pow: string/*"530-220*786+window.Math.round(680/2)*2-((typeof window.parseInt !== 'undefined') ? 1 : 5)+(window.WebSocket ? 1 : 2)+902"*/,
    items: [],
    tx: number[],
    top: Top,
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
    INCOMING_TRANSACTION: 'TR',
    INCOMING_TRANSACTION_BALANCE: 'TZ',
    INIT: 'INIT',
    NEW_MERCHANT: 'NM',
    TRANSACTION: 'T',
    PUSH: 'P',
    ALREADY_CONNECTED: 'ALREADY_CONNECTED',
    BROKEN: 'BROKEN',
    TOP: 'P',
    BOT_CLICK: 'BC', //stats
    BOT_SHOW: 'BS', //stats
    LOAD_GROUP: 'G',
    GET_RICH: 'GR', //don't used (removed in coin from 01.08.2021)
    SET_RICH: 'SR', //don't used (removed in coin from 01.08.2021)
    GET_TRANSCATIONS: 'TX',
    GET_SCORE: 'GS',
    GET_MY_PLACE: 'X',
    GET_GIFT: 'GG',
    SYNC_TX_LIST: 'SY',
    TRACK_TYPE: 'TS', //I DON'T NOW | TO DO
    BUY_ITEM_BY_ID: 'B' //don't used after close mining
}

export declare interface VKCoinWebSocket {
    on(event: 'connect', listener: () => void): this
    on(event: 'init', listener: (data: InitType) => void): this
    on(event: 'answer', listener: (data: { id: number, type: 'C' | 'R', message: string }) => void): this
    on(event: 'ALREADY_CONNECTED', listener: () => void): this
    on(event: 'BROKEN', listener: () => void): this
    on(event: 'transfer', listener: (data: { id: number, amount: number, fromId: number, currentBalance: number, getMore: () => Promise<TransferItem> }) => void): this

    once(event: 'connect', listener: () => void): this
    once(event: 'init', listener: (data: InitType) => void): this
    once(event: 'answer', listener: (data: { id: number, type: 'C' | 'R', message: string }) => void): this
    once(event: 'ALREADY_CONNECTED', listener: () => void): this
    once(event: 'BROKEN', listener: () => void): this
    once(event: 'transfer', listener: (data: { id: number, amount: number, fromId: number, currentBalance: number, getMore: () => Promise<TransferItem> }) => void): this
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

            const args = messsage.split(' ')
            const opcode = args[0]

            //old transaction message
            if (opcode === WSOpcodes.INCOMING_TRANSACTION) return;

            //new transaction message (with current balance)
            if (opcode === WSOpcodes.INCOMING_TRANSACTION_BALANCE) {
                this.score = +args[4]
                console.log('a')
                return this.emit('transfer', {
                    id: +args[3],
                    amount: +args[1],
                    fromId: +args[2],
                    currentBalance: this.score,
                    getMore: async () => {
                        return (await this.getTransactionsById([+args[3]]))[0]
                    }
                })
            }

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

    async start(iframe_url?: string): Promise<InitType> {
        if (this.ws != null) throw new Error('WebSocket is already started')
        if (iframe_url) this.url = formatURL(iframe_url)

        const res = new Promise<InitType>((res, rej) => {
            this.once('init', (data) => {
                res(data)
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
    //'{"score":2000,"place":7971264,"items":[570760228,570757995,570756978,570756211,570755867,570755800,569935646,569935644,569935605,569935600,569935598,569935594,569735848,569735847,569240000,569239999,569200030,569200029,569200026,569200021,569200015,569200010,569200003,569199997,569199992,569199989,569199988,569199987,569199984,569199980,569199974,569199971,569199963,569199956,569199953,569199951,569199945,569199941,569199940,569199932,569199927,569199926,569199923,569199922,569199921,569199920,569199918,569199917,569199916,569199915,569199914,569199913,569199912,569199911,569199910,569199908,569199907,569199906,569199905,569199903,569199902,569199901,569199900,569199898,569199897,569199896,569199894,569199893,569199892,569199890,569199889,569199887,569199885,569199884,569199883,569199882,569199881,569199880,569199879,569199878,569199877,569199876,569199875,569199874,569199873,569199872,569199871,569199870,569199869,569199868,569199867,569199866,569199865,569199864,569199863,569199862,569199861,569199860,569199859,569199856],"txId":509410683,"ownTx":570760228}'

    async getUserScores(ids: number[]): Promise<{ [id: number]: number }> {
        const res = await this.command(WSOpcodes.GET_SCORE + ' ' + ids.join(' '))

        return JSON.parse(res)
    }

    //TO DO RESPONSE
    async getGift() {
        const res = await this.command(WSOpcodes.GET_GIFT)

        return res
    }

    async syncHistory(): Promise<{ items: number[], score: number, gameFlag: 0 | 1 } | null> {
        const res = await this.command(WSOpcodes.SYNC_TX_LIST)

        const data = JSON.parse(res)
        this.score = data.score

        return data
    }

    async getMyPos(): Promise<number> {
        const res = await this.command(WSOpcodes.GET_MY_PLACE)

        return +res
    }

    async getTransactionsById(ids: number[]): Promise<TransferItem[]> {
        const res = await this.command(WSOpcodes.GET_TRANSCATIONS + ' ' + ids.join(' '))

        return JSON.parse(res)
    }

    async getTop(): Promise<Top> {
        const res = await this.command(WSOpcodes.TOP)

        return JSON.parse(res)
    }

    async getGroupById(id: number): Promise<Group> {
        const res = await this.command(WSOpcodes.LOAD_GROUP + ' ' + Math.abs(id))

        return JSON.parse(res)
    }
}