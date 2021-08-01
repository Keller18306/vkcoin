export type AuthParams = {
    merchantId: number,
    key: string,
}

export type MethodTXParams = {
    tx: [1] | [2]
}

export type MethodSendParams = {
    toId: number
    amount: number
}

export type MethodScoreParams = {
    userIds: number[]
}

export type MethodSetCallbackParams = {
    callback: string | null
}

export type MethodSetStatusParams = {
    status: 1
}

export type MethodSetNameParams = {
    name: string
}