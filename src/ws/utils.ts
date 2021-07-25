import { parse as parseURL } from 'url'
import { parse as parseQuery } from 'querystring'

export function isJSON(value: any): boolean {
    let isJSON: boolean = true;

    try {
        JSON.parse(value);
    } catch (error) {
        isJSON = false;
    }

    return isJSON;
}

function getPass(a: number, b: number) {
    return a + b - 1
}

export function formatURL(inputURL: string) {
    const info = parseURL(inputURL)
    if (info.query == null) throw new Error('Cannot parse query from URL')
    if (info.protocol == null) throw new Error('Cannot parse protocol from URL')

    const userId = Number(parseQuery(info.query).vk_user_id)

    const link = info.protocol
        .replace('https:', 'wss:')
        .replace('http:', 'ws:') +
        `//${info.host}/channel/`
        
    const urlws = `${link}${userId % 32}/${info.search}&ver=1&upd=1&pass=${getPass(userId, 0)}`

    return urlws
}

export async function timePromise(func: (resolve: (value: unknown) => void, reject: (reason?: any) => void) => void, time: number) {
    return new Promise((resolve, reject) => {
        new Promise(func).then(resolve, reject)
        setTimeout(()=> {
            reject(new Error(`Promise timed out after ${time} ms`))
        }, time)
    })
}