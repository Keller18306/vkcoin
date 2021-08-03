import { APIError, request } from './request'
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

    async call(method: string, params: { [key: string]: any }) {
        const response = await request(method, {
            merchantId: this.userId,
            key: this.key,
            ...params
        })

        if (response.error) throw new APIError(response.error.code, response.error.message)

        return response.response
    }

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

    async getUserBalance(userId: number): Promise<number | null> {
        return (await this.getUsersBalance([userId]))[userId]
    }

    async getMyBalance(): Promise<number | null> {
        return this.getUserBalance(this.userId)
    }

    async getTransactions(tx: 1 | 2 | number | number[]): Promise<Types.MethodTXResponse> {
        if(!Array.isArray(tx)) tx = [tx]
        return this.call('tx', {
            tx: tx
        })
    }

    async sendCoins(toId: number, amount: number, fromShop: boolean = false): Promise<Types.MethodSendResponse> {
        return this.call('send', {
            toId: toId,
            amount: amount,
            markAsMerchant: fromShop
        })
    }

    async getTransactionsFromAccount(): Promise<Types.MethodTXResponse> {
        return this.getTransactions(2)
    }

    async getTransactionsFromLinks(): Promise<Types.MethodTXResponse> {
        return this.getTransactions(1)
    }

    async getTranscationById(id: number): Promise<Types.MethodTXResponse> {
        return this.getTransactions(id)
    }

    async getTranscationsById(ids: number[]): Promise<Types.MethodTXResponse> {
        return this.getTransactions(ids)
    }

    async setShopName(name: string): Promise<Types.MethodSetNameResponse> {
        return this.call('set', {
            name: name
        })
    }

    async setCallback(url: string | null): Promise<Types.MethodSetCallbackResponse> {
        return this.call('set', {
            callback: url
        })
    }

    async removeCallback(): Promise<Types.MethodSetCallbackResponse> {
        return this.setCallback(null)
    }

    async getCallbackLogs(): Promise<Types.MethodSetStatusResponse> {
        return this.call('set', {
            status: 1
        })
    }

    getLink(amount: number, payload: number, fixed: boolean = true) {
        return getLink(this.userId, amount, payload, fixed)
    }
}