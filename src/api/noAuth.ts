import { APIError, request } from "./request";

export async function getUsersBalance(userIds: number[]): Promise<{ [vk_id: number]: number | null }> {
    const response = await request('score', {
        merchantId: 1,
        key: '.',
        userIds: userIds
    })

    if (response.error) throw new APIError(response.error.code, response.error.message)

    const users: { [vk_id: number]: number | null } = {}

    for (const user in response.response) {
        users[+user] = response.response[user]
    }

    return users
}

export async function getUserBalance(userId: number): Promise<number | null> {
    return (await getUsersBalance([userId]))[userId]
}

export function getLink(userId: number, amount: number, payload: number, fixed: boolean = true) {
    return `https://vk.com/coin#x${userId}_${amount}_${payload}${fixed ? '' : '_1'}`
}

export function formatCoins(coins: number, fixed: boolean = false) {
    return (coins / 1e3)
        .toLocaleString('en-EN', {
            style: 'decimal',
            ...fixed ? {
                minimumFractionDigits: 3,
                maximumFractionDigits: 3
            } : {}
        })
        .replace(/,/g, ' ')
        .replace(/\./g, ',')
}