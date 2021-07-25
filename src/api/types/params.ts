type Auth = {
    merchantId: number,
    key: string,
}

export type MethodTXParams = {
    tx: [1] | [2]
} & Auth

export type MethodSendParams = {
    toId: number
    amount: number
} & Auth

export type MethodScoreParams = {
    userIds: number[]
} & Auth

export type MethodSetParams = (
    {
    callback: string | null
} | {
    status: 1
} | {
    name: string
}) & Auth