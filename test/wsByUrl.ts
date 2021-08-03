import { VKCoinWebSocket } from '../src/'

const ws = new VKCoinWebSocket(
    //'https://coin-without-bugs.vkforms.ru/index.html?vk_access_token_settings=friends&vk_app_id=6915965&vk_are_notifications_enabled=1&vk_is_app_user=1&vk_is_favorite=1&vk_language=ru&vk_platform=&vk_ref=other&vk_user_id=290331922&sign='
)
eval('global.ws = ws')

ws.on('connect', () => {
    console.log('ws connect')
})

ws.on('init', (data) => {
    console.log('init')
})

ws.on('ALREADY_CONNECTED', () => {
    console.log('already connected')
})

ws.on('BROKEN', () => {
    console.log('broken')
})

ws.start().then((data) => {
    console.log('start success')
})

