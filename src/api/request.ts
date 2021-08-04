import { default as http } from 'request'

export class HttpError extends Error {
    readonly code: number;

    readonly response: http.Response;

    constructor(code: number, response: http.Response, ...params: any[]) {
        super(...params)

        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, HttpError)
        }

        this.code = code
        this.message = `Bad HTTP status code: ${this.code}`
        this.response = response
    }
}

export class RestAPIError extends Error {
    readonly code: number;

    constructor(code: number, message: string) {
        super()

        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, RestAPIError)
        }

        this.code = code
        this.message = message
    }
}

export async function request(method: string, params: { [key: string]: any}) {
    return new Promise<any>(resolve => {
        http.post({
            url: `https://coin-without-bugs.vkforms.ru/merchant/${method}/`,
            json: params
        }, (err, response, body) => {
            if (err) throw new Error(err.toString())
            if (response.statusCode !== 200) throw new HttpError(response.statusCode, response)
            resolve(body)
        })
    })
}