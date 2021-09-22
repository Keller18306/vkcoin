import { RestAPIError, request } from './request'
import * as Types from './types'
import { getLink } from './noAuth'

type classParams = {
    userId: number,
    key: string
}

export interface VKCoinAPI {
    call(method: 'score', params: Types.MethodScoreParams): Promise<Types.MethodScoreResponse>
    call(method: 'tx', params: Types.MethodTXParams): Promise<Types.MethodTXResponse>
    call(method: 'send', params: Types.MethodSendParams): Promise<Types.MethodSendResponse>
    call(method: 'set', params: Types.MethodSetStatusParams): Promise<Types.MethodSetStatusResponse>
    call(method: 'set', params: Types.MethodSetNameParams): Promise<Types.MethodSetNameResponse>
    call(method: 'set', params: Types.MethodSetCallbackParams): Promise<Types.MethodSetCallbackResponse>
}

export class VKCoinAPI {
    public key: string;

    public userId: number;

    constructor(params: classParams) {
        this.key = params.key
        this.userId = params.userId
    }


    /**
     * @description "Голый" вызов методов API
     * @param method Метод
     * @param params Параметры к методу
     * @returns Ответ от API
     */
    async call(method: string, params: { [key: string]: any }) {
        const response = await request(method, {
            merchantId: this.userId,
            key: this.key,
            ...params
        })

        if (response.error) throw new RestAPIError(response.error.code, response.error.message)

        return response.response
    }

    /**
     * @description Получает балансы пользователей
     * @param userIds Массив с айди пользователей
     * @returns Объект с балансами пользователей
     */
    async getUsersBalance(userIds: number[]): Promise<{ [vk_id: number]: number | null }> {
        const response = await this.call('score', {
            userIds: userIds
        })

        const users: { [vk_id: number]: number | null } = {}

        for (const user in response) {
            users[+user] = response[user]
        }

        return users
    }

    /**
     * @description Получает баланс одного пользователя
     * @param userId Айди пользователей
     * @returns Текущий баланс пользователя
     */
    async getUserBalance(userId: number): Promise<number | null> {
        return (await this.getUsersBalance([userId]))[userId]
    }

    /**
     * @description Получает баланс текущего аккаунта
     * @returns Текущий баланс этого аккаунта
     */
    async getMyBalance(): Promise<number | null> {
        return this.getUserBalance(this.userId)
    }

    /**
     * @description Получает транзакции на текущий аккаунт
     * @param tx Тип транзакции или айди транзакций
     * (1 - для транзакций по ссылкам,
     * 2 - для транзакций на текущий аккаунта,
     * остальное для выборкий транзакций по их id)
     * @returns Массив с транзакциями
     */
    async getTransactions(tx: 1 | 2 | number | number[]): Promise<Types.MethodTXResponse> {
        if (!Array.isArray(tx)) tx = [tx]
        return this.call('tx', {
            tx: tx
        })
    }

    /**
     * @description Отправляет коины другому пользователю
     * @param toId Айди пользователя
     * @param amount Сумма, которую следует отправить (целое число)
     * @param fromShop Отправить от имени магазина?
     * @returns Объект с информацией о транзакции
     */
    async sendCoins(toId: number, amount: number, fromShop: boolean = false): Promise<Types.MethodSendResponse> {
        return this.call('send', {
            toId: toId,
            amount: amount,
            markAsMerchant: fromShop
        })
    }

    /**
     * @description Получает транзакции на текущий аккаунт (обычные переводы)
     * @returns Массив с транзакциями
     */
    async getTransactionsFromAccount(): Promise<Types.MethodTXResponse> {
        return this.getTransactions(2)
    }

    /**
     * @description Получает транзакции на текущий аккаунт (переводы по ссылкам)
     * @returns Массив с транзакциями
    */
    async getTransactionsFromLinks(): Promise<Types.MethodTXResponse> {
        return this.getTransactions(1)
    }

    /**
     * @description Получает транзакцию на текущий аккаунт по айди транзакции
     * @param id Айди транзакции
     * @returns Массив с транзакциями
    */
    async getTranscationById(id: number): Promise<Types.MethodTXResponse> {
        return this.getTransactions(id)
    }

    /**
     * @description Получает транзакции на текущий аккаунт по айди транзакций
     * @param ids Массив с айди транзакций
     * @returns Массив с транзакциями
    */
    async getTranscationsById(ids: number[]): Promise<Types.MethodTXResponse> {
        return this.getTransactions(ids)
    }

    /**
     * @description Устанавливает имя магазина
     * @param name Имя магазина
     * @returns Результат выполнения
    */
    async setShopName(name: string): Promise<Types.MethodSetNameResponse> {
        return this.call('set', {
            name: name
        })
    }

    /**
     * @description Устанавливает callback URL
     * @param url URL, куда будут приходить уведомления
     * @returns Результат выполнения
    */
    async setCallback(url: string | null): Promise<Types.MethodSetCallbackResponse> {
        return this.call('set', {
            callback: url
        })
    }

    /**
     * @description Удаляет callback URL
     * @returns Результат выполнения
    */
    async removeCallback(): Promise<Types.MethodSetCallbackResponse> {
        return this.setCallback(null)
    }

    /**
     * @description Получает логи от callback
     * @returns Массив со строками
    */
    async getCallbackLogs(): Promise<Types.MethodSetStatusResponse> {
        return this.call('set', {
            status: 1
        })
    }

    /**
     * @description Генерация ссылки на оплату
     * @param {Object} params Объект с параметрами
     * @returns Ссылка на оплату
     */
    getLink(params: {
        userId?: number;
        amount: number;
        payload: number;
        fixed?: boolean;
        hex?: boolean;
        hash?: boolean;
    }) {
        return getLink({
            userId: this.userId,
            fixed: true,
            ...params
        })
    }
}