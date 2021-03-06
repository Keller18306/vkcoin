import { EventEmitter } from 'events';
import { formatURL, isJSON, timePromise } from './utils';

import { default as WebSocket } from 'ws'
import * as Types from '../api/types';

import { WSOpcodes } from './opcodes';
import { InitType, Top, Group } from './types';

export class WSAPIError extends Error {
    readonly code: string;

    constructor(code: number | string) {
        super()

        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, WSAPIError)
        }

        this.name = 'WebSocket API'

        this.code = `${code}`
        this.message = `${code}`
    }
}

export declare interface VKCoinWebSocket {
    on(event: 'connect', listener: () => void): this
    on(event: 'init', listener: (data: InitType) => void): this
    on(event: 'answer', listener: (data: { id: number, type: 'C' | 'R', message: string }) => void): this
    on(event: 'ALREADY_CONNECTED', listener: () => void): this
    on(event: 'BROKEN', listener: () => void): this
    on(event: 'transfer', listener: (data: { id: number, amount: number, fromId: number, getMore: () => Promise<Types.TransferItem>, getBalance: () => number }) => void): this

    once(event: 'connect', listener: () => void): this
    once(event: 'init', listener: (data: InitType) => void): this
    once(event: 'answer', listener: (data: { id: number, type: 'C' | 'R', message: string }) => void): this
    once(event: 'ALREADY_CONNECTED', listener: () => void): this
    once(event: 'BROKEN', listener: () => void): this
    once(event: 'transfer', listener: (data: { id: number, amount: number, fromId: number, getMore: () => Promise<Types.TransferItem>, getBalance: () => number }) => void): this
}

export class VKCoinWebSocket extends EventEmitter {
    public url: string | undefined;

    public ws: WebSocket | null = null;

    public score: null | number = null;

    private reconnectOnClose: boolean = false;
    private pingInterval: NodeJS.Timeout | null = null;

    private queueId: number = 0;

    /**
     * @description Данный WebSocket API используется для взаимодействия с приложеним VKCoin.
     * Этим API можно как бы эммитировать нахождение в приложении, взаимодействуя со всеми возможностями
     * настоящего приложения.
     * @param iframe_url Ссылка на приложение. Можно будет указать позже в методе this.start(iframe_url)
     */
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

            //transaction message
            if (opcode === WSOpcodes.INCOMING_TRANSACTION) return this.emit('transfer', {
                id: +args[3],
                amount: +args[1],
                fromId: +args[2],
                getMore: async () => {
                    return this.getTransactionById(+args[3])
                },
                getBalance: () => { return this.score }
            })

            //new balance
            if (opcode === WSOpcodes.UPDATE_BALANCE) return this.score = +args[4];

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
        this.score = null

        if (this.pingInterval) clearInterval(this.pingInterval)

        if (this.reconnectOnClose) this.reconnect()
    }

    /**
     * @description Запуск начала процедуры подключения
     */
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

    /**
     * @description Запуск начала процедуры отключения
     */
    disconnect(): void {
        if (this.ws == null) throw new Error('WebSocket is already disconnected')

        this.reconnectOnClose = false

        if (
            this.ws.readyState == this.ws.CONNECTING ||
            this.ws.readyState == this.ws.OPEN
        ) this.ws.close()

        this.ws = null
    }

    /**
     * @description Запуск начала процедуры переподключения
     */
    reconnect(): void {
        if (this.ws != null) this.disconnect()
        this.connect()
    }

    /**
     * @description Запуск WebSocket API
     * @param iframe_url Если указано, то текущий iframe_url будет заменён на указанный
     * @returns Объект инициализации
     */
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

    /**
     * @description "Голый" вызов команды
     * @param command OPCode комманда
     * @returns Результат выполнения
     */
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
                if (data.type === WSOpcodes.ERROR) return rej(new WSAPIError(data.message))

                rej(new Error('unknown response type'))
            }
            this.on('answer', answer)
        }, 10 * 1e3) as Promise<string>

        this.ws.send(`${WSOpcodes.PUSH}${id} ${command}`)

        return promise
    }

    /**
     * @description Получает API ключ для VKCoin
     * @returns Ключ API
     */
    async getMerchantKey(): Promise<string> {
        const response = await this.command(WSOpcodes.NEW_MERCHANT)

        return JSON.parse(response)
    }

    /**
     * @description Отправляет коины другому пользователю
     * @param vk_id Айди пользователя
     * @param amount Сумма, которую следует отправить (целое число)
     * @param fromShop Отправить от имени магазина?
     * @param isFromUrl Была ли транзакция выполнена по ссылке?
     * @param payload Полезная нагрузка, к транзакции, выполненной по ссылке
     * @returns Объект с информацией о транзакции
     */
    async transfer(vk_id: number, amount: number, fromShop: boolean = false, isFromUrl: boolean = false, payload: number = 0): Promise<Types.MethodSendResponse> {
        if ((isFromUrl || payload) && fromShop) throw new Error('cannot send from url, when enabled fromShop or payload')
        if (!(-2000000000 <= payload && payload <= 2000000000)) throw new Error(`payload range must be from -2000000000 to 2000000000`)

        const res = await this.command(`${WSOpcodes.TRANSACTION} ${vk_id} ${amount} ${Number(isFromUrl)} ${payload} ${Number(fromShop)}`)

        const data: { score: number, place: number, items: number[], txId: number, ownTx: number } = JSON.parse(res)
        this.score = data.score

        return { id: data.ownTx, amount: amount, current: data.score }
    }

    async getUserScores(ids: number[]): Promise<{ [id: number]: number }> {
        const res = await this.command(WSOpcodes.GET_SCORE + ' ' + ids.join(' '))

        return JSON.parse(res)
    }

    async syncHistory(): Promise<{ items: number[], score: number, gameFlag: 0 | 1 } | null> {
        const res = await this.command(WSOpcodes.SYNC_TX_LIST)

        const data = JSON.parse(res)
        this.score = data.score

        return data
    }

    /**
     * @description Получает текущую позицию в топе
     * @returns Ваша текущая позиция в топе
    */
    async getMyPos(): Promise<number> {
        const res = await this.command(WSOpcodes.GET_MY_PLACE)

        return +res
    }

    /**
     * @description Получает транзакции на текущий аккаунт по айди транзакций
     * @param ids Массив с айди транзакций
     * @returns Массив с транзакциями
    */
    async getTransactionsById(ids: number[]): Promise<Types.TransferItem[]> {
        const res = await this.command(WSOpcodes.GET_TRANSCATIONS + ' ' + ids.join(' '))

        return JSON.parse(res)
    }

    /**
     * @description Получает транзакцию на текущий аккаунт по айди транзакции
     * @param id Айди транзакции
     * @returns Массив с транзакциями
    */
    async getTransactionById(id: number): Promise<Types.TransferItem> {
        return (await this.getTransactionsById([id]))[0]
    }

    /**
     * @description Получает текущий топ
     * @returns Объект топа
    */
    async getTop(): Promise<Top> {
        const res = await this.command(WSOpcodes.TOP)

        return JSON.parse(res)
    }

    /**
     * @description Получает группу по айди
     * @param id Айди группы
     * @returns Объект группы
    */
    async getGroupById(id: number): Promise<Group> {
        const res = await this.command(WSOpcodes.LOAD_GROUP + ' ' + Math.abs(id))

        return JSON.parse(res)
    }
}