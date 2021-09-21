import { RestAPIError, request } from "./request";

/**
 * @description Получает балансы пользователей
 * @param {number[]} userIds Массив с айди пользователей
 * @returns Объект с балансами пользователей
 */
export async function getUsersBalance(userIds: number[]): Promise<{ [vk_id: number]: number | null }> {
    const response = await request('score', {
        merchantId: 1,
        key: '.',
        userIds: userIds
    })

    if (response.error) throw new RestAPIError(response.error.code, response.error.message)

    const users: { [vk_id: number]: number | null } = {}

    for (const user in response.response) {
        users[+user] = response.response[user]
    }

    return users
}

/**
 * @description Получает баланс одного пользователя
 * @param {number} userId Айди пользователей
 * @returns Текущий баланс пользователя
 */
export async function getUserBalance(userId: number): Promise<number | null> {
    return (await getUsersBalance([userId]))[userId]
}

function dec2hex(number: number): string {
    if (number < 0) {
        number = 0xFFFFFFFF + number + 1
    }

    return number.toString(16)
}

/**
 * @description Генерация ссылки на оплату
 * @param {Object} params Объект с параметрами
 * @returns Ссылка на оплату
 */
export function getLink(params: {
    userId: number,
    amount: number,
    payload: number,
    fixed?: boolean,
    hex?: boolean,
    hash?: boolean
}) {
    return (params.hash ? '' : 'https://vk.com/coin#') +
        `${params.hex ? 'm' : 'x'}` +
        `${params.hex ? dec2hex(params.userId) : params.userId}_`+
        `${params.hex ? dec2hex(params.amount) : params.amount}_`+
        `${params.hex ? dec2hex(params.payload) : params.payload}` +
        `${params.fixed ? '' : '_1'}`
}

/**
 * @description Форматирует число коинов в более читабельный для человека вид
 * @param {number} coins Число коинов
 * @param {boolean} fixed Нужно ли обязательно оставлять 3 знака после запятой?
 * @returns Отформатированное число
 */
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