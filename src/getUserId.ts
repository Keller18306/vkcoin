import request from "request"
import { HttpError } from "./api/request"

export async function getUserId(access_token: string): Promise<number> {
    const response = new Promise((resolve) => {
        request.post('https://api.vk.com/method/users.get', {
            formData: {
                access_token: access_token,
                v: '5.131'
            }
        }, (err, response, body) => {
            if (err) throw new Error(err.toString())
            if (response.statusCode !== 200) throw new HttpError(response.statusCode, response)
            resolve(JSON.parse(body))
        })
    }) as any

    if(response.error) throw new Error(response.error.error_msg)

    return response[0].id
}