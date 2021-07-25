export type TransferItem = {
    id: number,
    from_id: number,
    to_id: number,
    amount: string,
    type: number,
    payload: number,
    external_id: number,
    created_at: number
}

export type MethodTXResponse = TransferItem[]

export type MethodSendResponse = {
    id: number,
    amount: number,
    current: number
}

export type MethodScoreResponse = {
    [vk_id: string]: number
}

export type MethodSetCallbackResponse = 'ON' | 'OFF'

export type MethodSetStatusResponse = string[]

export type MethodSetNameResponse = 1