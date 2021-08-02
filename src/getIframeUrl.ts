import request from "request"
import { HttpError } from "./api/request"

export async function getIframeUrl(access_token: string): Promise<string> {
    const response = new Promise((resolve) => {
        request.post('https://api.vk.com/method/apps.get', {
            formData: {
                access_token: access_token,
                v: '5.131',
                app_id: 6915965,
                platform: 'android'
            }
        }, (err, response, body) => {
            if (err) throw new Error(err.toString())
            if (response.statusCode !== 200) throw new HttpError(response.statusCode, response)
            resolve(JSON.parse(body))
        })
    }) as any

    if(response.error) throw new Error(response.error.error_msg)

    return response[0]?.mobile_iframe_url || response[0]?.webview_url || ''
}